import Phaser from 'phaser';

export interface MobileActions {
  primary: () => void;
  secondary: () => void;
  dash: () => void;
  interact: () => void;
  order?: () => void;
  pause: () => void;
}

export class MobileControls {
  readonly move = new Phaser.Math.Vector2();

  private root: Phaser.GameObjects.Container;
  private stickBase: Phaser.GameObjects.Arc;
  private stickNub: Phaser.GameObjects.Arc;
  private stickPointerId: number | null = null;
  private attack: Phaser.GameObjects.Container;
  private secondary: Phaser.GameObjects.Container;
  private dash: Phaser.GameObjects.Container;
  private interact: Phaser.GameObjects.Container;
  private interactText: Phaser.GameObjects.Text;
  private order?: Phaser.GameObjects.Container;
  private pause: Phaser.GameObjects.Text;

  constructor(private scene: Phaser.Scene, private actions: MobileActions) {
    this.root = scene.add.container(0, 0).setScrollFactor(0).setDepth(3000);

    this.stickBase = scene.add.circle(92, 92, 58, 0xddebf0, 0.11)
      .setStrokeStyle(2, 0xddebf0, 0.24)
      .setInteractive();
    this.stickNub = scene.add.circle(92, 92, 23, 0xe8f0f3, 0.32);
    this.root.add([this.stickBase, this.stickNub]);

    this.stickBase.on('pointerdown', (p: Phaser.Input.Pointer) => {
      this.stickPointerId = p.id;
      this.updateStick(p);
    });
    scene.input.on('pointermove', (p: Phaser.Input.Pointer) => {
      if (p.isDown && p.id === this.stickPointerId) this.updateStick(p);
    });
    scene.input.on('pointerup', (p: Phaser.Input.Pointer) => {
      if (p.id === this.stickPointerId) this.resetStick();
    });

    this.attack = this.makeButton('ATTACK', actions.primary, 76, 0xd8b45f);
    this.secondary = this.makeButton('PULL', actions.secondary, 68, 0x79bfd3);
    this.dash = this.makeButton('DASH', actions.dash, 62, 0xb2c2ca);
    this.interact = this.makeButton('INTERACT', actions.interact, 68, 0x78c690);
    this.interactText = this.interact.getAt(1) as Phaser.GameObjects.Text;

    if (actions.order) this.order = this.makeButton('ORDER', actions.order, 58, 0xc89ac8);
    this.root.add([this.attack, this.secondary, this.dash, this.interact]);
    if (this.order) this.root.add(this.order);

    this.pause = scene.add.text(0, 0, '☰', {
      fontFamily: 'system-ui, sans-serif',
      fontSize: '28px',
      color: '#edf4f6',
      backgroundColor: '#071116cc',
      padding: { x: 12, y: 7 },
    }).setOrigin(1, 0).setInteractive({ useHandCursor: true });
    this.pause.on('pointerdown', actions.pause);
    this.root.add(this.pause);

    this.layout();
    this.setInteract(null);
    scene.scale.on('resize', this.layout, this);
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      scene.scale.off('resize', this.layout, this);
      scene.input.off('pointermove');
      scene.input.off('pointerup');
    });
  }

  setInteract(label: string | null): void {
    this.interact.setVisible(Boolean(label));
    if (label) this.interactText.setText(label.toUpperCase());
  }

  setCombatVisible(visible: boolean): void {
    this.attack.setVisible(visible);
    this.secondary.setVisible(visible);
    this.dash.setVisible(visible);
    this.order?.setVisible(visible);
  }

  destroy(): void {
    this.root.destroy(true);
  }

  private makeButton(label: string, action: () => void, diameter: number, accent: number): Phaser.GameObjects.Container {
    const circle = this.scene.add.circle(0, 0, diameter / 2, 0x172832, 0.92)
      .setStrokeStyle(2, accent, 0.55)
      .setInteractive({ useHandCursor: true });
    const text = this.scene.add.text(0, 0, label, {
      fontFamily: 'system-ui, sans-serif',
      fontSize: label.length > 7 ? '10px' : '11px',
      fontStyle: 'bold',
      color: '#f2f6f7',
      align: 'center',
    }).setOrigin(0.5);
    const c = this.scene.add.container(0, 0, [circle, text]);
    circle.on('pointerdown', () => {
      c.setScale(0.92);
      action();
    });
    circle.on('pointerup', () => c.setScale(1));
    circle.on('pointerout', () => c.setScale(1));
    return c;
  }

  private layout(): void {
    const w = this.scene.scale.width;
    const h = this.scene.scale.height;
    const safeBottom = 24;

    this.stickBase.setPosition(92, h - 112 - safeBottom);
    this.stickNub.setPosition(this.stickBase.x, this.stickBase.y);

    this.attack.setPosition(w - 76, h - 112 - safeBottom);
    this.secondary.setPosition(w - 150, h - 178 - safeBottom);
    this.dash.setPosition(w - 164, h - 92 - safeBottom);
    this.order?.setPosition(w - 76, h - 210 - safeBottom);
    this.interact.setPosition(w - 82, h - 286 - safeBottom);
    this.pause.setPosition(w - 18, 18);
  }

  private updateStick(pointer: Phaser.Input.Pointer): void {
    const center = new Phaser.Math.Vector2(this.stickBase.x, this.stickBase.y);
    const d = new Phaser.Math.Vector2(pointer.x - center.x, pointer.y - center.y);
    const max = 46;
    if (d.length() > max) d.setLength(max);
    this.stickNub.setPosition(center.x + d.x, center.y + d.y);
    this.move.set(d.x / max, d.y / max);
    if (this.move.length() > 1) this.move.normalize();
  }

  private resetStick(): void {
    this.stickPointerId = null;
    this.move.set(0, 0);
    this.stickNub.setPosition(this.stickBase.x, this.stickBase.y);
  }
}
