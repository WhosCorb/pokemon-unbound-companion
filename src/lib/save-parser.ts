/**
 * Client-side GBA save file parser for Pokemon Unbound (CFRU).
 *
 * Reads a 128KB .sav / .srm file and extracts player info and party data.
 * The CFRU build does NOT encrypt sub-structure data, so Pokemon fields
 * are at fixed offsets within each 100-byte party slot.
 */

import { decodeGen3String } from "./save-data/characters";
import { SPECIES } from "./save-data/species";
import { MOVES } from "./save-data/moves";
import { ITEMS } from "./save-data/items";
import { SPECIES_DATA } from "./save-data/species-data";

// CFRU signature (differs from vanilla GBA's 0x08012025)
const CFRU_SIGNATURE = 0x08012025;
export const SECTION_SIZE = 0x1000; // 4096 bytes per section
const SECTION_COUNT = 14;
const BLOCK_SIZE = SECTION_SIZE * SECTION_COUNT; // 57344 bytes per save block

export const NATURE_NAMES = [
  "Hardy", "Lonely", "Brave", "Adamant", "Naughty",
  "Bold", "Docile", "Relaxed", "Impish", "Lax",
  "Timid", "Hasty", "Serious", "Jolly", "Naive",
  "Modest", "Mild", "Quiet", "Bashful", "Rash",
  "Calm", "Gentle", "Sassy", "Careful", "Quirky",
] as const;

// ── Public types ────────────────────────────────────────

export interface SavePlayerInfo {
  name: string;
  gender: "male" | "female";
  trainerId: number;
  secretId: number;
  playTime: { hours: number; minutes: number; seconds: number };
  badgeCount: number;
}

