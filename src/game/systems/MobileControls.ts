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
  private nub: HTMLDivElement;
  private attack: HTMLButtonElement;
  private secondary: HTMLButtonElement;
  private dash: HTMLButtonElement;
  private interact: HTMLButtonElement;
  private order?: HTMLButtonElement;
  private pause: HTMLButtonElement;
  private pointerId: number | null = null;
  private visible = true;
  private combatVisible = true;
  private interactLabel: string | null = null;
  private cleanups: Array<() => void> = [];

  constructor(scene: Phaser.Scene, actions: MobileActions) {
    this.root = document.createElement('div');
    this.root.className = 'mobile-controls';
    this.root.setAttribute('aria-label', 'Game controls');

    this.joystick = document.createElement('div');
    this.joystick.className = 'mobile-joystick';
    this.joystick.setAttribute('aria-label', 'Movement joystick');

    const base = document.createElement('div');
    base.className = 'mobile-joystick-base';

    this.nub = document.createElement('div');
    this.nub.className = 'mobile-joystick-nub';

    this.joystick.append(base, this.nub);
    this.root.append(this.joystick);

    this.attack = this.makeButton('ATTACK', 'attack', actions.primary, 390);
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

    this.refreshVisibility();

    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.destroy());
  }

  setInteract(label: string | null): void {
    this.interactLabel = label;
    if (label) this.interact.textContent = label.toUpperCase();
    this.refreshVisibility();
  }

  setOrderLabel(label: string): void {
    if (this.order) this.order.textContent = label.toUpperCase();
  }

  setVisible(visible: boolean): void {
    this.visible = visible;
    this.root.style.display = visible ? 'block' : 'none';
    if (!visible) this.resetStick();
    else this.refreshVisibility();
  }

  setCombatVisible(visible: boolean): void {
    this.combatVisible = visible;
    this.refreshVisibility();
  }

  destroy(): void {
    this.resetStick();
    this.cleanups.forEach((cleanup) => cleanup());
    this.cleanups = [];
    this.joystick.removeEventListener('pointerdown', this.onStickDown);
    this.joystick.removeEventListener('pointermove', this.onStickMove);
    this.joystick.removeEventListener('pointerup', this.onStickEnd);
    this.joystick.removeEventListener('pointercancel', this.onStickEnd);
    this.joystick.removeEventListener('lostpointercapture', this.onStickEnd);
    this.root.remove();
  }

  private refreshVisibility(): void {
    if (!this.visible) return;

    const combatDisplay = this.combatVisible ? 'flex' : 'none';
    this.attack.style.display = combatDisplay;
    this.secondary.style.display = combatDisplay;
    this.dash.style.display = combatDisplay;

    this.interact.style.display = this.interactLabel ? 'flex' : 'none';

    if (this.order) {
      this.order.style.display = this.combatVisible && !this.interactLabel ? 'flex' : 'none';
    }
  }

  private makeButton(
    label: string,
    className: string,
    action: () => void,
    repeatMs?: number,
  ): HTMLButtonElement {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = `mobile-action mobile-${className}`;
    button.textContent = label;
    button.setAttribute('aria-label', label);

    let repeatId: number | null = null;

    const clearRepeat = () => {
      if (repeatId !== null) {
        window.clearInterval(repeatId);
        repeatId = null;
      }
    };

    const trigger = (event: PointerEvent) => {
      event.preventDefault();
      event.stopPropagation();
      button.classList.add('is-pressed');
      action();

      if (repeatMs && repeatId === null) {
        repeatId = window.setInterval(action, repeatMs);
      }
    };

    const release = (event: PointerEvent) => {
      event.preventDefault();
      event.stopPropagation();
      button.classList.remove('is-pressed');
      clearRepeat();
    };

    button.addEventListener('pointerdown', trigger);
    button.addEventListener('pointerup', release);
    button.addEventListener('pointercancel', release);
    button.addEventListener('pointerleave', release);
    this.cleanups.push(clearRepeat);
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
      // Pointer capture is helpful but not required for movement.
    }
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
    const rect = this.joystick.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    let dx = event.clientX - centerX;
    let dy = event.clientY - centerY;

    const max = 56;
    const length = Math.hypot(dx, dy);
    if (length > max && length > 0) {
      dx = (dx / length) * max;
      dy = (dy / length) * max;
    }

    this.nub.style.transform = `translate(${dx}px, ${dy}px)`;
    this.move.set(dx / max, dy / max);

    if (this.move.length() > 1) this.move.normalize();
    if (this.move.length() < 0.08) this.move.set(0, 0);
  }

  private resetStick(): void {
    this.pointerId = null;
    this.move.set(0, 0);
    this.nub.style.transform = 'translate(0px, 0px)';
  }
}
