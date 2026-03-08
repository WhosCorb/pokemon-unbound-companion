/**
 * Client-side GBA save file parser for Pokemon Unbound (CFRU).
 *
 * Reads a 128KB .sav / .srm file and extracts:
 * - Player info (name, gender, trainer ID, playtime)
 * - Party Pokemon (6 slots, CFRU unencrypted format)
 * - PC box Pokemon (sections 5-13, Gen3 encrypted+shuffled format)
 * - Caught species list (derived from party + PC)
 * - Badge flags for progress heuristics
 *
 * The CFRU build does NOT encrypt party sub-structure data, so Pokemon fields
 * are at fixed offsets within each 100-byte party slot. PC Pokemon use the
 * standard Gen3 encrypted/shuffled 80-byte format.
 */

import { decodeGen3String } from "./save-data/characters";
import { SPECIES } from "./save-data/species";
import { MOVES } from "./save-data/moves";
import { ITEMS } from "./save-data/items";

const VALID_SIGNATURES = new Set([0x08012025, 0x01121998]);
const SECTION_SIZE = 0x1000; // 4096 bytes per section
const SECTION_COUNT = 14;
const BLOCK_SIZE = SECTION_SIZE * SECTION_COUNT; // 57344 bytes per save block

// CFRU uses 0xFF4 bytes of data per section (everything up to the 12-byte footer).
// Sections 0, 4, 13 use CFRU-modified formats with different checksum ranges --
// mismatches on these are expected and non-fatal.
const CFRU_SECTION_DATA_SIZE = 0xFF4; // 4084 bytes

const NATURE_NAMES = [
  "Hardy", "Lonely", "Brave", "Adamant", "Naughty",
  "Bold", "Docile", "Relaxed", "Impish", "Lax",
  "Timid", "Hasty", "Serious", "Jolly", "Naive",
  "Modest", "Mild", "Quiet", "Bashful", "Rash",
  "Calm", "Gentle", "Sassy", "Careful", "Quirky",
] as const;

// Gen3 substructure shuffle orders indexed by PID % 24
// Each entry is [Growth, Attacks, EVs/Condition, Misc] mapped to data block positions
const SHUFFLE_ORDER: readonly [number, number, number, number][] = [
  [0, 1, 2, 3], [0, 1, 3, 2], [0, 2, 1, 3], [0, 3, 1, 2],
  [0, 2, 3, 1], [0, 3, 2, 1], [1, 0, 2, 3], [1, 0, 3, 2],
  [2, 0, 1, 3], [3, 0, 1, 2], [2, 0, 3, 1], [3, 0, 2, 1],
  [1, 2, 0, 3], [1, 3, 0, 2], [2, 1, 0, 3], [3, 1, 0, 2],
  [2, 3, 0, 1], [3, 2, 0, 1], [1, 2, 3, 0], [1, 3, 2, 0],
  [2, 1, 3, 0], [3, 1, 2, 0], [2, 3, 1, 0], [3, 2, 1, 0],
];

// ── Public types ────────────────────────────────────────

export interface SavePlayerInfo {
  name: string;
  gender: "male" | "female";
  trainerId: number;
  secretId: number;
  playTime: { hours: number; minutes: number; seconds: number };
  badgeFlags: number;
}

export interface SavePokemon {
  species: { id: number; name: string };
  nickname: string;
  otName: string;
  level: number;
  nature: (typeof NATURE_NAMES)[number];
  heldItem: { id: number; name: string } | null;
  moves: { id: number; name: string; pp: number }[];
  evs: { hp: number; atk: number; def: number; spd: number; spAtk: number; spDef: number };
  ivs: { hp: number; atk: number; def: number; spd: number; spAtk: number; spDef: number };
  friendship: number;
  isEgg: boolean;
  hasHiddenAbility: boolean;
  pid: number;
  currentHp: number;
  maxHp: number;
  stats: { atk: number; def: number; spd: number; spAtk: number; spDef: number };
}

export interface PcBoxData {
  name: string;
  pokemon: (SavePokemon | null)[]; // 30 slots per box
}

export interface ParsedSave {
  player: SavePlayerInfo;
  party: SavePokemon[];
  partyCount: number;
  pc: PcBoxData[];
  caughtSpeciesIds: string[];
  warnings: string[];
}

export class SaveParseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SaveParseError";
  }
}

// ── Helpers ─────────────────────────────────────────────

function u8(dv: DataView, offset: number): number {
  return dv.getUint8(offset);
}

