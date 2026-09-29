import Phaser from 'phaser';
import type { CrewState } from '../state/types';

interface CrewHealthSnapshot {
  id: CrewState['id'];
  name: string;
  hp: number;
  maxHp: number;
}

export class CrewStatusHud {
  private readonly container: Phaser.GameObjects.Container;
  private readonly panel: Phaser.GameObjects.Graphics;
  private readonly title: Phaser.GameObjects.Text;
  private readonly nameTexts: Phaser.GameObjects.Text[] = [];
  private readonly hpTexts: Phaser.GameObjects.Text[] = [];
  private readonly bars: Phaser.GameObjects.Graphics[] = [];

  constructor(
    private readonly scene: Phaser.Scene,
    x = 14,
    y = 84,
  ) {
    this.panel = scene.add.graphics();
    this.panel.fillStyle(0x071116, 0.86).fillRoundedRect(0, 0, 196, 76, 9);
    this.panel.lineStyle(1, 0x9db3ba, 0.24).strokeRoundedRect(0, 0, 196, 76, 9);

    this.title = scene.add.text(9, 7, 'CREW', {
      fontFamily: 'system-ui, sans-serif',
      fontSize: '10px',
      fontStyle: 'bold',
      color: '#b7c8cd',
    });

    for (let i = 0; i < 2; i += 1) {
      const rowY = 23 + i * 24;
      const name = scene.add.text(9, rowY, '', {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '10px',
        fontStyle: 'bold',
        color: '#edf4f6',
      });
      const hp = scene.add.text(187, rowY, '', {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '9px',
        color: '#d5e1e5',
      }).setOrigin(1, 0);
      const bar = scene.add.graphics();

      this.nameTexts.push(name);
      this.hpTexts.push(hp);
      this.bars.push(bar);
    }

    this.container = scene.add.container(x, y, [
      this.panel,
      this.title,
      ...this.nameTexts,
      ...this.hpTexts,
      ...this.bars,
    ]).setScrollFactor(0).setDepth(2600);

    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.destroy());
  }

  update(crew: CrewHealthSnapshot[]): void {
    const visible = crew.slice(0, 2);
    for (let i = 0; i < 2; i += 1) {
      const member = visible[i];
      const name = this.nameTexts[i];
      const hpText = this.hpTexts[i];
      const bar = this.bars[i];
      if (!name || !hpText || !bar) continue;

      bar.clear();

      if (!member) {
        name.setVisible(false);
        hpText.setVisible(false);
        continue;
      }

      name.setVisible(true).setText(member.name.replace(' Quill', '').replace(' Vale', ''));
      hpText.setVisible(true).setText(`${Math.ceil(member.hp)}/${member.maxHp}`);

      const pct = Phaser.Math.Clamp(member.hp / Math.max(1, member.maxHp), 0, 1);
      const rowY = 37 + i * 24;
      bar.fillStyle(0x1d2c32, 0.95).fillRoundedRect(9, rowY, 178, 6, 3);

      const fill = member.hp <= 0
        ? 0x667074
        : pct > 0.55
          ? 0x79bf8b
          : pct > 0.25
            ? 0xd0a45e
            : 0xc76a62;
      bar.fillStyle(fill, 1).fillRoundedRect(9, rowY, 178 * pct, 6, 3);

      if (member.hp <= 0) {
        hpText.setText('DOWN').setColor('#ffd3ca');
        name.setColor('#ffd3ca');
      } else {
        hpText.setColor('#d5e1e5');
        name.setColor('#edf4f6');
      }
    }
  }

  setPosition(x: number, y: number): void {
    this.container.setPosition(x, y);
  }

  setVisible(visible: boolean): void {
    this.container.setVisible(visible);
  }

  destroy(): void {
    this.container.destroy(true);
  }
}
