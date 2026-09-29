export type SceneId = 'opening' | 'harrow' | 'sea' | 'gullrock';
export type CaptainOrder = 'regroup' | 'aggressive' | 'defensive' | 'protect-sera' | 'retreat' | 'repel-boarders' | 'board-enemy' | 'keep-distance' | 'close-distance';
export type EncounterDisposition = 'friendly' | 'neutral' | 'wary' | 'hostile';
export type EncounterRank = 'civilian' | 'rookie' | 'veteran' | 'officer' | 'elite' | 'admiral';
export type EquipmentSlot = 'weapon' | 'armor' | 'tool' | 'accessory';

export interface Vec2 { x: number; y: number }

export interface EquipmentLoadout {
  weapon: string | null;
  armor: string | null;
  tool: string | null;
  accessory: string | null;
}

export interface PlayerState {
  name: 'Alexander Vane';
  age: 19;
  hp: number;
  maxHp: number;
  stamina: number;
  maxStamina: number;
  berries: number;
  bounty: number;
  position: Vec2;
  equipmentTags: string[];
  equipment: EquipmentLoadout;
  fruit: {
    eaten: true;
    fruitNameKnown: boolean;
    observedPower: 'attraction';
    mastery: number;
    range: number;
    force: number;
  };
  knowledge: { hakiKnown: boolean };
  progression: {
    combatExperience: number;
    physicalConditioning: number;
    fruitTechniquePoints: number;
    techniques: string[];
  };
}

export interface CrewState {
  id: string;
  name: string;
  role: string;
  hp: number;
  maxHp: number;
  position: Vec2;
  loyalty: number;
  morale: number;
  notes: string[];
  equipmentTags: string[];
  capabilities: string[];
  equipment: EquipmentLoadout;
  progression: {
    experience: number;
    specialty: number;
    techniques: string[];
  };
  recruitedDay: number;
}

export interface WorldIslandState {
  id: string;
  name: string;
  seed: number;
  size: 'small' | 'medium' | 'large';
  discovered: boolean;
  population: number;
  marinePresence: number;
  piratePresence: number;
  prosperity: number;
  danger: number;
  factions: string[];
  activeSituations: string[];
  resolvedSituations: string[];
  lastSimulatedDay: number;
}

export interface WorldEncounterState {
  id: string;
  kind: 'marine' | 'pirate' | 'bounty-hunter' | 'criminal' | 'merchant' | 'traveler';
  rank: EncounterRank;
  disposition: EncounterDisposition;
  locationId: string;
  atSea: boolean;
  persistentGroupId: string | null;
  createdDay: number;
  resolved: boolean;
}

export interface KnownGroupState {
  id: string;
  name: string;
  kind: 'marine' | 'pirate' | 'bounty-hunter' | 'civilian';
  relationship: number;
  strength: number;
  alive: boolean;
  notes: string[];
}

export interface RecruitCandidateState {
  id: string;
  name: string;
  role: string;
  locationId: string;
  available: boolean;
  trust: number;
  requiredTrust: number;
  reasonToJoin: string;
  equipmentTags: string[];
  capabilities: string[];
}

export interface ShipState {
  name: 'Wayward Gull';
  hull: number;
  maxHull: number;
  supplies: number;
  x: number;
  y: number;
  heading: number;
  speed: number;
}

export interface JournalEntry {
  id: string;
  title: string;
  body: string;
  known: boolean;
}

export interface CampaignSave {
  saveVersion: 5;
  gameVersion: string;
  updatedAt: string;
  player: PlayerState;
  crew: CrewState[];
  ship: ShipState;
  inventory: Record<string, number>;
  equipmentInventory: Record<string, number>;
  journal: JournalEntry[];
  world: {
    scene: SceneId;
    locationId: string;
    day: number;
    minuteOfDay: number;
    flags: Record<string, boolean | string | number>;
    canonLedger: Array<{ event: string; status: 'intact' | 'influenced' | 'diverged'; note: string }>;
    islands: Record<string, WorldIslandState>;
    encounters: WorldEncounterState[];
    knownGroups: Record<string, KnownGroupState>;
    recruitCandidates: Record<string, RecruitCandidateState>;
    threatHeat: number;
  };
}
