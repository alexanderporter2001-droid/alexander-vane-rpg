export type SceneId = 'opening' | 'harrow' | 'sea' | 'gullrock';
export type CaptainOrder = 'regroup' | 'aggressive' | 'defensive' | 'protect-sera' | 'retreat';
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
  saveVersion: 4;
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
  };
}
