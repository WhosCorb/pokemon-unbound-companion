/**
 * Save file writer for Pokemon Unbound (CFRU).
 *
 * Applies edits (level, nature, IVs, EVs) to party Pokemon in a raw
 * 128KB .sav ArrayBuffer, recomputes checksums and battle stats, and
 * returns a modified buffer ready for download.
 */

import type { BaseStats } from "./types";
import {
  buildSectionMap,
  SECTION_SIZE,
  PARTY_OFFSET,
  PARTY_MON_SIZE,
  NATURE_NAMES,
} from "./save-parser";
import { NATURES } from "./constants";

// ── Types ───────────────────────────────────────────────

export interface StatValues {
  hp: number;
  atk: number;
  def: number;
  spd: number;
  spAtk: number;
  spDef: number;
}

export interface PokemonEdits {
  level?: number;
  nature?: number; // 0-24 index into NATURE_NAMES
  ivs?: StatValues;
  evs?: StatValues;
}

export interface SaveModification {
  slotIndex: number; // party slot 0-5
  changes: PokemonEdits;
}

// ── Low-level helpers ───────────────────────────────────

function u8(dv: DataView, offset: number): number {
  return dv.getUint8(offset);
}

function u16(dv: DataView, offset: number): number {
  return dv.getUint16(offset, true);
}

function u32(dv: DataView, offset: number): number {
  return dv.getUint32(offset, true);
}

function w8(dv: DataView, offset: number, val: number) {
  dv.setUint8(offset, val & 0xFF);
}

function w16(dv: DataView, offset: number, val: number) {
  dv.setUint16(offset, val & 0xFFFF, true);
}

function w32(dv: DataView, offset: number, val: number) {
  dv.setUint32(offset, val >>> 0, true);
}

// ── Checksum ────────────────────────────────────────────

/**
 * Compute the Gen3 section checksum: sum all u32 words in the
 * 3968-byte data area (0xFF4 / 4 = 998 words), then add the
 * upper and lower 16 bits together.
 */
function computeSectionChecksum(dv: DataView, sectionOffset: number): number {
  let sum = 0;
  const wordCount = 0xFF4 / 4; // 998 u32 words (3968 data bytes before footer)
  for (let i = 0; i < wordCount; i++) {
    sum = (sum + dv.getUint32(sectionOffset + i * 4, true)) >>> 0;
  }
  return ((sum & 0xFFFF) + (sum >>> 16)) & 0xFFFF;
}

function writeSectionChecksum(dv: DataView, sectionOffset: number) {
  const checksum = computeSectionChecksum(dv, sectionOffset);
  dv.setUint16(sectionOffset + 0xFF6, checksum, true);
}

// ── PID / Nature ────────────────────────────────────────

/**
 * Find a new PID with the desired nature (pid % 25 == targetNature).
 * Tries to stay close to the original PID to minimize side-effects
 * on gender/ability. Searches forward first, then backward.
 */
export function adjustPidForNature(currentPid: number, targetNature: number): number {
  const cur = currentPid >>> 0;
  if (cur % 25 === targetNature) return cur;

  // Search forward
  for (let delta = 1; delta < 10000; delta++) {
    const candidate = (cur + delta) >>> 0;
    if (candidate % 25 === targetNature) return candidate;
  }
  // Search backward (shouldn't be needed, but just in case)
  for (let delta = 1; delta < 10000; delta++) {
    const candidate = (cur - delta) >>> 0;
    if (candidate % 25 === targetNature) return candidate;
  }
  return cur; // fallback: no change
}

// ── Battle stat recalculation ───────────────────────────

/**
 * Get the nature stat modifier for a given stat.
 * Returns 1.1 for boosted, 0.9 for reduced, 1.0 for neutral.
 */
function getNatureModifier(natureIndex: number, stat: "attack" | "defense" | "spAttack" | "spDefense" | "speed"): number {
  const natureName = NATURE_NAMES[natureIndex];
  if (!natureName) return 1.0;
  const data = NATURES.find(n => n.name === natureName);
  if (!data) return 1.0;
  if (data.increased === stat) return 1.1;
  if (data.decreased === stat) return 0.9;
  return 1.0;
}

/**
 * Gen3 HP stat formula:
 *   HP = floor((2*Base + IV + floor(EV/4)) * Level / 100) + Level + 10
 * Special case: Shedinja always has 1 HP.
 */
function calcHp(base: number, iv: number, ev: number, level: number): number {
  if (base === 1) return 1; // Shedinja
  return Math.floor((2 * base + iv + Math.floor(ev / 4)) * level / 100) + level + 10;
}

/**
 * Gen3 other stat formula:
 *   Stat = floor((floor((2*Base + IV + floor(EV/4)) * Level / 100) + 5) * NatureModifier)
 */
function calcStat(base: number, iv: number, ev: number, level: number, natureModifier: number): number {
  const raw = Math.floor((2 * base + iv + Math.floor(ev / 4)) * level / 100) + 5;
  return Math.floor(raw * natureModifier);
}

// ── Main modification engine ────────────────────────────

/**
 * Apply modifications to party Pokemon in the save buffer.
 * Returns a new ArrayBuffer with edits applied, checksums recomputed.
 *
 * @param buffer   The original 128KB save file ArrayBuffer
 * @param mods     Array of modifications to apply
 * @param baseStatsLookup  Function that returns base stats for a species ID
 */
