import Phaser from 'phaser';
import { SaveManager } from '../state/SaveManager';
import { formatWorldTime } from '../systems/WorldClock';

interface PauseData { source: string }

export class PauseScene extends Phaser.Scene {
  private source = 'HarrowScene';
  private panel!: Phaser.GameObjects.Container;

  constructor() { super('PauseScene'); }

  create(data: PauseData): void {
    this.source = data.source || 'HarrowScene';
    const save = SaveManager.get();
    const { width, height } = this.scale;

    const shade = this.add.rectangle(0, 0, width, height, 0x020609, 0.86)
      .setOrigin(0)
      .setInteractive();

    const panelW = Math.min(760, width - 28);
    const panelH = Math.min(650, height - 50);
    const bg = this.add.rectangle(0, 0, panelW, panelH, 0x0c1820, 0.98)
      .setStrokeStyle(2, 0x7896a0, 0.42);

    const title = this.add.text(-panelW / 2 + 24, -panelH / 2 + 22, 'CAPTAIN’S JOURNAL', {
      fontFamily: 'Georgia, serif',
      fontSize: '28px',
      color: '#f1e6ca',
      fontStyle: 'bold',
    });

    const objective = save.journal.find((j) => j.known && j.id === (save.world.scene === 'harrow' ? 'harrow-escape' : 'fruit'));
    const crew = save.crew.map((c) => `${c.name} — ${c.role} · HP ${Math.ceil(c.hp)}/${c.maxHp}`).join('\n');
    const inventory = Object.entries(save.inventory).map(([k, v]) => `${k}: ${v}`).join('   ·   ');

    const body = this.add.text(-panelW / 2 + 24, -panelH / 2 + 78, [
      `${formatWorldTime(save)}   ·   ${save.world.locationId.replaceAll('-', ' ')}`,
      '',
      'CURRENT OBJECTIVE',
      objective ? `${objective.title}\n${objective.body}` : 'No immediate objective recorded.',
      '',
      'CREW',
      crew,
      '',
      'SHIP',
      `${save.ship.name} · Hull ${Math.ceil(save.ship.hull)}/${save.ship.maxHull} · Supplies ${Math.ceil(save.ship.supplies)}`,
      '',
      'INVENTORY',
      inventory || 'Empty',
      '',
      `Berries: ${save.player.berries.toLocaleString()}   ·   Bounty: ${save.player.bounty.toLocaleString()}`,
    ].join('\n'), {
      fontFamily: 'system-ui, sans-serif',
      fontSize: width < 600 ? '13px' : '15px',
      color: '#d9e4e7',
      lineSpacing: 5,
      wordWrap: { width: panelW - 48 },
    });

    const resume = this.makeButton('RESUME', -panelW / 2 + 24, panelH / 2 - 58, () => this.resumeGame());
    const saveButton = this.makeButton('SAVE', -panelW / 2 + 138, panelH / 2 - 58, () => {
      SaveManager.save();
      saveButton.setText('SAVED');
      this.time.delayedCall(900, () => saveButton.setText('SAVE'));
    });
    const exportButton = this.makeButton('EXPORT SAVE', -panelW / 2 + 232, panelH / 2 - 58, () => this.exportSave());

    this.panel = this.add.container(width / 2, height / 2, [bg, title, body, resume, saveButton, exportButton]).setDepth(100);
    shade.on('pointerdown', () => undefined);

    const keyboard = this.input.keyboard;
    keyboard?.once('keydown-ESC', () => this.resumeGame());
    this.scale.on('resize', this.onResize, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.scale.off('resize', this.onResize, this));
  }

  private makeButton(label: string, x: number, y: number, run: () => void): Phaser.GameObjects.Text {
    const b = this.add.text(x, y, label, {
      fontFamily: 'system-ui, sans-serif',
      fontSize: '12px',
      fontStyle: 'bold',
      color: '#071116',
      backgroundColor: '#c9d7dc',
      padding: { x: 13, y: 9 },
    }).setInteractive({ useHandCursor: true });
    b.on('pointerdown', run);
    return b;
  }

  private resumeGame(): void {
    this.scene.stop();
    this.scene.resume(this.source);
  }

  private exportSave(): void {
    const blob = new Blob([SaveManager.exportText()], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `alexander-vane-save-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  private onResize(size: Phaser.Structs.Size): void {
    this.panel.setPosition(size.width / 2, size.height / 2);
  }
}