function u16(dv: DataView, offset: number): number {
  return dv.getUint16(offset, true);
}

function u32(dv: DataView, offset: number): number {
  return dv.getUint32(offset, true);
}

function getBytes(buf: ArrayBuffer, offset: number, length: number): Uint8Array {
  return new Uint8Array(buf, offset, length);
}

// ── Section checksum ────────────────────────────────────

function computeSectionChecksum(buf: ArrayBuffer, sectionOffset: number, _sectionId: number): number {
  const dataSize = CFRU_SECTION_DATA_SIZE;
  const dv = new DataView(buf, sectionOffset, dataSize);
  let checksum = 0;
  for (let i = 0; i < dataSize; i += 4) {
    checksum = (checksum + dv.getUint32(i, true)) >>> 0;
  }
  return ((checksum & 0xFFFF) + (checksum >>> 16)) & 0xFFFF;
}

// ── Section map builder ─────────────────────────────────

interface SectionInfo {
  offset: number;
  sectionId: number;
  checksum: number;
  signature: number;
  saveIndex: number;
}

function readBlockSections(buf: ArrayBuffer, blockStart: number): SectionInfo[] {
  const dv = new DataView(buf);
  const sections: SectionInfo[] = [];
  for (let i = 0; i < SECTION_COUNT; i++) {
    const secStart = blockStart + i * SECTION_SIZE;
    const footerBase = secStart + 0xFF4;
    sections.push({
      offset: secStart,
      sectionId: u16(dv, footerBase + 0),
      checksum: u16(dv, footerBase + 2),
      signature: u32(dv, footerBase + 4),
      saveIndex: u32(dv, footerBase + 8),
    });
  }
  return sections;
}

function validateBlock(
  buf: ArrayBuffer,
  sections: SectionInfo[],
  warnings: string[],
  blockLabel: string,
): boolean {
  let valid = true;
  for (const sec of sections) {
    if (!VALID_SIGNATURES.has(sec.signature)) {
      warnings.push(`${blockLabel} section ${sec.sectionId}: unknown signature 0x${sec.signature.toString(16)}`);
      valid = false;
    }
    const computed = computeSectionChecksum(buf, sec.offset, sec.sectionId);
    if (computed !== sec.checksum) {
      warnings.push(
        `${blockLabel} section ${sec.sectionId}: checksum mismatch (stored=0x${sec.checksum.toString(16)}, computed=0x${computed.toString(16)})`
      );
      valid = false;
    }
  }
  return valid;
}

function buildSectionMap(buf: ArrayBuffer, warnings: string[]): Map<number, SectionInfo> {
  const blockAStart = 0;
  const blockBStart = BLOCK_SIZE;

  const sectionsA = readBlockSections(buf, blockAStart);
  const sectionsB = readBlockSections(buf, blockBStart);

  const indexA = sectionsA[0]?.saveIndex ?? 0;
  const indexB = sectionsB[0]?.saveIndex ?? 0;

  // Prefer the block with the higher save index
  const primarySections = indexA >= indexB ? sectionsA : sectionsB;
  const fallbackSections = indexA >= indexB ? sectionsB : sectionsA;
  const primaryLabel = indexA >= indexB ? "Block A" : "Block B";
  const fallbackLabel = indexA >= indexB ? "Block B" : "Block A";

  const primaryValid = validateBlock(buf, primarySections, warnings, primaryLabel);

  let active: SectionInfo[];
  if (primaryValid) {
    active = primarySections;
  } else {
    warnings.push(`${primaryLabel} has errors, trying ${fallbackLabel} as fallback`);
    const fallbackValid = validateBlock(buf, fallbackSections, warnings, fallbackLabel);
    if (fallbackValid) {
      active = fallbackSections;
    } else {
      warnings.push("Both save blocks have errors, using primary block anyway");
      active = primarySections;
    }
  }

  const map = new Map<number, SectionInfo>();
  for (const sec of active) {
    map.set(sec.sectionId, sec);
  }
  return map;
}

function getSectionData(buf: ArrayBuffer, sectionMap: Map<number, SectionInfo>, sectionId: number): DataView {
  const info = sectionMap.get(sectionId);
  if (!info) throw new SaveParseError(`Section ${sectionId} not found in save`);
  return new DataView(buf, info.offset, SECTION_SIZE);
}

// ── Player info parser (Section 0) ─────────────────────

