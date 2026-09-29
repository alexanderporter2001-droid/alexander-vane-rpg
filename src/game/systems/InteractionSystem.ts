import Phaser from 'phaser';

type Coordinate = number | (() => number);

export interface Interaction {
  id: string;
  x: Coordinate;
  y: Coordinate;
  radius: number;
  label: string;
  enabled?: () => boolean;
  run: () => void;
}

export class InteractionSystem {
  private items: Interaction[] = [];
  private current: Interaction | null = null;

  constructor(private player: Phaser.Physics.Arcade.Sprite) {}

  register(item: Interaction): void {
    this.items.push(item);
  }

  update(): Interaction | null {
    let best: Interaction | null = null;
    let bestDistance = Infinity;

    for (const item of this.items) {
      if (item.enabled && !item.enabled()) continue;

      const x = typeof item.x === 'function' ? item.x() : item.x;
      const y = typeof item.y === 'function' ? item.y() : item.y;
      const d = Phaser.Math.Distance.Between(this.player.x, this.player.y, x, y);

      if (d <= item.radius && d < bestDistance) {
        best = item;
        bestDistance = d;
      }
    }

    this.current = best;
    return best;
  }

  trigger(): boolean {
    if (!this.current) return false;
    this.current.run();
    return true;
  }

  label(): string | null {
    return this.current?.label ?? null;
  }
}
