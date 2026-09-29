import Phaser from 'phaser';

export interface DialogueChoice {
  label: string;
  run: () => void;
  disabled?: boolean;
}

export interface DialogueOptions {
  speaker: string;
  text: string;
  choices?: DialogueChoice[];
  onClose?: () => void;
}

export class DialoguePanel {
  private root: Phaser.GameObjects.Container | null = null;
  private closeHandler: (() => void) | undefined;

  constructor(private scene: Phaser.Scene) {
    scene.scale.on('resize', this.onResize, this);
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      scene.scale.off('resize', this.onResize, this);
      this.close(false);
    });
  }

  isOpen(): boolean {
    return Boolean(this.root);
  }

  show(options: DialogueOptions): void {
    this.close(false);

    const choices = options.choices ?? [{ label: 'Close', run: () => undefined }];
    const width = Math.min(720, this.scene.scale.width - 24);
    const choiceHeight = 38;
    const bodyHeight = 118;
    const height = Math.min(
      this.scene.scale.height - 30,
      104 + bodyHeight + choices.length * choiceHeight,
    );

    const bg = this.scene.add.rectangle(0, 0, width, height, 0x071116, 0.97)
      .setStrokeStyle(2, 0xd8b45f, 0.62);

    const speaker = this.scene.add.text(-width / 2 + 20, -height / 2 + 16, options.speaker.toUpperCase(), {
      fontFamily: 'Georgia, serif',
      fontSize: '16px',
      fontStyle: 'bold',
      color: '#f1e6ca',
    });

    const body = this.scene.add.text(-width / 2 + 20, -height / 2 + 48, options.text, {
      fontFamily: 'system-ui, sans-serif',
      fontSize: this.scene.scale.width < 600 ? '13px' : '14px',
      color: '#e2ecef',
      lineSpacing: 5,
      wordWrap: { width: width - 40 },
    });

    const items: Phaser.GameObjects.GameObject[] = [bg, speaker, body];
    const startY = height / 2 - choices.length * choiceHeight - 12;

    choices.forEach((choice, index) => {
      const button = this.scene.add.text(
        -width / 2 + 20,
        startY + index * choiceHeight,
        choice.label,
        {
          fontFamily: 'system-ui, sans-serif',
          fontSize: '12px',
          fontStyle: 'bold',
          color: choice.disabled ? '#7b8a8f' : '#071116',
          backgroundColor: choice.disabled ? '#253138' : '#c9d7dc',
          padding: { x: 12, y: 8 },
        },
      );

      if (!choice.disabled) {
        button.setInteractive({ useHandCursor: true });
        button.on('pointerdown', () => {
          this.close();
          choice.run();
        });
      }
      items.push(button);
    });

    this.closeHandler = options.onClose;
    this.root = this.scene.add.container(
      this.scene.scale.width / 2,
      this.scene.scale.height - height / 2 - 14,
      items,
    ).setScrollFactor(0).setDepth(3600);

  }

  close(invokeHandler = true): void {
    if (!this.root) return;
    this.root.destroy(true);
    this.root = null;

    const handler = this.closeHandler;
    this.closeHandler = undefined;
    if (invokeHandler) handler?.();
  }

  private onResize(size: Phaser.Structs.Size): void {
    if (!this.root) return;
    const bounds = this.root.getBounds();
    this.root.setPosition(size.width / 2, size.height - bounds.height / 2 - 14);
  }
}