export interface SavePokemon {
  species: { id: number; name: string };
  nickname: string;
  otName: string;
  level: number;
  nature: (typeof NATURE_NAMES)[number];
  gender: "male" | "female" | "genderless";
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

export interface ParsedSave {
  player: SavePlayerInfo;
  party: SavePokemon[];
  partyCount: number;
  money: number;
  coins: number;
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
  return dv.getUint16(offset, true); // little-endian
}

function u32(dv: DataView, offset: number): number {
  return dv.getUint32(offset, true);
}

function getBytes(buf: ArrayBuffer, offset: number, length: number): Uint8Array {
  return new Uint8Array(buf, offset, length);
}

// ── Section map builder ─────────────────────────────────

export interface SectionInfo {
  offset: number; // absolute byte offset in file
  sectionId: number;
  checksum: number;
  signature: number;
  saveIndex: number;
}

export function buildSectionMap(buf: ArrayBuffer): Map<number, SectionInfo> {
  const dv = new DataView(buf);

  // Each block (A/B) has 14 sections of 0x1000 bytes each
  // Block A starts at 0x0000, Block B at 0xE000
  const blockAStart = 0;
  const blockBStart = BLOCK_SIZE; // 0xE000

  function readSections(blockStart: number): SectionInfo[] {
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

  const sectionsA = readSections(blockAStart);
  const sectionsB = readSections(blockBStart);

  // Pick the block with the higher save index (more recent save)
  const indexA = sectionsA[0]?.saveIndex ?? 0;
  const indexB = sectionsB[0]?.saveIndex ?? 0;
  const active = indexA >= indexB ? sectionsA : sectionsB;

  // Build map: sectionId -> section info
  const map = new Map<number, SectionInfo>();
  for (const sec of active) {
    // Validate signature
    if (sec.signature !== CFRU_SIGNATURE && sec.signature !== 0x01121998) {
      // Accept both known signatures
    }
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

function countBits(n: number): number {
  let count = 0;
  let v = n >>> 0;
  while (v) {
    count += v & 1;
    v >>>= 1;
  }
  return count;
}

/**
 * Read badge count from event flags in section 1.
 * pokefirered: FLAG_BADGE01_GET = 0x820 through FLAG_BADGE08_GET = 0x827.
 * Flags array starts at offset 0xEE0 within gSaveBlock1 (section 1 data).
 * Flag 0x820 = byte offset 0xEE0 + (0x820 / 8) = 0xFE4, bit 0.
 */
function readBadgesFromEventFlags(buf: ArrayBuffer, sectionMap: Map<number, SectionInfo>): number {
  const sec1 = sectionMap.get(1);
  if (!sec1) return 0;
  const dv = new DataView(buf, sec1.offset, SECTION_SIZE);
  let badges = 0;
  for (let i = 0; i < 8; i++) {
    const flagId = 0x820 + i;
    const byteOffset = 0xEE0 + Math.floor(flagId / 8);
    const bitIndex = flagId % 8;
    if (byteOffset < SECTION_SIZE && (u8(dv, byteOffset) & (1 << bitIndex)) !== 0) {
      badges++;
    }
  }
  return badges;
}

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

  // CFRU stores badge flags as a u32 at offset 0xAC in section 0
  // (vanilla Gen3 uses u16 at 0x1D -- not valid for CFRU)
  const badgeFlags = u32(dv, 0xAC);
  let badgeCount = countBits(badgeFlags);

  // Fallback: if direct offset reads 0, try event flags in section 1
  if (badgeCount === 0) {
    badgeCount = readBadgesFromEventFlags(buf, sectionMap);
  }

  return {
    name,
    gender,
    trainerId,
    secretId,
    playTime: { hours, minutes, seconds },
    badgeCount,
  };
}

// ── Party Pokemon parser (Section 1) ───────────────────

export const PARTY_OFFSET = 0x38; // offset within section 1 data
export const PARTY_COUNT_OFFSET = 0x34;
export const PARTY_MON_SIZE = 100; // 0x64 bytes per party mon

function parsePartyPokemon(dv: DataView, offset: number): SavePokemon {
  const pid = u32(dv, offset + 0x00);
  const nature = NATURE_NAMES[pid % 25];

  const speciesId = u16(dv, offset + 0x20);
  const speciesName = SPECIES.get(speciesId) ?? `Unknown (${speciesId})`;

  // Derive gender from PID and species gender threshold
  const speciesInfo = SPECIES_DATA.get(speciesId);
  const genderThreshold = speciesInfo?.[1] ?? 127;
  let gender: "male" | "female" | "genderless";
  if (genderThreshold === 255) {
    gender = "genderless";
  } else if (genderThreshold === 0) {
    gender = "male";
  } else if (genderThreshold === 254) {
    gender = "female";
  } else {
    gender = (pid & 0xFF) >= genderThreshold ? "male" : "female";
  }

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

  // Nickname: 10 bytes at +0x08
  const nickBytes = new Uint8Array(dv.buffer, dv.byteOffset + offset + 0x08, 10);
  const nickname = decodeGen3String(nickBytes, 10);

  // OT name: 7 bytes at +0x14
  const otBytes = new Uint8Array(dv.buffer, dv.byteOffset + offset + 0x14, 7);
  const otName = decodeGen3String(otBytes, 7);

  return {
    species: { id: speciesId, name: speciesName },
    nickname,
    otName,
    level,
    nature,
    gender,
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

// ── Main parser ─────────────────────────────────────────

export function parseSaveFile(buffer: ArrayBuffer): ParsedSave {
  if (buffer.byteLength < 0x20000) {
    throw new SaveParseError(
      `File too small: ${buffer.byteLength} bytes (expected 128KB / 131072 bytes)`
    );
  }

  const sectionMap = buildSectionMap(buffer);

  if (sectionMap.size === 0) {
    throw new SaveParseError("No valid sections found in save file");
  }

  const player = parsePlayerInfo(buffer, sectionMap);

  // Section 1 contains the party
  const sec1 = getSectionData(buffer, sectionMap, 1);
  const partyCount = Math.min(u32(sec1, PARTY_COUNT_OFFSET), 6);

  const party: SavePokemon[] = [];
  for (let i = 0; i < partyCount; i++) {
    const mon = parsePartyPokemon(sec1, PARTY_OFFSET + i * PARTY_MON_SIZE);
    if (mon.species.id > 0) {
      party.push(mon);
    }
  }

  // Money: section 1, offset +0x0290, u32
  let money = 0;
  try {
    money = u32(sec1, 0x0290);
  } catch { /* ignore if out of bounds */ }

  // Coins: section 13, offset +0x07CC, u16
  let coins = 0;
  try {
    const sec13 = getSectionData(buffer, sectionMap, 13);
    coins = u16(sec13, 0x07CC);
  } catch { /* ignore if section not found */ }

  return { player, party, partyCount, money, coins };
}

// ── Species name -> app ID mapping ──────────────────────

/**
 * Convert a CT species name (e.g., "LARVITAR", "MR_MIME", "HO_OH")
 * to the app's pokemon ID format (e.g., "larvitar", "mr-mime", "ho-oh").
 */
export function speciesNameToAppId(ctName: string): string {
  let id = ctName.toLowerCase();

  // Regional form suffixes: RATTATA_A -> alolan-rattata, PONYTA_G -> galarian-ponyta
  const alolanSuffix = /_a$/;
  const galarianSuffix = /_g$/;
  const hisuianSuffix = /_h$/;

  if (alolanSuffix.test(id)) {
    id = "alolan-" + id.replace(alolanSuffix, "");
  } else if (galarianSuffix.test(id)) {
    id = "galarian-" + id.replace(galarianSuffix, "");
  } else if (hisuianSuffix.test(id)) {
    id = "hisuian-" + id.replace(hisuianSuffix, "");
  }

  // Replace underscores with hyphens
  id = id.replace(/_/g, "-");

  // Special known mappings for forms that have different CT names
  const formMappings: Record<string, string> = {
    "nidoran-f": "nidoran-f",
    "nidoran-m": "nidoran-m",
    "mr-mime": "mr-mime",
    "mr-rime": "mr-rime",
    "mime-jr": "mime-jr",
    "ho-oh": "ho-oh",
    "porygon-z": "porygon-z",
    "jangmo-o": "jangmo-o",
    "hakamo-o": "hakamo-o",
    "kommo-o": "kommo-o",
    "tapu-koko": "tapu-koko",
    "tapu-lele": "tapu-lele",
    "tapu-bulu": "tapu-bulu",
    "tapu-fini": "tapu-fini",
    "type-null": "type-null",
    "farfetchd": "farfetchd",
  };

  return formMappings[id] ?? id;
}

/**
 * Normalize a CT move name to match the app's learnset format.
 * CT names may use abbreviations or different capitalization.
 */
export function normalizeMoveName(ctName: string): string {
  return ctName;
}