function parsePlayerInfo(buf: ArrayBuffer, sectionMap: Map<number, SectionInfo>): SavePlayerInfo {
  const sec0 = sectionMap.get(0);
  if (!sec0) throw new SaveParseError("Section 0 (Trainer Info) not found");

  const nameBytes = getBytes(buf, sec0.offset, 7);
  const name = decodeGen3String(nameBytes, 7);

  const dv = new DataView(buf, sec0.offset, SECTION_SIZE);
  const genderByte = u8(dv, 0x08);
  const gender: "male" | "female" = (genderByte & 1) === 0 ? "male" : "female";
  const trainerId = u16(dv, 0x0A);
  const secretId = u16(dv, 0x0C);
  const hours = u16(dv, 0x0E);
  const minutes = u8(dv, 0x10);
  const seconds = u8(dv, 0x11);
  const badgeFlags = u16(dv, 0x1D);

  return {
    name,
    gender,
    trainerId,
    secretId,
    playTime: { hours, minutes, seconds },
    badgeFlags,
  };
}

// ── Party Pokemon parser (Section 1) ───────────────────

const PARTY_OFFSET = 0x38;
const PARTY_COUNT_OFFSET = 0x34;
const PARTY_MON_SIZE = 100;

function parsePartyPokemon(dv: DataView, offset: number): SavePokemon {
  const pid = u32(dv, offset + 0x00);
  const nature = NATURE_NAMES[pid % 25];

  const speciesId = u16(dv, offset + 0x20);
  const speciesName = SPECIES.get(speciesId) ?? `Unknown (${speciesId})`;

  const heldItemId = u16(dv, offset + 0x22);
  const heldItem = heldItemId > 0
    ? { id: heldItemId, name: ITEMS.get(heldItemId) ?? `Unknown (${heldItemId})` }
    : null;

  const friendship = u8(dv, offset + 0x29);

  const moves: SavePokemon["moves"] = [];
  for (let i = 0; i < 4; i++) {
    const moveId = u16(dv, offset + 0x2C + i * 2);
    if (moveId > 0) {
      moves.push({
        id: moveId,
        name: MOVES.get(moveId) ?? `Unknown (${moveId})`,
        pp: u8(dv, offset + 0x34 + i),
      });
    }
  }

  const evHp = u8(dv, offset + 0x38);
  const evAtk = u8(dv, offset + 0x39);
  const evDef = u8(dv, offset + 0x3A);
  const evSpd = u8(dv, offset + 0x3B);
  const evSpAtk = u8(dv, offset + 0x3C);
  const evSpDef = u8(dv, offset + 0x3D);

  const ivWord = u32(dv, offset + 0x48);
  const ivHp = ivWord & 0x1F;
  const ivAtk = (ivWord >> 5) & 0x1F;
  const ivDef = (ivWord >> 10) & 0x1F;
  const ivSpd = (ivWord >> 15) & 0x1F;
  const ivSpAtk = (ivWord >> 20) & 0x1F;
  const ivSpDef = (ivWord >> 25) & 0x1F;
  const isEgg = !!(ivWord & (1 << 30));
  const hasHiddenAbility = !!(ivWord & (1 << 31));

  const level = u8(dv, offset + 0x54);
  const currentHp = u16(dv, offset + 0x56);
  const maxHp = u16(dv, offset + 0x58);
  const statAtk = u16(dv, offset + 0x5A);
  const statDef = u16(dv, offset + 0x5C);
  const statSpd = u16(dv, offset + 0x5E);
  const statSpAtk = u16(dv, offset + 0x60);
  const statSpDef = u16(dv, offset + 0x62);

  const nickBytes = new Uint8Array(dv.buffer, dv.byteOffset + offset + 0x08, 10);
  const nickname = decodeGen3String(nickBytes, 10);

  const otBytes = new Uint8Array(dv.buffer, dv.byteOffset + offset + 0x14, 7);
  const otName = decodeGen3String(otBytes, 7);

  return {
    species: { id: speciesId, name: speciesName },
    nickname,
    otName,
    level,
    nature,
    heldItem,
    moves,
    evs: { hp: evHp, atk: evAtk, def: evDef, spd: evSpd, spAtk: evSpAtk, spDef: evSpDef },
    ivs: { hp: ivHp, atk: ivAtk, def: ivDef, spd: ivSpd, spAtk: ivSpAtk, spDef: ivSpDef },
    friendship,
    isEgg,
    hasHiddenAbility,
    pid,
    currentHp,
    maxHp,
    stats: { atk: statAtk, def: statDef, spd: statSpd, spAtk: statSpAtk, spDef: statSpDef },
  };
}