export function applySaveModifications(
  buffer: ArrayBuffer,
  mods: SaveModification[],
  baseStatsLookup: (speciesId: number) => BaseStats | null,
): ArrayBuffer {
  // Work on a copy
  const copy = buffer.slice(0);
  const dv = new DataView(copy);

  const sectionMap = buildSectionMap(copy);
  const sec1 = sectionMap.get(1);
  if (!sec1) throw new Error("Section 1 (party data) not found in save");

  const sec1Off = sec1.offset;

  for (const mod of mods) {
    if (mod.slotIndex < 0 || mod.slotIndex > 5) continue;

    const monOff = sec1Off + PARTY_OFFSET + mod.slotIndex * PARTY_MON_SIZE;
    const changes = mod.changes;

    // Read current values we might need
    let pid = u32(dv, monOff + 0x00);
    const speciesId = u16(dv, monOff + 0x20);

    // -- Nature (must come first since it changes PID) --
    if (changes.nature !== undefined && changes.nature >= 0 && changes.nature < 25) {
      pid = adjustPidForNature(pid, changes.nature);
      w32(dv, monOff + 0x00, pid);
    }

    // -- Level --
    if (changes.level !== undefined && changes.level >= 1 && changes.level <= 100) {
      w8(dv, monOff + 0x54, changes.level);
    }

    // -- EVs (6 bytes at +0x38) --
    if (changes.evs) {
      const e = changes.evs;
      w8(dv, monOff + 0x38, Math.min(252, Math.max(0, e.hp)));
      w8(dv, monOff + 0x39, Math.min(252, Math.max(0, e.atk)));
      w8(dv, monOff + 0x3A, Math.min(252, Math.max(0, e.def)));
      w8(dv, monOff + 0x3B, Math.min(252, Math.max(0, e.spd)));
      w8(dv, monOff + 0x3C, Math.min(252, Math.max(0, e.spAtk)));
      w8(dv, monOff + 0x3D, Math.min(252, Math.max(0, e.spDef)));
    }

    // -- IVs (packed u32 at +0x48, 5 bits each, preserving egg/ability flags) --
    if (changes.ivs) {
      const iv = changes.ivs;
      const clamp = (v: number) => Math.min(31, Math.max(0, v));
      const existingWord = u32(dv, monOff + 0x48);
      // Preserve bits 30 (isEgg) and 31 (hiddenAbility)
      const flags = existingWord & 0xC0000000;
      const packed =
        (clamp(iv.hp) & 0x1F) |
        ((clamp(iv.atk) & 0x1F) << 5) |
        ((clamp(iv.def) & 0x1F) << 10) |
        ((clamp(iv.spd) & 0x1F) << 15) |
        ((clamp(iv.spAtk) & 0x1F) << 20) |
        ((clamp(iv.spDef) & 0x1F) << 25);
      w32(dv, monOff + 0x48, (packed | flags) >>> 0);
    }

    // -- Recalculate battle stats --
    const baseStats = baseStatsLookup(speciesId);
    if (baseStats) {
      const level = changes.level ?? u8(dv, monOff + 0x54);
      const natureIdx = (u32(dv, monOff + 0x00) >>> 0) % 25;

      // Read current IVs (may have been just written)
      const ivWord = u32(dv, monOff + 0x48);
      const ivHp = ivWord & 0x1F;
      const ivAtk = (ivWord >> 5) & 0x1F;
      const ivDef = (ivWord >> 10) & 0x1F;
      const ivSpd = (ivWord >> 15) & 0x1F;
      const ivSpAtk = (ivWord >> 20) & 0x1F;
      const ivSpDef = (ivWord >> 25) & 0x1F;

      // Read current EVs (may have been just written)
      const evHp = u8(dv, monOff + 0x38);
      const evAtk = u8(dv, monOff + 0x39);
      const evDef = u8(dv, monOff + 0x3A);
      const evSpd = u8(dv, monOff + 0x3B);
      const evSpAtk = u8(dv, monOff + 0x3C);
      const evSpDef = u8(dv, monOff + 0x3D);

      const newMaxHp = calcHp(baseStats.hp, ivHp, evHp, level);
      const newAtk = calcStat(baseStats.attack, ivAtk, evAtk, level, getNatureModifier(natureIdx, "attack"));
      const newDef = calcStat(baseStats.defense, ivDef, evDef, level, getNatureModifier(natureIdx, "defense"));
      const newSpd = calcStat(baseStats.speed, ivSpd, evSpd, level, getNatureModifier(natureIdx, "speed"));
      const newSpAtk = calcStat(baseStats.spAttack, ivSpAtk, evSpAtk, level, getNatureModifier(natureIdx, "spAttack"));
      const newSpDef = calcStat(baseStats.spDefense, ivSpDef, evSpDef, level, getNatureModifier(natureIdx, "spDefense"));

      // Scale current HP proportionally to new max HP
      const oldMaxHp = u16(dv, monOff + 0x58);
      const oldCurrentHp = u16(dv, monOff + 0x56);
      const newCurrentHp = oldMaxHp > 0
        ? Math.max(1, Math.round(oldCurrentHp * newMaxHp / oldMaxHp))
        : newMaxHp;

      w16(dv, monOff + 0x56, newCurrentHp);
      w16(dv, monOff + 0x58, newMaxHp);
      w16(dv, monOff + 0x5A, newAtk);
      w16(dv, monOff + 0x5C, newDef);
      w16(dv, monOff + 0x5E, newSpd);
      w16(dv, monOff + 0x60, newSpAtk);
      w16(dv, monOff + 0x62, newSpDef);
    }
  }

  // Recompute checksum for section 1
  if (sec1) {
    writeSectionChecksum(dv, sec1.offset);
  }

  return copy;
}

/**
 * Trigger a browser download of the modified save buffer.
 */
export function downloadSaveFile(buffer: ArrayBuffer, filename: string) {
  const blob = new Blob([buffer], { type: "application/octet-stream" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
