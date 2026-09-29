import { createDefaultCampaign, GAME_VERSION } from './defaultCampaign';
import type { CampaignSave } from './types';

const KEY = 'alexander_vane_rpg_save';

function isObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object';
}

function migrate(raw: unknown): CampaignSave {
  const fresh = createDefaultCampaign();
  if (!isObject(raw)) return fresh;

  const old = raw as Record<string, any>;
  if (old.saveVersion === 3) {
    const merged = old as CampaignSave;
    merged.gameVersion = GAME_VERSION;
    merged.updatedAt = new Date().toISOString();
    return merged;
  }

  const oldPlayer = isObject(old.player) ? old.player as Record<string, any> : {};
  const oldWorld = isObject(old.world) ? old.world as Record<string, any> : {};
  const oldShip = isObject(old.ship) ? old.ship as Record<string, any> : {};

  if (typeof oldPlayer.money === 'number') fresh.player.berries = oldPlayer.money;
  if (typeof oldPlayer.berries === 'number') fresh.player.berries = oldPlayer.berries;
  if (typeof oldPlayer.bounty === 'number') fresh.player.bounty = oldPlayer.bounty;
  if (typeof oldPlayer.hp === 'number') fresh.player.hp = Math.max(0, oldPlayer.hp);

  if (isObject(oldPlayer.fruit)) {
    const f = oldPlayer.fruit as Record<string, any>;
    if (typeof f.mastery === 'number') fresh.player.fruit.mastery = Math.max(0, Math.min(1, f.mastery));
    if (typeof f.range === 'number') fresh.player.fruit.range = f.range;
    if (typeof f.maxForce === 'number') fresh.player.fruit.force = f.maxForce;
    if (typeof f.force === 'number') fresh.player.fruit.force = f.force;
  }

  if (typeof oldWorld.day === 'number') fresh.world.day = oldWorld.day;
  if (typeof oldWorld.minuteOfDay === 'number') fresh.world.minuteOfDay = oldWorld.minuteOfDay;
  if (oldWorld.harrowEscape === 'escaped' || oldWorld.scene === 'sea') {
    fresh.world.flags.harrowEscaped = true;
    fresh.world.flags.openingSeen = true;
    fresh.world.scene = 'sea';
  }

  if (typeof oldShip.hull === 'number') fresh.ship.hull = oldShip.hull;
  if (typeof oldShip.supplies === 'number') fresh.ship.supplies = oldShip.supplies;

  return fresh;
}

export class SaveManager {
  private static state: CampaignSave | null = null;

  static hasStoredSave(): boolean {
    return localStorage.getItem(KEY) !== null;
  }

  static get(): CampaignSave {
    if (!this.state) this.state = this.load();
    return this.state;
  }

  static load(): CampaignSave {
    try {
      const text = localStorage.getItem(KEY);
      this.state = text ? migrate(JSON.parse(text)) : createDefaultCampaign();
    } catch {
      this.state = createDefaultCampaign();
    }
    return this.state;
  }

  static startNew(): CampaignSave {
    this.state = createDefaultCampaign();
    this.save();
    return this.state;
  }

  static save(): void {
    const state = this.get();
    state.updatedAt = new Date().toISOString();
    localStorage.setItem(KEY, JSON.stringify(state));
  }

  static reset(): void {
    this.startNew();
  }

  static exportText(): string {
    this.save();
    return JSON.stringify(this.get(), null, 2);
  }

  static importText(text: string): CampaignSave {
    const parsed = JSON.parse(text) as unknown;
    this.state = migrate(parsed);
    this.save();
    return this.state;
  }
}