// ── PC Pokemon parser (Sections 5-13) ──────────────────

const PC_MON_SIZE = 80;
const PC_BOX_COUNT = 14;
const PC_BOX_SIZE = 30;

/**
 * Decrypt the 48-byte data block of a Gen3 PC Pokemon.
 * XOR each u32 with (PID ^ OT_ID), then de-shuffle based on PID % 24.
 */
function decryptPcSubstructures(
  buf: ArrayBuffer,
  dataOffset: number,
  pid: number,
  otId: number,
): { growth: DataView; attacks: DataView; evs: DataView; misc: DataView } {
  const key = (pid ^ otId) >>> 0;
  const encrypted = new Uint8Array(48);
  encrypted.set(new Uint8Array(buf, dataOffset, 48));

  // XOR decrypt
  const view = new DataView(encrypted.buffer);
  for (let i = 0; i < 48; i += 4) {
    const val = (view.getUint32(i, true) ^ key) >>> 0;
    view.setUint32(i, val, true);
  }

  // De-shuffle: SHUFFLE_ORDER[pid%24] tells us where each substructure ended up
  const order = SHUFFLE_ORDER[pid % 24];
  const substructs = new Array<DataView>(4);
  for (let canonical = 0; canonical < 4; canonical++) {
    const position = order[canonical];
    substructs[canonical] = new DataView(encrypted.buffer, position * 12, 12);
  }

  return {
    growth: substructs[0],
    attacks: substructs[1],
    evs: substructs[2],
    misc: substructs[3],
  };
}

function parsePcPokemon(
  buf: ArrayBuffer,
  baseOffset: number,
  warnings: string[],
): SavePokemon | null {
  const dv = new DataView(buf, baseOffset, PC_MON_SIZE);

  const pid = u32(dv, 0x00);
  const otId = u32(dv, 0x04);

  // Empty slot check
  if (pid === 0 && otId === 0) return null;

  const nickBytes = new Uint8Array(buf, baseOffset + 0x08, 10);
  const nickname = decodeGen3String(nickBytes, 10);

  const otBytes = new Uint8Array(buf, baseOffset + 0x14, 7);
  const otName = decodeGen3String(otBytes, 7);

  try {
    const { growth, attacks, evs, misc } = decryptPcSubstructures(
      buf, baseOffset + 0x20, pid, otId,
    );

    // Growth substructure (12 bytes)
    const speciesId = growth.getUint16(0, true);
    const heldItemId = growth.getUint16(2, true);
    const experience = growth.getUint32(4, true);
    const friendship = growth.getUint8(9);

    // Validate species
    if (speciesId === 0 || speciesId > 2000) return null;
    const speciesName = SPECIES.get(speciesId) ?? `Unknown (${speciesId})`;

    const heldItem = heldItemId > 0
      ? { id: heldItemId, name: ITEMS.get(heldItemId) ?? `Unknown (${heldItemId})` }
      : null;

    // Attacks substructure (12 bytes): 4 moves (u16 each) + 4 PP (u8 each)
    const moves: SavePokemon["moves"] = [];
    for (let i = 0; i < 4; i++) {
      const moveId = attacks.getUint16(i * 2, true);
      if (moveId > 0) {
        moves.push({
          id: moveId,
          name: MOVES.get(moveId) ?? `Unknown (${moveId})`,
          pp: attacks.getUint8(8 + i),
        });
      }
    }

    // EVs substructure (12 bytes): HP/Atk/Def/Spd/SpAtk/SpDef
    const evHp = evs.getUint8(0);
    const evAtk = evs.getUint8(1);
    const evDef = evs.getUint8(2);
    const evSpd = evs.getUint8(3);
    const evSpAtk = evs.getUint8(4);
    const evSpDef = evs.getUint8(5);

    // Misc substructure: IVs at offset 4 (packed u32)
    const ivWord = misc.getUint32(4, true);
    const ivHp = ivWord & 0x1F;
    const ivAtk = (ivWord >> 5) & 0x1F;
    const ivDef = (ivWord >> 10) & 0x1F;
    const ivSpd = (ivWord >> 15) & 0x1F;
    const ivSpAtk = (ivWord >> 20) & 0x1F;
    const ivSpDef = (ivWord >> 25) & 0x1F;
    const isEgg = !!(ivWord & (1 << 30));
    const hasHiddenAbility = !!(ivWord & (1 << 31));

    const nature = NATURE_NAMES[pid % 25];

    // PC Pokemon don't have battle stats or level stored directly --
    // we estimate level from experience using a rough formula.
    // For display we'll use 0 for stats since they aren't stored in PC format.
    const level = estimateLevelFromExp(experience);

    return {
      species: { id: speciesId, name: speciesName },
      nickname,
      otName,
      level,
      nature,
      heldItem,
      moves,
      evs: { hp: evHp, atk: evAtk, def: evDef, spd: evSpd, spAtk: evSpAtk, spDef: evSpDef },
      ivs: { hp: ivHp, atk: ivAtk, def: ivDef, spd: ivSpd, spAtk: ivSpAtk, spDef: ivSpDef },
      friendship,
      isEgg,
      hasHiddenAbility,
      pid,
      currentHp: 0,
      maxHp: 0,
      stats: { atk: 0, def: 0, spd: 0, spAtk: 0, spDef: 0 },
    };
  } catch {
    warnings.push(`Failed to decrypt PC Pokemon at offset 0x${baseOffset.toString(16)}`);
    return null;
  }
}

