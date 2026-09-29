import Phaser from 'phaser';
import { SaveManager } from '../state/SaveManager';

export class GameOverScene extends Phaser.Scene {
  constructor() { super('GameOverScene'); }

  create(): void {
    const save = SaveManager.get();
    const { width, height } = this.scale;
    this.cameras.main.setBackgroundColor('#050709');

    this.add.text(width / 2, height * 0.28, 'ALEXANDER VANE DIED', {
      fontFamily: 'Georgia, serif',
      fontSize: width < 600 ? '34px' : '50px',
      color: '#eed8d2',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    this.add.text(width / 2, height * 0.45, [
      `Day ${save.world.day} · ${save.world.locationId.replaceAll('-', ' ')}`,
      '',
      'This campaign is over.',
      'The simulation did not respawn Alexander or retcon the death.',
      '',
      'An older exported save can still be imported from the title screen if you choose to restore it externally.',
    ].join('\n'), {
      fontFamily: 'system-ui, sans-serif',
      fontSize: '14px',
      color: '#c8d4d8',
      align: 'center',
      lineSpacing: 6,
      wordWrap: { width: Math.min(650, width - 48) },
    }).setOrigin(0.5);

    this.makeButton('EXPORT FINAL SAVE', height * 0.68, () => this.exportSave());
    this.makeButton('TITLE SCREEN', height * 0.68 + 62, () => this.scene.start('TitleScene'), true);
  }

  private makeButton(label: string, y: number, run: () => void, secondary = false): void {
    const button = this.add.text(this.scale.width / 2, y, label, {
      fontFamily: 'system-ui, sans-serif',
      fontSize: '13px',
      fontStyle: 'bold',
      color: secondary ? '#dce8eb' : '#071116',
      backgroundColor: secondary ? '#16272f' : '#c99a83',
      padding: { x: 18, y: 12 },
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    button.on('pointerdown', run);
  }

  private exportSave(): void {
    const blob = new Blob([SaveManager.exportText()], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `alexander-vane-final-save-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }
}
