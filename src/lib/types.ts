// ──────────────────────────────────────────────
// Pokemon Types
// ──────────────────────────────────────────────

export type PokemonType =
  | "normal"
  | "fire"
  | "water"
  | "electric"
  | "grass"
  | "ice"
  | "fighting"
  | "poison"
  | "ground"
  | "flying"
  | "psychic"
  | "bug"
  | "rock"
  | "ghost"
  | "dragon"
  | "dark"
  | "steel"
  | "fairy";

export type Difficulty = "easy" | "normal" | "difficult" | "expert";

export type EncounterMethod =
  | "grass"
  | "surf"
  | "fishing-old"
  | "fishing-good"
  | "fishing-super"
  | "headbutt"
  | "rock-smash"
  | "gift"
  | "trade"
  | "static"
  | "raid";

export type MissionStatus = "available" | "in-progress" | "completed";

// ──────────────────────────────────────────────
// Progression
// ──────────────────────────────────────────────

export interface Milestone {
  id: string;
  name: string;
  description: string;
  order: number;
  category: "badge" | "story" | "hm" | "post-game";
}

export interface ProgressionData {
  milestones: Milestone[];
}

// ──────────────────────────────────────────────
// Pokemon
// ──────────────────────────────────────────────

export interface BaseStats {
  hp: number;
  attack: number;
  defense: number;
  spAttack: number;
  spDefense: number;
  speed: number;
}

export interface LearnsetMove {
  name: string;
  type: PokemonType;
  category: "physical" | "special" | "status";
  power: number | null;
  accuracy: number | null;
  pp: number;
  source: "level-up" | "tm" | "tutor" | "egg";
  level?: number;
  tmNumber?: string;
}

export interface EvolutionStage {
  pokemonId: string;
  pokemonName: string;
  method: string; // "Level 36", "Fire Stone", "Trade", etc.
}

export interface Ability {
  name: string;
  isHidden: boolean;
}

export interface CatchLocation {
  locationId: string;
  locationName: string;
  method: EncounterMethod;
  rate: number;
  milestoneRequired: string;
}

export interface Pokemon {
  id: string;
  dexNumber: number;
  name: string;
  types: [PokemonType] | [PokemonType, PokemonType];
  baseStats: BaseStats;
  abilities: Ability[];
  learnset: LearnsetMove[];
  evolutionChain: EvolutionStage[];
  catchLocations: CatchLocation[];
  milestoneRequired: string;
  spriteUrl?: string;
}

// ──────────────────────────────────────────────
// Locations
// ──────────────────────────────────────────────

export interface Encounter {
  pokemonId: string;
  pokemonName: string;
  types: PokemonType[];
  method: EncounterMethod;
  rate: number;
  levels: { min: number; max: number };
}

export interface LocationItem {
  itemId: string;
  itemName: string;
  description?: string;
}

export interface LocationTrainer {
  name: string;
  team: TrainerPokemon[];
}

export interface Location {
  id: string;
  name: string;
  category: "town" | "route" | "dungeon" | "building" | "special";
  encounters: Encounter[];
  items: LocationItem[];
  trainers: LocationTrainer[];
  milestoneRequired: string;
  connectedLocations: string[];
}

// ──────────────────────────────────────────────
// Trainers (Bosses)
// ──────────────────────────────────────────────

export interface TrainerPokemon {
  pokemonId: string;
  pokemonName: string;
  types: PokemonType[];
  level: number;
  moves: string[];
  ability?: string;
  item?: string;
}

export interface Trainer {
  id: string;
  name: string;
  title: string; // "Gym Leader", "Elite Four", "Champion", etc.
  locationId: string;
  specialtyType?: PokemonType;
  teams: {
    [K in Difficulty]?: TrainerPokemon[];
  };
  milestoneRequired: string;
  badgeAwarded?: string;
}

// ──────────────────────────────────────────────
// Items
// ──────────────────────────────────────────────

export type ItemCategory =
  | "tm"
  | "mega-stone"
  | "z-crystal"
  | "zygarde-cell"
  | "key-item"
  | "berry"
  | "held-item"
  | "evolution-item";

export interface Item {
  id: string;
  name: string;
  category: ItemCategory;
  description: string;
  locationId?: string;
  locationName?: string;
  milestoneRequired: string;
  tmMove?: string;
  tmType?: PokemonType;
}

// ──────────────────────────────────────────────
// Missions
// ──────────────────────────────────────────────

export interface Mission {
  id: string;
  name: string;
  description: string;
  requirements: string;
  objectives: string[];
  rewards: string[];
  milestoneRequired: string;
  locationId?: string;
}

// ──────────────────────────────────────────────
// User State (persisted in localStorage)
// ──────────────────────────────────────────────

export interface TeamSlot {
  pokemonId: string;
  pokemonName: string;
  types: PokemonType[];
  level: number;
  moves: string[];
  ability: string;
}

export interface UserProgress {
  completedMilestones: string[];
  currentLocation: string;
  difficulty: Difficulty;
}

export interface UserTeam {
  slots: (TeamSlot | null)[];
}

export interface TrackerState {
  foundItems: string[];
  missionStatus: Record<string, MissionStatus>;
}

// ──────────────────────────────────────────────
// Aggregated Data (loaded at app init)
// ──────────────────────────────────────────────

export interface GameData {
  pokemon: Pokemon[];
  locations: Location[];
  trainers: Trainer[];
  items: Item[];
  missions: Mission[];
  progression: ProgressionData;
}