/**
 * Rough level estimate from total experience.
 * Uses medium-fast growth rate as default (most common).
 * level = cbrt(experience) is a reasonable approximation.
 */
function estimateLevelFromExp(experience: number): number {
  if (experience <= 0) return 1;
  const level = Math.round(Math.cbrt(experience));
  return Math.max(1, Math.min(100, level));
}

/**
 * Parse all 14 PC boxes from sections 5-13.
 *
 * PC data layout across save sections:
 * - Section 5, offset 0x0004: start of Pokemon data (after 4-byte current box)
 * - Pokemon are 80 bytes each, 30 per box = 2400 bytes per box
 * - Total: 14 boxes x 30 x 80 = 33600 bytes spanning sections 5-13
 * - Box names are stored after all Pokemon data
 */
function parsePcBoxes(
  buf: ArrayBuffer,
  sectionMap: Map<number, SectionInfo>,
  warnings: string[],
): PcBoxData[] {
  // Collect all PC section data into a contiguous buffer
  // Sections 5-13 each contribute their data portion
  const pcSectionIds = [5, 6, 7, 8, 9, 10, 11, 12, 13];
  const pcDataParts: { offset: number; size: number }[] = [];

  for (const sid of pcSectionIds) {
    const info = sectionMap.get(sid);
    if (!info) {
      warnings.push(`PC section ${sid} missing, some boxes may be empty`);
      continue;
    }
    pcDataParts.push({
      offset: info.offset,
      size: CFRU_SECTION_DATA_SIZE,
    });
  }

  if (pcDataParts.length === 0) {
    warnings.push("No PC sections found");
    return [];
  }

  // Build a contiguous buffer from all PC sections
  const totalSize = pcDataParts.reduce((sum, p) => sum + p.size, 0);
  const pcBuf = new ArrayBuffer(totalSize);
  const pcArr = new Uint8Array(pcBuf);
  let writeOffset = 0;
  for (const part of pcDataParts) {
    pcArr.set(new Uint8Array(buf, part.offset, part.size), writeOffset);
    writeOffset += part.size;
  }

  // First 4 bytes: current box number
  const pcDv = new DataView(pcBuf);
  // const currentBox = u32(pcDv, 0);

  // Pokemon data starts at offset 4
  const pokemonDataStart = 4;
  const bytesPerBox = PC_BOX_SIZE * PC_MON_SIZE; // 30 * 80 = 2400

  // Box names start after all Pokemon data
  // 14 boxes * 2400 bytes = 33600 bytes + 4 byte header = 33604
  const boxNamesStart = pokemonDataStart + PC_BOX_COUNT * bytesPerBox;

  const boxes: PcBoxData[] = [];

  for (let boxIdx = 0; boxIdx < PC_BOX_COUNT; boxIdx++) {
    // Read box name (9 bytes per box name in Gen3)
    let boxName = `Box ${boxIdx + 1}`;
    const nameOffset = boxNamesStart + boxIdx * 9;
    if (nameOffset + 9 <= totalSize) {
      const nameBytes = new Uint8Array(pcBuf, nameOffset, 9);
      const decoded = decodeGen3String(nameBytes, 9);
      if (decoded.trim()) boxName = decoded;
    }

    const pokemon: (SavePokemon | null)[] = [];
    for (let slotIdx = 0; slotIdx < PC_BOX_SIZE; slotIdx++) {
      const monOffset = pokemonDataStart + boxIdx * bytesPerBox + slotIdx * PC_MON_SIZE;
      if (monOffset + PC_MON_SIZE <= totalSize) {
        const mon = parsePcPokemon(pcBuf, monOffset, warnings);
        pokemon.push(mon);
      } else {
        pokemon.push(null);
      }
    }

    boxes.push({ name: boxName, pokemon });
  }

  return boxes;
}

