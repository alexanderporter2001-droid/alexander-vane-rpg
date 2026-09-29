import type { CampaignSave } from '../state/types';
import { simulateWorld } from './LivingWorld';

function normalizeDay(save: CampaignSave): void {
  const startDay = save.world.day;
  while (save.world.minuteOfDay >= 1440) {
    save.world.minuteOfDay -= 1440;
    save.world.day += 1;
  }
  if (save.world.day !== startDay) simulateWorld(save);
}

export function advanceWorldClock(save: CampaignSave, deltaSeconds: number, multiplier = 1): void {
  save.world.minuteOfDay += (deltaSeconds / 60) * multiplier;
  normalizeDay(save);
}

export function advanceWorldMinutes(save: CampaignSave, minutes: number): void {
  save.world.minuteOfDay += Math.max(0, minutes);
  normalizeDay(save);
}

export function formatWorldTime(save: CampaignSave): string {
  const hour = Math.floor(save.world.minuteOfDay / 60) % 24;
  const minute = Math.floor(save.world.minuteOfDay % 60);
  return 'Day ' + save.world.day + ' · ' + hour.toString().padStart(2, '0') + ':' + minute.toString().padStart(2, '0');
}
