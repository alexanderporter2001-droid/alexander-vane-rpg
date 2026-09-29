import Phaser from 'phaser';

export interface MobileActions {
  primary: () => void;
  secondary: () => void;
  dash: () => void;
  interact: () => void;
  order?: () => void;
  pause: () => void;
}

export function shouldUseMobileControls(): boolean {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') return false;
  const coarsePointer = typeof window.matchMedia === 'function'
    ? window.matchMedia('(pointer: coarse)').matches
    : false;
  return navigator.maxTouchPoints > 0 || coarsePointer || window.innerWidth <= 900;
}

export class MobileControls {
  readonly move = new Phaser.Math.Vector2();

  private root: Phaser.GameObjects.Container;
  private stickZone: Phaser.GameObjects.Zone;
  private stickBase: Phaser.GameObjects.Arc;
  private stickNub: Phaser.GameObjects.Arc;
  private stickPointerId: number | null = null;
  private attack: Phaser.GameObjects.Container;
  private secondary: Phaser.GameObjects.Container;
  private dash: Phaser.GameObjects.Container;
  private interact: Phaser.GameObjects.Container;
  private interactText: Phaser.GameObjects.Text;
  private order?: Phaser.GameObjects.Container;
  private pause: Phaser.GameObjects.Container;

  private readonly pointerMoveHandler: (pointer: Phaser.Input.Pointer) => void;
  private readonly pointerUpHandler: (pointer: Phaser.Input.Pointer) => void;

  constructor(private scene: Phaser.Scene, private actions: MobileActions) {
    this.root = scene.add.container(0, 0).setScrollFactor(0).setDepth(3000);

    this.stickZone = scene.add.zone(92, 92, 190, 190).setInteractive();
    this.stickBase = scene.add.circle(92, 92, 62, 0xddebf0, 0.13)
      .setStrokeStyle(2, 0xddebf0, 0.32);
    this.stickNub = scene.add.circle(92, 92, 25, 0xe8f0f3, 0.42);
    this.root.add([this.stickZone, this.stickBase, this.stickNub]);

    this.stickZone.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      this.stickPointerId = pointer.id;
      this.updateStick(pointer);
    });

    this.pointerMoveHandler = (pointer: Phaser.Input.Pointer) => {
      if (pointer.isDown && pointer.id === this.stickPointerId) this.updateStick(pointer);
    };
    this.pointerUpHandler = (pointer: Phaser.Input.Pointer) => {
      if (pointer.id === this.stickPointerId) this.resetStick();
    };
    scene.input.on('pointermove', this.pointerMoveHandler);
    scene.input.on('pointerup', this.pointerUpHandler);

    this.attack = this.makeButton('ATTACK', actions.primary, 78, 0xd8b45f);
    this.secondary = this.makeButton('PULL', actions.secondary, 72, 0x79bfd3);
    this.dash = this.makeButton('DASH', actions.dash, 70, 0xb2c2ca);
    this.interact = this.makeButton('INTERACT', actions.interact, 74, 0x78c690);
    this.interactText = this.interact.getAt(2) as Phaser.GameObjects.Text;

    if (actions.order) this.order = this.makeButton('ORDER', actions.order, 66, 0xc89ac8);
    this.root.add([this.attack, this.secondary, this.dash, this.interact]);
    if (this.order) this.root.add(this.order);

    this.pause = this.makeButton('☰', actions.pause, 58, 0xa8c5ce);
    this.root.add(this.pause);

    this.layout();
    this.setInteract(null);
    scene.scale.on('resize', this.layout, this);
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      scene.scale.off('resize', this.layout, this);
      scene.input.off('pointermove', this.pointerMoveHandler);
      scene.input.off('pointerup', this.pointerUpHandler);
    });
  }

  setInteract(label: string | null): void {
    this.interact.setVisible(Boolean(label));
    if (label) this.interactText.setText(label.toUpperCase());
  }

  setVisible(visible: boolean): void {
    this.root.setVisible(visible);
    if (!visible) this.resetStick();
  }

  setCombatVisible(visible: boolean): void {
    this.attack.setVisible(visible);
    this.secondary.setVisible(visible);
    this.dash.setVisible(visible);
    this.order?.setVisible(visible);
  }

  destroy(): void {
    this.resetStick();
    this.root.destroy(true);
  }

  private makeButton(label: string, action: () => void, diameter: number, accent: number): Phaser.GameObjects.Container {
    const hit = this.scene.add.zone(0, 0, diameter + 30, diameter + 30).setInteractive();
    const circle = this.scene.add.circle(0, 0, diameter / 2, 0x172832, 0.94)
      .setStrokeStyle(2, accent, 0.72);
    const text = this.scene.add.text(0, 0, label, {
      fontFamily: 'system-ui, sans-serif',
      fontSize: label === '☰' ? '25px' : label.length > 7 ? '10px' : '11px',
      fontStyle: 'bold',
      color: '#f2f6f7',
      align: 'center',
    }).setOrigin(0.5);

    const container = this.scene.add.container(0, 0, [hit, circle, text]);
    hit.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      pointer.event?.preventDefault?.();
      container.setScale(0.92);
      action();
    });
    hit.on('pointerup', () => container.setScale(1));
    hit.on('pointerout', () => container.setScale(1));
    return container;
  }

  private layout(): void {
    const w = this.scene.scale.width;
    const h = this.scene.scale.height;
    const safeBottom = 34;
    const compact = w < 430;

    const stickX = compact ? 88 : 102;
    const stickY = h - (compact ? 118 : 126) - safeBottom;
    this.stickZone.setPosition(stickX, stickY);
    this.stickBase.setPosition(stickX, stickY);
    this.stickNub.setPosition(stickX, stickY);

    this.attack.setPosition(w - (compact ? 68 : 82), h - 118 - safeBottom);
    this.secondary.setPosition(w - (compact ? 142 : 160), h - 188 - safeBottom);
    this.dash.setPosition(w - (compact ? 154 : 174), h - 92 - safeBottom);
    this.order?.setPosition(w - (compact ? 70 : 84), h - 216 - safeBottom);
    this.interact.setPosition(w - (compact ? 76 : 88), h - 300 - safeBottom);
    this.pause.setPosition(w - 48, 50);
  }

  private updateStick(pointer: Phaser.Input.Pointer): void {
    pointer.event?.preventDefault?.();
    const center = new Phaser.Math.Vector2(this.stickBase.x, this.stickBase.y);
    const delta = new Phaser.Math.Vector2(pointer.x - center.x, pointer.y - center.y);
    const max = 50;
    if (delta.length() > max) delta.setLength(max);

    this.stickNub.setPosition(center.x + delta.x, center.y + delta.y);
    this.move.set(delta.x / max, delta.y / max);
    if (this.move.length() > 1) this.move.normalize();

    if (this.move.length() < 0.08) this.move.set(0, 0);
  }

  private resetStick(): void {
    this.stickPointerId = null;
    this.move.set(0, 0);
    this.stickNub.setPosition(this.stickBase.x, this.stickBase.y);
  }
}