// ── Main parser ─────────────────────────────────────────

export function parseSaveFile(buffer: ArrayBuffer): ParsedSave {
  if (buffer.byteLength < 0x20000) {
    throw new SaveParseError(
      `File too small: ${buffer.byteLength} bytes (expected 128KB / 131072 bytes)`
    );
  }

  const warnings: string[] = [];
  const sectionMap = buildSectionMap(buffer, warnings);

  if (sectionMap.size === 0) {
    throw new SaveParseError("No valid sections found in save file");
  }

  const player = parsePlayerInfo(buffer, sectionMap);

  // Section 1 contains the party
  const sec1 = getSectionData(buffer, sectionMap, 1);
  const partyCount = Math.min(u32(sec1, PARTY_COUNT_OFFSET), 6);

  const party: SavePokemon[] = [];
  for (let i = 0; i < partyCount; i++) {
    try {
      const mon = parsePartyPokemon(sec1, PARTY_OFFSET + i * PARTY_MON_SIZE);
      if (mon.species.id > 0) {
        party.push(mon);
      }
    } catch {
      warnings.push(`Failed to parse party Pokemon at slot ${i}`);
    }
  }

  // Parse PC boxes
  let pc: PcBoxData[] = [];
  try {
    pc = parsePcBoxes(buffer, sectionMap, warnings);
  } catch {
    warnings.push("Failed to parse PC boxes");
  }

  // Derive caught species from party + PC
  const caughtSpeciesIds = deriveCaughtSpecies(party, pc);

  return { player, party, partyCount, pc, caughtSpeciesIds, warnings };
}

// ── Caught species derivation ───────────────────────────

function deriveCaughtSpecies(party: SavePokemon[], pc: PcBoxData[]): string[] {
  const seen = new Set<string>();
  for (const mon of party) {
    if (!mon.isEgg) {
      const appId = speciesNameToAppId(mon.species.name);
      seen.add(appId);
    }
  }
  for (const box of pc) {
    for (const mon of box.pokemon) {
      if (mon && !mon.isEgg) {
        const appId = speciesNameToAppId(mon.species.name);
        seen.add(appId);
      }
    }
  }
  return [...seen];
}

// ── Species name -> app ID mapping ──────────────────────

