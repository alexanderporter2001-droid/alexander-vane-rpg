import type { EncounterRank, WorldEncounterState } from '../state/types';

export type CombatBehavior =
  | 'rush'
  | 'hold-line'
  | 'kite'
  | 'flank'
  | 'grapple'
  | 'duel'
  | 'ambush'
  | 'control-space';

export interface EnemyArchetype {
  id: string;
  label: string;
  factions: WorldEncounterState['kind'][];
  ranks: EncounterRank[];
  behavior: CombatBehavior;
  preferredRange: number;
  moveSpeed: number;
  attackCadenceMs: number;
  damage: number;
  tags: string[];
}

export const ENEMY_ARCHETYPES: Record<string, EnemyArchetype> = {
  'marine-recruit-blade': {
    id: 'marine-recruit-blade',
    label: 'Marine Recruit',
    factions: ['marine'],
    ranks: ['rookie'],
    behavior: 'rush',
    preferredRange: 54,
    moveSpeed: 112,
    attackCadenceMs: 1180,
    damage: 10,
    tags: ['melee', 'blade', 'basic-training'],
  },
  'marine-rifleman': {
    id: 'marine-rifleman',
    label: 'Marine Rifleman',
    factions: ['marine'],
    ranks: ['rookie', 'veteran'],
    behavior: 'kite',
    preferredRange: 280,
    moveSpeed: 92,
    attackCadenceMs: 1750,
    damage: 8,
    tags: ['rifle', 'ranged', 'formation'],
  },
  'marine-shield-line': {
    id: 'marine-shield-line',
    label: 'Marine Shield Trooper',
    factions: ['marine'],
    ranks: ['veteran', 'officer'],
    behavior: 'hold-line',
    preferredRange: 48,
    moveSpeed: 88,
    attackCadenceMs: 1320,
    damage: 12,
    tags: ['shield', 'formation', 'resistant-to-pull'],
  },
  'marine-petty-officer': {
    id: 'marine-petty-officer',
    label: 'Marine Petty Officer',
    factions: ['marine'],
    ranks: ['officer'],
    behavior: 'flank',
    preferredRange: 76,
    moveSpeed: 142,
    attackCadenceMs: 980,
    damage: 14,
    tags: ['command', 'saber', 'coordination'],
  },
  'pirate-cutlass': {
    id: 'pirate-cutlass',
    label: 'Cutlass Raider',
    factions: ['pirate'],
    ranks: ['rookie', 'veteran'],
    behavior: 'rush',
    preferredRange: 50,
    moveSpeed: 136,
    attackCadenceMs: 1050,
    damage: 12,
    tags: ['cutlass', 'boarding'],
  },
  'pirate-sniper': {
    id: 'pirate-sniper',
    label: 'Pirate Sharpshooter',
    factions: ['pirate'],
    ranks: ['veteran', 'officer'],
    behavior: 'kite',
    preferredRange: 360,
    moveSpeed: 96,
    attackCadenceMs: 2200,
    damage: 16,
    tags: ['rifle', 'ranged', 'precision'],
  },
  'bounty-grappler': {
    id: 'bounty-grappler',
    label: 'Bounty Grappler',
    factions: ['bounty-hunter'],
    ranks: ['veteran', 'officer'],
    behavior: 'grapple',
    preferredRange: 38,
    moveSpeed: 150,
    attackCadenceMs: 1450,
    damage: 11,
    tags: ['capture', 'grapple', 'nonlethal-option'],
  },
  'criminal-knifefighter': {
    id: 'criminal-knifefighter',
    label: 'Knife Fighter',
    factions: ['criminal'],
    ranks: ['rookie', 'veteran'],
    behavior: 'flank',
    preferredRange: 44,
    moveSpeed: 148,
    attackCadenceMs: 880,
    damage: 10,
    tags: ['knife', 'street-fighter'],
  },
  'elite-swordsman': {
    id: 'elite-swordsman',
    label: 'Elite Swordsman',
    factions: ['marine', 'pirate', 'bounty-hunter', 'criminal'],
    ranks: ['elite'],
    behavior: 'duel',
    preferredRange: 68,
    moveSpeed: 176,
    attackCadenceMs: 760,
    damage: 20,
    tags: ['sword', 'counter', 'technique'],
  },
  'fruit-specialist': {
    id: 'fruit-specialist',
    label: 'Devil Fruit Specialist',
    factions: ['marine', 'pirate', 'bounty-hunter', 'criminal'],
    ranks: ['officer', 'elite'],
    behavior: 'control-space',
    preferredRange: 210,
    moveSpeed: 126,
    attackCadenceMs: 1500,
    damage: 15,
    tags: ['devil-fruit', 'unusual-power', 'adaptive'],
  },
  'haki-veteran': {
    id: 'haki-veteran',
    label: 'Hardened Veteran',
    factions: ['marine', 'pirate', 'bounty-hunter'],
    ranks: ['elite'],
    behavior: 'duel',
    preferredRange: 72,
    moveSpeed: 184,
    attackCadenceMs: 720,
    damage: 22,
    tags: ['future-haki-capable', 'high-threat', 'adaptive'],
  },
};

export function archetypesForEncounter(encounter: WorldEncounterState): EnemyArchetype[] {
  return Object.values(ENEMY_ARCHETYPES).filter(
    (archetype) => archetype.factions.includes(encounter.kind) && archetype.ranks.includes(encounter.rank),
  );
}
