import Phaser from 'phaser';

export class BootScene extends Phaser.Scene {
  constructor() { super('BootScene'); }

  create(): void {
    this.makeTextures();
    this.scene.start('TitleScene');
  }

  private makeTextures(): void {
    this.makeCharacter('alexander', 0xd8b45f, 0x1d3445, 0x8e2430, 'captain');
    this.makeCharacter('sera', 0xc98e66, 0x315b72, 0xa13d52, 'navigator');
    this.makeCharacter('rowan', 0x9d6b4b, 0x2c3135, 0x9c3838, 'fighter');
    this.makeCharacter('crew-medic', 0xb98263, 0x49616d, 0xd7e1d0, 'medic');
    this.makeCharacter('crew-specialist', 0xa7775c, 0x4b5660, 0xb58b56, 'specialist');
    this.makeCharacter('marine', 0xd9b38c, 0xe6eef1, 0x315f8d, 'marine');
    this.makeCharacter('npc-tavern', 0xb87958, 0x6f3c2d, 0xd6aa55, 'tavern');
    this.makeCharacter('npc-harbor', 0xb99162, 0x314c5a, 0xc49c5f, 'harbor');
    this.makeCharacter('npc-provisioner', 0x8e664e, 0x4f6f4f, 0xc9b070, 'provisioner');
    this.makeCharacter('npc-shipwright', 0x9c7158, 0x4d5150, 0xb8773d, 'shipwright');
    this.makeCharacter('npc-dockhand', 0x9f6e4f, 0x40515a, 0x7c8c93, 'dockhand');
    this.makeCharacter('npc-sailor', 0xc28b67, 0x5b4635, 0x3c6d83, 'sailor');
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
    const bodyX = role === 'fighter' ? 10 : role === 'navigator' ? 18 : 15;
    const bodyW = role === 'fighter' ? 52 : role === 'navigator' ? 36 : 42;
    const legW = role === 'fighter' ? 16 : 14;
    g.fillStyle(0x27231f, 1).fillRoundedRect(19, 75, legW, 23, 4).fillRoundedRect(53 - legW, 75, legW, 23, 4);
    g.fillStyle(cloth, 1).fillRoundedRect(bodyX, 45, bodyW, 37, 8);
    g.fillStyle(accent, 1).fillRect(18, 65, 36, 7);
    g.fillStyle(skin, 1).fillCircle(36, 32, 14);
    g.fillRoundedRect(7, 48, 12, 28, 5).fillRoundedRect(53, 48, 12, 28, 5);

    if (role === 'captain') {
      g.fillStyle(0x15181d, 1).fillEllipse(36, 23, 39, 17);
      g.lineStyle(3, 0xd8b45f, 1).strokeEllipse(36, 23, 41, 19);
      g.fillStyle(0x8e2430, 1).fillTriangle(15, 52, 3, 90, 27, 78).fillTriangle(57, 52, 69, 90, 45, 78);
    } else if (role === 'navigator') {
      g.fillStyle(0x3a241f, 1).fillEllipse(36, 22, 38, 24);
      g.fillRoundedRect(19, 22, 8, 27, 4).fillRoundedRect(46, 22, 8, 27, 4);
      g.fillStyle(0x27374b, 1).fillEllipse(36, 20, 31, 13);
      g.lineStyle(3, 0xd2b274, 1).strokeCircle(60, 57, 8);
    } else if (role === 'fighter') {
      g.fillStyle(0x17191b, 1).fillEllipse(36, 23, 40, 19);
      g.fillStyle(0x9d6b4b, 1).fillRoundedRect(10, 47, 9, 31, 4).fillRoundedRect(53, 47, 9, 31, 4);
      g.lineStyle(4, 0xbfc6ca, 1);
      g.beginPath().moveTo(10, 60).lineTo(1, 78).lineTo(8, 88).strokePath();
      g.beginPath().moveTo(62, 60).lineTo(71, 78).lineTo(64, 88).strokePath();
    } else if (role === 'medic') {
      g.fillStyle(0x3c2a25, 1).fillEllipse(36, 22, 34, 20);
      g.fillStyle(0x3c2a25, 1).fillRoundedRect(49, 22, 7, 28, 3);
      g.fillStyle(0xe7efe5, 1).fillRoundedRect(18, 48, 36, 31, 6);
      g.fillStyle(0xa64545, 1).fillRect(33, 54, 6, 18).fillRect(27, 60, 18, 6);
      g.fillStyle(0x6d4936, 1).fillRoundedRect(51, 57, 13, 22, 3);
    } else if (role === 'specialist') {
      g.fillStyle(0x2b2421, 1).fillEllipse(36, 22, 35, 18);
      g.fillStyle(0xb58b56, 1).fillRoundedRect(13, 53, 10, 28, 3);
      g.lineStyle(3, 0xc9d4d7, 1).strokeCircle(58, 60, 7);
    } else if (role === 'marine') {
      g.fillStyle(0xf6f8f9, 1).fillEllipse(36, 21, 38, 15);
      g.fillStyle(0x315f8d, 1).fillRect(17, 25, 38, 6);
    } else if (role === 'tavern') {
      g.fillStyle(0x3b241b, 1).fillEllipse(36, 22, 35, 20);
      g.fillStyle(0xe5d0a2, 1).fillRoundedRect(23, 53, 26, 28, 4);
      g.fillStyle(0x7f5431, 1).fillCircle(58, 61, 5);
    } else if (role === 'harbor') {
      g.fillStyle(0x24343c, 1).fillEllipse(36, 22, 36, 16);
      g.fillStyle(0xc49c5f, 1).fillRect(20, 27, 32, 5);
      g.lineStyle(3, 0xe4d2a9, 1).strokeRoundedRect(52, 55, 12, 16, 2);
    } else if (role === 'provisioner') {
      g.fillStyle(0x6e5434, 1).fillTriangle(18, 24, 54, 24, 36, 9);
      g.fillStyle(0x8b633a, 1).fillRoundedRect(48, 49, 15, 31, 4);
      g.lineStyle(2, 0xd3b77a, 1).strokeRoundedRect(48, 49, 15, 31, 4);
    } else if (role === 'shipwright') {
      g.fillStyle(0x7a3a28, 1).fillRect(18, 19, 36, 7);
      g.fillStyle(0x46362b, 1).fillRect(55, 52, 5, 31);
      g.fillStyle(0xb8773d, 1).fillRoundedRect(50, 48, 16, 8, 2);
    } else if (role === 'dockhand') {
      g.fillStyle(0x60422f, 1).fillEllipse(36, 22, 31, 16);
      g.lineStyle(3, 0x9ca8ad, 1).strokeLineShape(new Phaser.Geom.Line(60, 49, 66, 80));
    } else if (role === 'sailor') {
      g.fillStyle(0xe6dfcf, 1).fillEllipse(36, 21, 36, 14);
      g.fillStyle(0x3c6d83, 1).fillRect(18, 24, 36, 5);
      g.fillStyle(0x8b2f35, 1).fillTriangle(12, 54, 4, 73, 22, 68);
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
