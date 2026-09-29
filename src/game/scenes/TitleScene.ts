import Phaser from 'phaser';
import { SaveManager } from '../state/SaveManager';
import { routeCampaign } from '../state/SceneRouter';

export class TitleScene extends Phaser.Scene {
  constructor() { super('TitleScene'); }

  create(): void {
    const { width, height } = this.scale;
    this.cameras.main.setBackgroundColor('#071116');

    const bg = this.add.graphics();
    bg.fillStyle(0x0c2632, 1).fillRect(0, 0, width, height);
    bg.fillStyle(0x16465a, 0.55).fillEllipse(width * 0.7, height * 0.35, width * 0.9, height * 0.6);
    bg.fillStyle(0x09161d, 0.72).fillRect(0, height * 0.72, width, height * 0.28);

    this.add.text(width / 2, Math.max(86, height * 0.18), 'ALEXANDER VANE', {
      fontFamily: 'Georgia, serif',
      fontSize: width < 600 ? '40px' : '58px',
      color: '#f1e6ca',
      fontStyle: 'bold',
      letterSpacing: 2,
    }).setOrigin(0.5);

    this.add.text(width / 2, Math.max(138, height * 0.18 + 58), 'LIVING PIRATE RPG', {
      fontFamily: 'system-ui, sans-serif',
      fontSize: '13px',
      color: '#9fc0ca',
      letterSpacing: 4,
    }).setOrigin(0.5);

    const hasSave = SaveManager.hasStoredSave();
    let y = height * 0.48;

    if (hasSave) {
      const save = SaveManager.load();
      const dead = Boolean(save.world.flags.alexanderDead || save.player.hp <= 0);
      this.add.text(width / 2, y - 74, [
        dead ? 'CAMPAIGN ENDED' : 'CAMPAIGN IN PROGRESS',
        `${save.world.locationId.replaceAll('-', ' ')} · Day ${save.world.day}`,
        `${save.player.berries.toLocaleString()} berries · ${save.ship.name} hull ${Math.ceil(save.ship.hull)}/${save.ship.maxHull}`,
      ].join('\n'), {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '13px',
        color: dead ? '#e4aaa0' : '#c9d8dc',
        align: 'center',
        lineSpacing: 5,
      }).setOrigin(0.5);

      this.makeButton(dead ? 'VIEW ENDED CAMPAIGN' : 'CONTINUE', y, () => {
        this.scene.start(routeCampaign(SaveManager.load()));
      });
      y += 62;
    }

    this.makeButton('NEW CAMPAIGN', y, () => this.confirmNewCampaign());
    y += 62;
    this.makeButton('IMPORT SAVE', y, () => this.pickSaveFile(), true);

    this.add.text(width / 2, height - 36, 'v0.3.5 · touch combat pass', {
      fontFamily: 'system-ui, sans-serif',
      fontSize: '11px',
      color: '#6f8992',
    }).setOrigin(0.5);
  }

  private makeButton(label: string, y: number, run: () => void, secondary = false): void {
    const { width } = this.scale;
    const button = this.add.text(width / 2, y, label, {
      fontFamily: 'system-ui, sans-serif',
      fontSize: '14px',
      fontStyle: 'bold',
      color: secondary ? '#dce8eb' : '#071116',
      backgroundColor: secondary ? '#18313dcc' : '#d8b45f',
      padding: { x: 22, y: 14 },
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    button.on('pointerdown', run);
  }

  private confirmNewCampaign(): void {
    if (!SaveManager.hasStoredSave()) {
      SaveManager.startNew();
      this.scene.start('OpeningScene');
      return;
    }

    const { width, height } = this.scale;
    const blocker = this.add.rectangle(width / 2, height / 2, width, height, 0x020609, 0.88)
      .setDepth(100)
      .setInteractive();

    const panel = this.add.rectangle(width / 2, height / 2, Math.min(560, width - 34), 250, 0x0c1820, 1)
      .setStrokeStyle(2, 0xb68d52, 0.7)
      .setDepth(101);

    const copy = this.add.text(width / 2, height / 2 - 62, [
      'START A NEW CAMPAIGN?',
      '',
      'This replaces the browser save.',
      'Export the current save first if you want to keep it.',
    ].join('\n'), {
      fontFamily: 'system-ui, sans-serif',
      fontSize: '14px',
      color: '#e6eef0',
      align: 'center',
      lineSpacing: 5,
    }).setOrigin(0.5).setDepth(102);

    const yes = this.add.text(width / 2 - 84, height / 2 + 70, 'START NEW', {
      fontFamily: 'system-ui, sans-serif',
      fontSize: '12px',
      fontStyle: 'bold',
      color: '#071116',
      backgroundColor: '#d8b45f',
      padding: { x: 15, y: 11 },
    }).setOrigin(0.5).setDepth(102).setInteractive({ useHandCursor: true });

    const no = this.add.text(width / 2 + 90, height / 2 + 70, 'CANCEL', {
      fontFamily: 'system-ui, sans-serif',
      fontSize: '12px',
      fontStyle: 'bold',
      color: '#dce8eb',
      backgroundColor: '#21333bcc',
      padding: { x: 15, y: 11 },
    }).setOrigin(0.5).setDepth(102).setInteractive({ useHandCursor: true });

    const close = () => {
      blocker.destroy();
      panel.destroy();
      copy.destroy();
      yes.destroy();
      no.destroy();
    };

    no.on('pointerdown', close);
    yes.on('pointerdown', () => {
      SaveManager.startNew();
      this.scene.start('OpeningScene');
    });
  }

  private pickSaveFile(): void {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json,application/json';
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return;
      try {
        SaveManager.importText(await file.text());
        this.scene.restart();
      } catch {
        this.showError('That file is not a valid Alexander Vane campaign save.');
      }
    };
    input.click();
  }

  private showError(message: string): void {
    const { width, height } = this.scale;
    const text = this.add.text(width / 2, height - 92, message, {
      fontFamily: 'system-ui, sans-serif',
      fontSize: '12px',
      color: '#ffd0c7',
      backgroundColor: '#321b1bdd',
      padding: { x: 12, y: 9 },
      align: 'center',
      wordWrap: { width: Math.min(560, width - 40) },
    }).setOrigin(0.5).setDepth(200);
    this.time.delayedCall(3000, () => text.destroy());
  }
}
