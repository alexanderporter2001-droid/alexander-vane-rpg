import Phaser from 'phaser';
import './style.css';
import { BootScene } from './game/scenes/BootScene';
import { TitleScene } from './game/scenes/TitleScene';
import { OpeningScene } from './game/scenes/OpeningScene';
import { HarrowScene } from './game/scenes/HarrowScene';
import { SeaScene } from './game/scenes/SeaScene';
import { GullrockScene } from './game/scenes/GullrockScene';
import { PauseScene } from './game/scenes/PauseScene';
import { GameOverScene } from './game/scenes/GameOverScene';

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  parent: 'game-root',
  backgroundColor: '#071116',
  scale: {
    mode: Phaser.Scale.RESIZE,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    width: window.innerWidth,
    height: window.innerHeight,
  },
  physics: {
    default: 'arcade',
    arcade: { gravity: { x: 0, y: 0 }, debug: false },
  },
  input: {
    activePointers: 6,
    touch: { capture: true },
  },
  render: {
    antialias: true,
    roundPixels: true,
  },
  scene: [
    BootScene,
    TitleScene,
    OpeningScene,
    HarrowScene,
    SeaScene,
    GullrockScene,
    PauseScene,
    GameOverScene,
  ],
};

new Phaser.Game(config);
