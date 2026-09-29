import Phaser from 'phaser';
import { SaveManager } from '../state/SaveManager';

export class OpeningScene extends Phaser.Scene {
  constructor() { super('OpeningScene'); }

  create(): void {
    const { width, height } = this.scale;
    this.cameras.main.setBackgroundColor('#071116');

    this.add.text(width / 2, Math.max(64, height * 0.14), 'HARROW ISLAND · 17:24', {
      fontFamily: 'system-ui, sans-serif',
      fontSize: '13px',
      color: '#9fb9c3',
      letterSpacing: 2,
    }).setOrigin(0.5);

    this.add.text(width / 2, height * 0.28, 'GET TO THE GULL', {
      fontFamily: 'Georgia, serif',
      fontSize: width < 600 ? '34px' : '48px',
      color: '#f1e6ca',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    const body = [
      'You swallowed the unknown blue spiral Devil Fruit during the escape.',
      '',
      'Marine patrols are sweeping the docks. They do not begin the scene attacking you.',
      '',
      'Sera says the Wayward Gull is northeast. Rowan will cover you if things turn ugly.',
      '',
      'You can avoid the patrols, fight them, or experiment with the pulling force you just discovered.',
    ].join('\n');

    this.add.text(width / 2, height * 0.49, body, {
      fontFamily: 'system-ui, sans-serif',
      fontSize: width < 600 ? '15px' : '17px',
      color: '#d7e2e6',
      lineSpacing: 8,
      align: 'center',
      wordWrap: { width: Math.min(720, width - 48) },
    }).setOrigin(0.5);

    const button = this.add.text(width / 2, Math.min(height - 92, height * 0.76), 'BEGIN THE ESCAPE', {
      fontFamily: 'system-ui, sans-serif',
      fontSize: '15px',
      fontStyle: 'bold',
      color: '#071116',
      backgroundColor: '#d8b45f',
      padding: { x: 22, y: 14 },
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    button.on('pointerdown', () => {
      const save = SaveManager.get();
      save.world.flags.openingSeen = true;
      save.world.scene = 'harrow';
      SaveManager.save();
      this.scene.start('HarrowScene');
    });
  }
}
