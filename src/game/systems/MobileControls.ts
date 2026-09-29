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

  private root: HTMLDivElement;
  private joystick: HTMLDivElement;
  private base: HTMLDivElement;
  private nub: HTMLDivElement;
  private attack: HTMLButtonElement;
  private secondary: HTMLButtonElement;
  private dash: HTMLButtonElement;
  private interact: HTMLButtonElement;
  private order?: HTMLButtonElement;
  private pause: HTMLButtonElement;
  private pointerId: number | null = null;
  private stickCenterX = 0;
  private stickCenterY = 0;
  private visible = true;

  constructor(scene: Phaser.Scene, actions: MobileActions) {
    this.root = document.createElement('div');
    this.root.className = 'mobile-controls';
    this.root.setAttribute('aria-label', 'Game controls');

    this.joystick = document.createElement('div');
    this.joystick.className = 'mobile-joystick-zone';
    this.joystick.setAttribute('aria-label', 'Movement area');

    this.base = document.createElement('div');
    this.base.className = 'mobile-joystick-base';

    this.nub = document.createElement('div');
    this.nub.className = 'mobile-joystick-nub';

    this.joystick.append(this.base, this.nub);
    this.root.append(this.joystick);

    this.attack = this.makeButton('ATTACK', 'attack', actions.primary);
    this.secondary = this.makeButton('PULL', 'pull', actions.secondary);
    this.dash = this.makeButton('DASH', 'dash', actions.dash);
    this.interact = this.makeButton('INTERACT', 'interact', actions.interact);

    if (actions.order) {
      this.order = this.makeButton('ORDER', 'order', actions.order);
    }

    this.pause = this.makeButton('☰', 'pause', actions.pause);

    this.root.append(this.attack, this.secondary, this.dash, this.interact);
    if (this.order) this.root.append(this.order);
    this.root.append(this.pause);

    document.body.append(this.root);

    this.joystick.addEventListener('pointerdown', this.onStickDown);
    this.joystick.addEventListener('pointermove', this.onStickMove);
    this.joystick.addEventListener('pointerup', this.onStickEnd);
    this.joystick.addEventListener('pointercancel', this.onStickEnd);
    this.joystick.addEventListener('lostpointercapture', this.onStickEnd);

    this.resetVisualCenter();
    this.setInteract(null);

    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.destroy());
  }

  setInteract(label: string | null): void {
    this.interact.style.display = label && this.visible ? 'flex' : 'none';
    if (label) this.interact.textContent = label.toUpperCase();
  }

  setVisible(visible: boolean): void {
    this.visible = visible;
    this.root.style.display = visible ? 'block' : 'none';
    if (!visible) this.resetStick();
  }

  setCombatVisible(visible: boolean): void {
    const display = visible ? 'flex' : 'none';
    this.attack.style.display = display;
    this.secondary.style.display = display;
    this.dash.style.display = display;
    if (this.order) this.order.style.display = display;
  }

  destroy(): void {
    this.resetStick();
    this.joystick.removeEventListener('pointerdown', this.onStickDown);
    this.joystick.removeEventListener('pointermove', this.onStickMove);
    this.joystick.removeEventListener('pointerup', this.onStickEnd);
    this.joystick.removeEventListener('pointercancel', this.onStickEnd);
    this.joystick.removeEventListener('lostpointercapture', this.onStickEnd);
    this.root.remove();
  }

  private makeButton(label: string, className: string, action: () => void): HTMLButtonElement {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = `mobile-action mobile-${className}`;
    button.textContent = label;
    button.setAttribute('aria-label', label);

    const trigger = (event: PointerEvent) => {
      event.preventDefault();
      event.stopPropagation();
      button.classList.add('is-pressed');
      action();
    };
    const release = (event: PointerEvent) => {
      event.preventDefault();
      event.stopPropagation();
      button.classList.remove('is-pressed');
    };

    button.addEventListener('pointerdown', trigger);
    button.addEventListener('pointerup', release);
    button.addEventListener('pointercancel', release);
    button.addEventListener('pointerleave', release);
    return button;
  }

  private onStickDown = (event: PointerEvent): void => {
    event.preventDefault();
    event.stopPropagation();
    if (this.pointerId !== null) return;

    this.pointerId = event.pointerId;

    try {
      this.joystick.setPointerCapture(event.pointerId);
    } catch {
      // Movement still works without pointer capture on browsers that reject it.
    }

    const rect = this.joystick.getBoundingClientRect();
    const margin = 62;
    const localX = Phaser.Math.Clamp(event.clientX - rect.left, margin, rect.width - margin);
    const localY = Phaser.Math.Clamp(event.clientY - rect.top, margin, rect.height - margin);

    this.stickCenterX = rect.left + localX;
    this.stickCenterY = rect.top + localY;
    this.base.style.left = `${localX}px`;
    this.base.style.top = `${localY}px`;
    this.nub.style.left = `${localX}px`;
    this.nub.style.top = `${localY}px`;
    this.joystick.classList.add('is-active');

    this.updateStick(event);
  };

  private onStickMove = (event: PointerEvent): void => {
    if (event.pointerId !== this.pointerId) return;
    event.preventDefault();
    event.stopPropagation();
    this.updateStick(event);
  };

  private onStickEnd = (event: PointerEvent): void => {
    if (this.pointerId !== null && event.pointerId !== this.pointerId) return;
    event.preventDefault();
    event.stopPropagation();
    this.resetStick();
  };

  private updateStick(event: PointerEvent): void {
    let dx = event.clientX - this.stickCenterX;
    let dy = event.clientY - this.stickCenterY;

    const max = 52;
    const length = Math.hypot(dx, dy);
    if (length > max && length > 0) {
      dx = (dx / length) * max;
      dy = (dy / length) * max;
    }

    this.nub.style.transform = `translate(-50%, -50%) translate(${dx}px, ${dy}px)`;
    this.move.set(dx / max, dy / max);

    if (this.move.length() > 1) this.move.normalize();
    if (this.move.length() < 0.1) this.move.set(0, 0);
  }

  private resetStick(): void {
    this.pointerId = null;
    this.move.set(0, 0);
    this.nub.style.transform = 'translate(-50%, -50%)';
    this.joystick.classList.remove('is-active');
    this.resetVisualCenter();
  }

  private resetVisualCenter(): void {
    const x = '46%';
    const y = '64%';
    this.base.style.left = x;
    this.base.style.top = y;
    this.nub.style.left = x;
    this.nub.style.top = y;
  }
}
