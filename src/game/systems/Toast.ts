import Phaser from 'phaser';

export class Toast {
  private root: HTMLDivElement;
  private timer: number | null = null;

  constructor(scene: Phaser.Scene) {
    this.root = document.createElement('div');
    this.root.className = 'game-toast';
    this.root.setAttribute('role', 'status');
    this.root.setAttribute('aria-live', 'polite');
    document.body.append(this.root);

    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.destroy());
  }

  show(message: string, ms = 2200): void {
    if (this.timer !== null) window.clearTimeout(this.timer);

    this.root.textContent = message;
    this.root.classList.add('is-visible');

    this.timer = window.setTimeout(() => {
      this.root.classList.remove('is-visible');
      this.timer = null;
    }, ms);
  }

  destroy(): void {
    if (this.timer !== null) {
      window.clearTimeout(this.timer);
      this.timer = null;
    }
    this.root.remove();
  }
}
