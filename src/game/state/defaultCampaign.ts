import type { CampaignSave } from './types';

export const GAME_VERSION = '0.3.9';
export const SAVE_VERSION = 3 as const;

export function createDefaultCampaign(): CampaignSave {
  return {
    saveVersion: SAVE_VERSION,
    gameVersion: GAME_VERSION,
    updatedAt: new Date().toISOString(),
    player: {
      name: 'Alexander Vane',
      age: 19,
      hp: 100,
      maxHp: 100,
      stamina: 100,
      maxStamina: 100,
      berries: 308_600,
      bounty: 6_500_000,
      position: { x: 720, y: 870 },
      fruit: {
        eaten: true,
        fruitNameKnown: false,
        observedPower: 'attraction',
        mastery: 0.08,
        range: 270,
        force: 420,
      },
      knowledge: { hakiKnown: false },
    },
    crew: [
      {
        id: 'sera',
        name: 'Sera Quill',
        role: 'Navigator',
        hp: 76,
        maxHp: 76,
        position: { x: 650, y: 905 },
        loyalty: 0.62,
        morale: 0.67,
        notes: ['Cautious navigator', 'Acts independently', 'Knows the sea better than Alexander'],
      },
      {
        id: 'rowan',
        name: 'Rowan Vale',
        role: 'Frontline fighter',
        hp: 110,
        maxHp: 110,
        position: { x: 780, y: 900 },
        loyalty: 0.58,
        morale: 0.74,
        notes: ['Uses chain hooks', 'Wants freedom, strength, and a name across the seas'],
      },
    ],
    ship: {
      name: 'Wayward Gull',
      hull: 100,
      maxHull: 100,
      supplies: 72,
      x: 760,
      y: 1600,
      heading: -Math.PI / 2,
      speed: 0,
    },
    inventory: {
      'Basic medicine': 2,
      'Fresh water': 5,
      'Rations': 5,
      'Rope': 1,
    },
    journal: [
      {
        id: 'harrow-escape',
        title: 'Escape Harrow Island',
        body: 'Reach the Wayward Gull. Marines are searching the docks; fighting is optional.',
        known: true,
      },
      {
        id: 'fruit',
        title: 'Unknown Devil Fruit',
        body: 'You swallowed the deep-blue spiral Fruit during the escape. Its observed effect pulls people and objects toward you.',
        known: true,
      },
    ],
    world: {
      scene: 'opening',
      locationId: 'harrow-island',
      day: 1,
      minuteOfDay: 17 * 60 + 24,
      flags: {
        openingSeen: false,
        harrowMarinesAlerted: false,
        harrowEscaped: false,
        gullrockDiscovered: false,
        waywardGullDisabled: false,
        sailingDelegated: true,
        shipDestination: 'gullrock',
      },
      canonLedger: [],
    },
  };
}
