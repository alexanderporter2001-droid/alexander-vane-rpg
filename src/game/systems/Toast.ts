import Phaser from 'phaser';

export class Toast {
  private box: Phaser.GameObjects.Container;

  constructor(private scene: Phaser.Scene) {
    const bg = scene.add.rectangle(0, 0, 560, 54, 0x071116, 0.92).setStrokeStyle(1, 0xa8c5ce, 0.35);
    const text = scene.add.text(0, 0, '', {
      fontFamily: 'system-ui, sans-serif',
      fontSize: '14px',
      color: '#edf4f6',
      align: 'center',
      wordWrap: { width: 520 },
    }).setOrigin(0.5);
    this.box = scene.add.container(scene.scale.width / 2, 76, [bg, text])
      .setDepth(2000)
      .setScrollFactor(0)
      .setVisible(false);
    scene.scale.on('resize', this.onResize, this);
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => scene.scale.off('resize', this.onResize, this));
  }

  show(message: string, ms = 2200): void {
    const text = this.box.getAt(1) as Phaser.GameObjects.Text;
    text.setText(message);
    this.box.setVisible(true).setAlpha(1);
    this.scene.tweens.killTweensOf(this.box);
    this.scene.tweens.add({
      targets: this.box,
      alpha: 0,
      delay: ms,
      duration: 280,
      onComplete: () => this.box.setVisible(false),
    });
  }

  private onResize(size: Phaser.Structs.Size): void {
    this.box.setPosition(size.width / 2, 76);
  }
}
