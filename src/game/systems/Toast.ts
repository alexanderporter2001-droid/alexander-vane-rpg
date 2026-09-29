import Phaser from 'phaser';

export class Toast {
  private root: HTMLDivElement;
  private hideTimer: number | null = null;

  constructor(private scene: Phaser.Scene) {
    this.root = document.createElement('div');
    this.root.className = 'game-toast';
    this.root.setAttribute('role', 'status');
    this.root.setAttribute('aria-live', 'polite');
    document.body.append(this.root);

    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.destroy());
  }

  show(message: string, ms = 2200): void {
    if (this.hideTimer !== null) {
      window.clearTimeout(this.hideTimer);
      this.hideTimer = null;
    }

    this.root.textContent = message;
    this.root.classList.add('is-visible');

    this.hideTimer = window.setTimeout(() => {
      this.root.classList.remove('is-visible');
      this.hideTimer = null;
    }, ms);
  }

  destroy(): void {
    if (this.hideTimer !== null) {
      window.clearTimeout(this.hideTimer);
      this.hideTimer = null;
    }
    this.root.remove();
  }
}
