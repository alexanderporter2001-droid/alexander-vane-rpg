import type { CampaignSave } from './types';

export type PlaySceneKey = 'OpeningScene' | 'HarrowScene' | 'SeaScene' | 'GullrockScene' | 'GameOverScene';

export function routeCampaign(save: CampaignSave): PlaySceneKey {
  if (save.world.flags.alexanderDead || save.player.hp <= 0) return 'GameOverScene';
  if (!save.world.flags.openingSeen || save.world.scene === 'opening') return 'OpeningScene';
  if (save.world.scene === 'sea') return 'SeaScene';
  if (save.world.scene === 'gullrock') return 'GullrockScene';
  return 'HarrowScene';
}
