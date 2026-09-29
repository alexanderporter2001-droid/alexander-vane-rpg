import Phaser from 'phaser';
import { SaveManager } from '../state/SaveManager';

export class BootScene extends Phaser.Scene {
  constructor() { super('BootScene'); }

  create(): void {
    this.makeTextures();
    const save = SaveManager.load();
    if (!save.world.flags.openingSeen || save.world.scene === 'opening') this.scene.start('OpeningScene');
    else if (save.world.scene === 'sea') this.scene.start('SeaScene');
    else if (save.world.scene === 'gullrock') this.scene.start('GullrockScene');
    else this.scene.start('HarrowScene');
  }

  private makeTextures(): void {
    this.makeCharacter('alexander', 0xd8b45f, 0x1d3445, 0x8e2430, 'captain');
    this.makeCharacter('sera', 0xc98e66, 0x315b72, 0xa13d52, 'navigator');
    this.makeCharacter('rowan', 0x9d6b4b, 0x2c3135, 0x9c3838, 'fighter');
    this.makeCharacter('marine', 0xd9b38c, 0xe6eef1, 0x315f8d, 'marine');
    this.makeShip();
    this.makeProp('crate', 0x74512f, 44, 44);
    this.makeProp('barrel', 0x805b31, 38, 44);

    const bullet = this.add.graphics();
    bullet.fillStyle(0xffe3a2, 1).fillCircle(5, 5, 4);
    bullet.generateTexture('bullet', 10, 10);
    bullet.destroy();
  }

  private makeCharacter(key: string, skin: number, cloth: number, accent: number, role: string): void {
    const g = this.add.graphics();
    g.fillStyle(0x0a0b0d, 0.25).fillEllipse(36, 98, 45, 10);
    g.fillStyle(0x27231f, 1).fillRoundedRect(19, 75, 14, 23, 4).fillRoundedRect(39, 75, 14, 23, 4);
    g.fillStyle(cloth, 1).fillRoundedRect(15, 45, 42, 37, 8);
    g.fillStyle(accent, 1).fillRect(18, 65, 36, 7);
    g.fillStyle(skin, 1).fillCircle(36, 32, 14);
    g.fillRoundedRect(7, 48, 12, 28, 5).fillRoundedRect(53, 48, 12, 28, 5);

    if (role === 'captain') {
      g.fillStyle(0x15181d, 1).fillEllipse(36, 23, 39, 17);
      g.lineStyle(3, 0xd8b45f, 1).strokeEllipse(36, 23, 41, 19);
      g.fillStyle(0x8e2430, 1).fillTriangle(15, 52, 3, 90, 27, 78).fillTriangle(57, 52, 69, 90, 45, 78);
    } else if (role === 'navigator') {
      g.fillStyle(0x27374b, 1).fillEllipse(36, 23, 34, 20);
      g.lineStyle(3, 0xd2b274, 1).strokeCircle(60, 57, 8);
    } else if (role === 'fighter') {
      g.fillStyle(0x17191b, 1).fillEllipse(36, 23, 36, 18);
      g.lineStyle(4, 0xbfc6ca, 1);
      g.beginPath().moveTo(10, 60).lineTo(1, 78).lineTo(8, 88).strokePath();
      g.beginPath().moveTo(62, 60).lineTo(71, 78).lineTo(64, 88).strokePath();
    } else {
      g.fillStyle(0xf6f8f9, 1).fillEllipse(36, 21, 38, 15);
      g.fillStyle(0x315f8d, 1).fillRect(17, 25, 38, 6);
    }

    g.generateTexture(key, 72, 104);
    g.destroy();
  }

  private makeShip(): void {
    const g = this.add.graphics();
    g.fillStyle(0x251a13, 0.35).fillEllipse(58, 150, 82, 20);
    g.fillStyle(0x6d4b2f, 1).fillRoundedRect(20, 44, 76, 100, 25);
    g.lineStyle(4, 0xb98a4c, 1).strokeRoundedRect(20, 44, 76, 100, 25);
    g.fillStyle(0x39291d, 1).fillRect(56, 14, 5, 102);
    g.fillStyle(0xd8c9a9, 1).fillTriangle(61, 20, 61, 84, 108, 66);
    g.fillTriangle(54, 30, 54, 91, 11, 73);
    g.fillStyle(0x172735, 1).fillCircle(58, 120, 11);
    g.generateTexture('wayward-gull', 116, 168);
    g.destroy();
  }

  private makeProp(key: string, color: number, width: number, height: number): void {
    const g = this.add.graphics();
    g.fillStyle(color, 1).fillRoundedRect(2, 2, width - 4, height - 4, 6);
    g.lineStyle(3, 0x352319, 1).strokeRoundedRect(2, 2, width - 4, height - 4, 6);
    if (key === 'crate') {
      g.beginPath().moveTo(5, 5).lineTo(width - 5, height - 5).moveTo(width - 5, 5).lineTo(5, height - 5).strokePath();
    } else {
      g.beginPath().moveTo(4, 14).lineTo(width - 4, 14).moveTo(4, 30).lineTo(width - 4, 30).strokePath();
    }
    g.generateTexture(key, width, height);
    g.destroy();
  }
}
