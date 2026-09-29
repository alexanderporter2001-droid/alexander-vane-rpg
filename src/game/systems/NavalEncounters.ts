import type { CaptainOrder, WorldEncounterState } from '../state/types';

export type NavalOrder = Extract<
  CaptainOrder,
  'repel-boarders' | 'board-enemy' | 'protect-sera' | 'keep-distance' | 'close-distance'
>;

export interface NavalTacticalState {
  range: number;
  ownHull: number;
  enemyHull: number;
  ownSpeed: number;
  enemySpeed: number;
  order: NavalOrder;
  boardingRisk: number;
}

export interface HelmCommand {
  desiredRange: number;
  throttle: number;
  prioritizeBroadside: boolean;
  permitBoarding: boolean;
}

export interface NavalExchangeResult extends NavalTacticalState {
  ownHullDamage: number;
  enemyHullDamage: number;
  boardingWindow: boolean;
}

function seededUnit(seed: number): number {
  let x = seed >>> 0;
  x ^= x << 13;
  x ^= x >>> 17;
  x ^= x << 5;
  return (x >>> 0) / 4294967296;
}

export function helmCommandFor(order: NavalOrder): HelmCommand {
  if (order === 'keep-distance') {
    return { desiredRange: 420, throttle: 0.9, prioritizeBroadside: true, permitBoarding: false };
  }
  if (order === 'close-distance') {
    return { desiredRange: 170, throttle: 0.82, prioritizeBroadside: true, permitBoarding: false };
  }
  if (order === 'board-enemy') {
    return { desiredRange: 55, throttle: 0.58, prioritizeBroadside: false, permitBoarding: true };
  }
  if (order === 'protect-sera') {
    return { desiredRange: 300, throttle: 0.78, prioritizeBroadside: true, permitBoarding: false };
  }
  return { desiredRange: 230, throttle: 0.7, prioritizeBroadside: true, permitBoarding: false };
}

export function canBoard(state: NavalTacticalState): boolean {
  return state.order === 'board-enemy'
    && state.range <= 72
    && Math.abs(state.ownSpeed - state.enemySpeed) <= 38
    && state.ownHull > 0
    && state.enemyHull > 0;
}

export function resolveNavalExchange(
  encounter: WorldEncounterState,
  state: NavalTacticalState,
  exchangeIndex: number,
  crewSpecialty: number,
): NavalExchangeResult {
  const strength = Math.max(0.1, encounter.strength ?? 0.45);
  const seed = encounter.id.split('').reduce((total, char) => Math.imul(total ^ char.charCodeAt(0), 16777619), exchangeIndex + 1);
  const roll = seededUnit(seed);
  const rangeFactor = state.range <= 260 ? 1 : state.range <= 430 ? 0.55 : 0.15;
  const defense = Math.max(0, Math.min(0.35, crewSpecialty * 0.22));
  const hostile = encounter.disposition === 'hostile' || encounter.intent === 'attack' || encounter.intent === 'board';
  const ownHullDamage = hostile
    ? Math.max(0, Math.round((3 + strength * 8) * rangeFactor * (0.7 + roll * 0.6) * (1 - defense)))
    : 0;
  const offensiveOrder = state.order === 'close-distance' || state.order === 'board-enemy' || state.order === 'keep-distance';
  const enemyHullDamage = offensiveOrder && hostile
    ? Math.max(0, Math.round((2 + crewSpecialty * 7) * rangeFactor * (0.75 + (1 - roll) * 0.5)))
    : 0;

  const next: NavalTacticalState = {
    ...state,
    ownHull: Math.max(0, state.ownHull - ownHullDamage),
    enemyHull: Math.max(0, state.enemyHull - enemyHullDamage),
    boardingRisk: Math.max(
      0,
      Math.min(
        1,
        state.boardingRisk
          + (encounter.intent === 'board' && state.range < 100 ? 0.18 : -0.05)
          + (state.order === 'repel-boarders' ? -0.12 : 0),
      ),
    ),
  };

  return {
    ...next,
    ownHullDamage,
    enemyHullDamage,
    boardingWindow: canBoard(next),
  };
}