// Static mapping for known edge cases that don't follow simple patterns
const SPECIES_OVERRIDES: Record<string, string> = {
  // Multi-word names that need specific hyphenation
  "NIDORAN_F": "nidoran-f",
  "NIDORAN_M": "nidoran-m",
  "MR_MIME": "mr-mime",
  "MR_RIME": "mr-rime",
  "MIME_JR": "mime-jr",
  "HO_OH": "ho-oh",
  "PORYGON_Z": "porygon-z",
  "JANGMO_O": "jangmo-o",
  "HAKAMO_O": "hakamo-o",
  "KOMMO_O": "kommo-o",
  "TAPU_KOKO": "tapu-koko",
  "TAPU_LELE": "tapu-lele",
  "TAPU_BULU": "tapu-bulu",
  "TAPU_FINI": "tapu-fini",
  "TYPE_NULL": "type-null",
  "FARFETCHD": "farfetchd",
  "SIRFETCHD": "sirfetchd",
  "MR_MIME_G": "galarian-mr-mime",
  "MIME_JR_G": "galarian-mime-jr",

  // Unique alternate forms
  "DARMANITANZEN": "darmanitan-zen",
  "DARMANITAN_G_ZEN": "galarian-darmanitan-zen",
  "ASHGRENINJA": "ash-greninja",
  "SHADOW_WARRIOR": "shadow-warrior",

  // Primal reversions
  "GROUDON_PRIMAL": "primal-groudon",
  "KYOGRE_PRIMAL": "primal-kyogre",
  "DIALGA_PRIMAL": "primal-dialga",
  "PALKIA_PRIMAL": "primal-palkia",

  // Specific legendary/mythical forms
  "HOOPA_UNBOUND": "hoopa-unbound",
  "GIRATINA_ORIGIN": "giratina-origin",
  "SHAYMIN_SKY": "shaymin-sky",
  "MELOETTA_PIROUETTE": "meloetta-pirouette",
  "KYUREM_BLACK": "kyurem-black",
  "KYUREM_WHITE": "kyurem-white",
  "KELDEO_RESOLUTE": "keldeo-resolute",
  "TORNADUS_THERIAN": "tornadus-therian",
  "THUNDURUS_THERIAN": "thundurus-therian",
  "LANDORUS_THERIAN": "landorus-therian",
  "DEOXYS_ATTACK": "deoxys-attack",
  "DEOXYS_DEFENSE": "deoxys-defense",
  "DEOXYS_SPEED": "deoxys-speed",
  "NECROZMA_DUSK_MANE": "necrozma-dusk-mane",
  "NECROZMA_DAWN_WINGS": "necrozma-dawn-wings",
  "NECROZMA_ULTRA": "necrozma-ultra",
  "CALYREX_ICE_RIDER": "calyrex-ice-rider",
  "CALYREX_SHADOW_RIDER": "calyrex-shadow-rider",
  "ZACIAN_CROWNED": "zacian-crowned",
  "ZAMAZENTA_CROWNED": "zamazenta-crowned",
  "ETERNATUS_ETERNAMAX": "eternatus-eternamax",
  "URSHIFU_SINGLE": "urshifu-single-strike",
  "URSHIFU_RAPID": "urshifu-rapid-strike",
  "ZARUDE_DADA": "zarude-dada",

  // Rotom forms
  "ROTOM_HEAT": "rotom-heat",
  "ROTOM_WASH": "rotom-wash",
  "ROTOM_FROST": "rotom-frost",
  "ROTOM_FAN": "rotom-fan",
  "ROTOM_MOW": "rotom-mow",

  // Wormadam/Burmy forms
  "WORMADAM_SANDY": "wormadam-sandy",
  "WORMADAM_TRASH": "wormadam-trash",
  "BURMY_SANDY": "burmy-sandy",
  "BURMY_TRASH": "burmy-trash",

  // Shellos/Gastrodon
  "SHELLOS_EAST": "shellos-east",
  "GASTRODON_EAST": "gastrodon-east",

  // Basculin
  "BASCULIN_RED": "basculin-red-striped",
  "BASCULIN_BLUE": "basculin-blue-striped",

  // Lycanroc forms
  "LYCANROC_N": "lycanroc-midnight",
  "LYCANROC_DUSK": "lycanroc-dusk",

  // Oricorio forms
  "ORICORIO_Y": "oricorio-pom-pom",
  "ORICORIO_P": "oricorio-pau",
  "ORICORIO_S": "oricorio-sensu",

  // Wishiwashi
  "WISHIWASHI_S": "wishiwashi-school",

  // Zygarde forms
  "ZYGARDE_10": "zygarde-10",
  "ZYGARDE_COMPLETE": "zygarde-complete",
  "ZYGARDE_CELL": "zygarde-cell",
  "ZYGARDE_CORE": "zygarde-core",

  // Aegislash
  "AEGISLASH_BLADE": "aegislash-blade",

  // Meowstic/Pyroar gender
  "MEOWSTIC_FEMALE": "meowstic-female",
  "PYROAR_FEMALE": "pyroar-female",

  // Toxtricity
  "TOXTRICITY_LOW_KEY": "toxtricity-low-key",

  // Indeedee
  "INDEEDEE_FEMALE": "indeedee-female",

  // Cramorant
  "CRAMORANT_GULPING": "cramorant-gulping",
  "CRAMORANT_GORGING": "cramorant-gorging",

  // Morpeko
  "MORPEKO_HANGRY": "morpeko-hangry",

  // Eiscue
  "EISCUE_NOICE": "eiscue-noice",

  // Mimikyu
  "MIMIKYU_BUSTED": "mimikyu-busted",

  // Xerneas
  "XERNEAS_NATURAL": "xerneas-neutral",

  // Pichu
  "PICHU_SPIKY": "pichu-spiky-eared",

  // Magearna
  "MAGEARNA_P": "magearna-original",

  // Minior (shield is base, colors map to base)
  "MINIOR_SHIELD": "minior",

  // Cherrim
  "CHERRIM_SUN": "cherrim-sunshine",

  // Floette eternal
  "FLOETTE_ETERNAL": "floette-eternal",

  // Gender variants that map to base
  "UNFEZANT_F": "unfezant",
  "FRILLISH_F": "frillish",
  "JELLICENT_F": "jellicent",
  "HIPPOPOTAS_F": "hippopotas",
  "HIPPOWDON_F": "hippowdon",

  // Alcremie (first form is base)
  "ALCREMIE_STRAWBERRY": "alcremie",
};

