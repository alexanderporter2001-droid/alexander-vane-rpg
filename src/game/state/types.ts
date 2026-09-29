export type SceneId = 'opening' | 'harrow' | 'sea' | 'gullrock';
export type CaptainOrder = 'regroup' | 'aggressive' | 'defensive' | 'protect-sera' | 'retreat';

export interface Vec2 { x: number; y: number }

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
  id: 'sera' | 'rowan';
  name: string;
  role: string;
  hp: number;
  maxHp: number;
  position: Vec2;
  loyalty: number;
  morale: number;
  notes: string[];
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
  saveVersion: 3;
  gameVersion: string;
  updatedAt: string;
  player: PlayerState;
  crew: CrewState[];
  ship: ShipState;
  inventory: Record<string, number>;
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