/**
 * Convert a CT species name (e.g., "LARVITAR", "MR_MIME", "CHARIZARD_MEGA_X")
 * to the app's pokemon ID format (e.g., "larvitar", "mr-mime", "mega-charizard-x").
 */
export function speciesNameToAppId(ctName: string): string {
  // Check static overrides first
  if (SPECIES_OVERRIDES[ctName]) return SPECIES_OVERRIDES[ctName];

  // Gigantamax forms -> map to base species (not relevant in Unbound gameplay)
  if (ctName.endsWith("_GIGA")) {
    const base = ctName.replace(/_GIGA$/, "").replace(/_LOW_KEY$/, "");
    return speciesNameToAppId(base);
  }

  // Mega forms: VENUSAUR_MEGA -> mega-venusaur, CHARIZARD_MEGA_X -> mega-charizard-x
  const megaMatch = ctName.match(/^(.+)_MEGA(?:_([XY]))?$/);
  if (megaMatch) {
    const base = megaMatch[1].toLowerCase().replace(/_/g, "-");
    const suffix = megaMatch[2] ? `-${megaMatch[2].toLowerCase()}` : "";
    return `mega-${base}${suffix}`;
  }

  // Regional suffixes: _A (Alolan), _G (Galarian), _H (Hisuian)
  const regionalMatch = ctName.match(/^(.+)_([AGH])$/);
  if (regionalMatch) {
    const prefixMap: Record<string, string> = { A: "alolan", G: "galarian", H: "hisuian" };
    const prefix = prefixMap[regionalMatch[2]];
    const base = regionalMatch[1];
    // Recursively resolve base in case it has overrides (e.g., MR_MIME_G)
    const baseId = speciesNameToAppId(base);
    return `${prefix}-${baseId}`;
  }

  // Type-based forms (Arceus, Silvally, Genesect drives) -> map to base
  const typeFormPrefixes = [
    "ARCEUS_", "SILVALLY_", "GENESECT_",
  ];
  for (const prefix of typeFormPrefixes) {
    if (ctName.startsWith(prefix)) {
      return prefix.replace(/_$/, "").toLowerCase();
    }
  }

  // Unown forms -> map to base "unown"
  if (ctName.startsWith("UNOWN_")) return "unown";

  // Vivillon patterns -> map to base "vivillon"
  if (ctName.startsWith("VIVILLON_")) return "vivillon";

  // Furfrou trims -> map to base "furfrou"
  if (ctName.startsWith("FURFROU_")) return "furfrou";

  // Minior colors -> map to base "minior"
  if (ctName.startsWith("MINIOR_")) return "minior";

  // Pikachu costume/cap forms -> map to base "pikachu"
  if (ctName.startsWith("PIKACHU_")) return "pikachu";

  // Flabebe/Floette/Florges colors -> map to base
  if (ctName.startsWith("FLABEBE_")) return "flabebe";
  if (ctName.startsWith("FLOETTE_")) return "floette";
  if (ctName.startsWith("FLORGES_")) return "florges";

  // Pumpkaboo/Gourgeist sizes -> map to base
  if (ctName.startsWith("PUMPKABOO_")) return "pumpkaboo";
  if (ctName.startsWith("GOURGEIST_")) return "gourgeist";

  // Alcremie decorations -> map to base
  if (ctName.startsWith("ALCREMIE_")) return "alcremie";

  // Deerling/Sawsbuck seasons -> map to base
  if (ctName.startsWith("DEERLING_")) return "deerling";
  if (ctName.startsWith("SAWSBUCK_")) return "sawsbuck";

  // Sinistea/Polteageist forms -> map to base
  if (ctName.startsWith("SINISTEA_")) return "sinistea";
  if (ctName.startsWith("POLTEAGEIST_")) return "polteageist";

  // Default: lowercase, replace underscores with hyphens
  return ctName.toLowerCase().replace(/_/g, "-");
}

/**
 * Normalize a CT move name to match the app's learnset format.
 */
export function normalizeMoveName(ctName: string): string {
  return ctName;
}
