import Phaser from 'phaser';
import { SaveManager } from '../state/SaveManager';
import { MobileControls } from '../systems/MobileControls';
import { Toast } from '../systems/Toast';
import { advanceWorldClock, formatWorldTime } from '../systems/WorldClock';

interface Port {
  id: 'harrow' | 'gullrock';
  name: string;
  x: number;
  y: number;
  radius: number;
}

export class SeaScene extends Phaser.Scene {
  private readonly worldW = 4200;
  private readonly worldH = 3200;
  private readonly ports: Port[] = [
    { id: 'harrow', name: 'Harrow Island', x: 760, y: 1760, radius: 260 },
    { id: 'gullrock', name: 'Gullrock Port', x: 2790, y: 760, radius: 280 },
  ];

  private ship!: Phaser.Physics.Arcade.Sprite;
  private keys!: Record<string, Phaser.Input.Keyboard.Key>;
  private mobile?: MobileControls;
  private toast!: Toast;
  private hud!: Phaser.GameObjects.Text;
  private nav!: Phaser.GameObjects.Text;
  private wake!: Phaser.GameObjects.Particles.ParticleEmitter;
  private speed = 0;
  private heading = -Math.PI / 2;
  private lastSaveAt = 0;
  private nearestPort: Port | null = null;

  constructor() { super('SeaScene'); }

  create(): void {
    const save = SaveManager.get();
    save.world.scene = 'sea';
    save.world.locationId = 'east-blue-open-sea';

    this.physics.world.setBounds(0, 0, this.worldW, this.worldH);
    this.cameras.main.setBounds(0, 0, this.worldW, this.worldH);
    this.drawSea();

    this.ship = this.physics.add.sprite(save.ship.x, save.ship.y, 'wayward-gull')
      .setDepth(50)
      .setCollideWorldBounds(true)
      .setScale(0.85);
    this.ship.setBodySize(54, 94).setOffset(31, 52);

    this.speed = save.ship.speed;
    this.heading = save.ship.heading;
    this.ship.setRotation(this.heading + Math.PI / 2);

    this.createInput();
    this.toast = new Toast(this);
    this.createHud();

    if (this.sys.game.device.input.touch) {
      this.mobile = new MobileControls(this, {
        primary: () => undefined,
        secondary: () => undefined,
        dash: () => undefined,
        interact: () => this.tryDock(),
        pause: () => this.pauseGame(),
      });
      this.mobile.setCombatVisible(false);
    }

    this.cameras.main.startFollow(this.ship, true, 0.08, 0.08);
    this.cameras.main.setZoom(this.scale.width < 700 ? 0.82 : 0.95);

    this.toast.show('Sera: Gullrock lies northeast. Hold a heading; the sea is actual distance now.', 3300);

    const particles = this.add.particles(0, 0, 'bullet', {
      speed: { min: 8, max: 24 },
      lifespan: 500,
      alpha: { start: 0.3, end: 0 },
      scale: { start: 0.45, end: 0.05 },
      frequency: 90,
      follow: this.ship,
      followOffset: { x: 0, y: 62 },
      tint: 0xb8e2ec,
    });
    this.wake = particles;
  }

  update(_time: number, deltaMs: number): void {
    const dt = Math.min(0.033, deltaMs / 1000);
    const save = SaveManager.get();
    advanceWorldClock(save, dt, 5.5);

    this.updateShip(dt);
    this.updateNavigation();
    this.updateHud();

    save.ship.x = this.ship.x;
    save.ship.y = this.ship.y;
    save.ship.heading = this.heading;
    save.ship.speed = this.speed;

    if (this.time.now - this.lastSaveAt >= 20_000) {
      SaveManager.save();
      this.lastSaveAt = this.time.now;
    }
  }

  private createInput(): void {
    const kb = this.input.keyboard;
    if (!kb) throw new Error('Keyboard input unavailable');

    this.keys = kb.addKeys({
      left: 'A',
      right: 'D',
      up: 'W',
      down: 'S',
      left2: Phaser.Input.Keyboard.KeyCodes.LEFT,
      right2: Phaser.Input.Keyboard.KeyCodes.RIGHT,
      up2: Phaser.Input.Keyboard.KeyCodes.UP,
      down2: Phaser.Input.Keyboard.KeyCodes.DOWN,
      dock: 'F',
      pause: Phaser.Input.Keyboard.KeyCodes.ESC,
    }) as Record<string, Phaser.Input.Keyboard.Key>;

    this.keys.dock.on('down', () => this.tryDock());
    this.keys.pause.on('down', () => this.pauseGame());
  }

  private updateShip(dt: number): void {
    const mobileX = this.mobile?.move.x ?? 0;
    const mobileY = this.mobile?.move.y ?? 0;

    const turn =
      (this.keys.right?.isDown || this.keys.right2?.isDown ? 1 : 0) -
      (this.keys.left?.isDown || this.keys.left2?.isDown ? 1 : 0) +
      mobileX;

    const throttle =
      (this.keys.up?.isDown || this.keys.up2?.isDown ? 1 : 0) -
      (this.keys.down?.isDown || this.keys.down2?.isDown ? 1 : 0) -
      mobileY;

    const steerStrength = Phaser.Math.Clamp(Math.abs(this.speed) / 125 + 0.28, 0.28, 1);
    this.heading += Phaser.Math.Clamp(turn, -1, 1) * 1.35 * steerStrength * dt;

    if (throttle > 0.05) this.speed += 78 * throttle * dt;
    else if (throttle < -0.05) this.speed += 100 * throttle * dt;
    else this.speed *= Math.pow(0.992, dt * 60);

    this.speed = Phaser.Math.Clamp(this.speed, -48, 205);

    const vx = Math.cos(this.heading) * this.speed;
    const vy = Math.sin(this.heading) * this.speed;
    this.ship.setVelocity(vx, vy);
    this.ship.setRotation(this.heading + Math.PI / 2);

    if (this.ship.x < 35 || this.ship.x > this.worldW - 35 || this.ship.y < 35 || this.ship.y > this.worldH - 35) {
      this.speed *= 0.45;
    }

    const inReef = this.isInReef(this.ship.x, this.ship.y);
    if (inReef && Math.abs(this.speed) > 80) {
      const save = SaveManager.get();
      save.ship.hull = Math.max(0, save.ship.hull - 8 * dt);
      this.speed *= 0.97;
      if (Math.random() < 0.025) this.cameras.main.shake(70, 0.003);
    }
  }

  private updateNavigation(): void {
    let best: { port: Port; d: number } | null = null;
    for (const port of this.ports) {
      const d = Phaser.Math.Distance.Between(this.ship.x, this.ship.y, port.x, port.y);
      if (!best || d < best.d) best = { port, d };
    }
    this.nearestPort = best?.port ?? null;

    const gullrock = this.ports[1];
    if (gullrock) {
      const d = Phaser.Math.Distance.Between(this.ship.x, this.ship.y, gullrock.x, gullrock.y);
      if (d < 700 && !SaveManager.get().world.flags.gullrockDiscovered) {
        SaveManager.get().world.flags.gullrockDiscovered = true;
        this.toast.show('Sera: Land ahead. Gullrock Port.');
      }
    }

    const canDock = Boolean(best && best.d <= best.port.radius && Math.abs(this.speed) <= 65);
    this.mobile?.setInteract(canDock ? 'Dock' : null);
  }

  private tryDock(): void {
    if (!this.nearestPort) return;

    const d = Phaser.Math.Distance.Between(
      this.ship.x,
      this.ship.y,
      this.nearestPort.x,
      this.nearestPort.y,
    );

    if (d > this.nearestPort.radius) {
      this.toast.show('No dock is within boarding distance.');
      return;
    }
    if (Math.abs(this.speed) > 65) {
      this.toast.show('Too fast to dock. Reduce speed first.');
      return;
    }

    const save = SaveManager.get();
    save.ship.x = this.ship.x;
    save.ship.y = this.ship.y;
    save.ship.heading = this.heading;
    save.ship.speed = 0;

    if (this.nearestPort.id === 'gullrock') {
      save.world.scene = 'gullrock';
      save.world.locationId = 'gullrock-port';
      save.world.flags.gullrockDiscovered = true;
      save.player.position = { x: 620, y: 760 };
      SaveManager.save();
      this.scene.start('GullrockScene');
      return;
    }

    save.world.scene = 'harrow';
    save.world.locationId = 'harrow-island';
    save.player.position = { x: 1230, y: 265 };
    SaveManager.save();
    this.scene.start('HarrowScene');
  }

  private createHud(): void {
    this.hud = this.add.text(14, 14, '', {
      fontFamily: 'system-ui, sans-serif',
      fontSize: '13px',
      color: '#eef4f6',
      backgroundColor: '#071116dd',
      padding: { x: 10, y: 8 },
      lineSpacing: 3,
    }).setScrollFactor(0).setDepth(2500);

    this.nav = this.add.text(this.scale.width - 14, 14, '', {
      fontFamily: 'system-ui, sans-serif',
      fontSize: '12px',
      color: '#d5e1e5',
      backgroundColor: '#071116cc',
      padding: { x: 10, y: 8 },
      align: 'right',
    }).setOrigin(1, 0).setScrollFactor(0).setDepth(2500);

    this.scale.on('resize', (size: Phaser.Structs.Size) => this.nav.setPosition(size.width - 14, 14));
  }

  private updateHud(): void {
    const save = SaveManager.get();
    this.hud.setText([
      `Wayward Gull · Hull ${Math.ceil(save.ship.hull)}/${save.ship.maxHull}`,
      `Speed ${Math.round(Math.abs(this.speed))}`,
      'W/S throttle · A/D steer · F dock',
    ]);

    const gullrock = this.ports[1];
    const dist = gullrock ? Math.round(Phaser.Math.Distance.Between(this.ship.x, this.ship.y, gullrock.x, gullrock.y)) : 0;
    const bearing = gullrock ? this.cardinal(Phaser.Math.Angle.Between(this.ship.x, this.ship.y, gullrock.x, gullrock.y)) : '—';
    this.nav.setText([
      formatWorldTime(save),
      `Gullrock: ${dist} m ${bearing}`,
      `World position: ${Math.round(this.ship.x)}, ${Math.round(this.ship.y)}`,
    ]);
  }

  private cardinal(angle: number): string {
    const normalized = Phaser.Math.Angle.Normalize(angle);
    const directions = ['E', 'SE', 'S', 'SW', 'W', 'NW', 'N', 'NE'];
    const index = Math.round(normalized / (Math.PI / 4)) % 8;
    return directions[index] ?? 'E';
  }

  private pauseGame(): void {
    const save = SaveManager.get();
    save.ship.x = this.ship.x;
    save.ship.y = this.ship.y;
    save.ship.heading = this.heading;
    save.ship.speed = this.speed;
    SaveManager.save();
    this.scene.launch('PauseScene', { source: this.scene.key });
    this.scene.pause();
  }

  private isInReef(x: number, y: number): boolean {
    return (
      Phaser.Math.Distance.Between(x, y, 1840, 1320) < 210 ||
      Phaser.Math.Distance.Between(x, y, 2150, 1160) < 135
    );
  }

  private drawSea(): void {
    this.add.rectangle(this.worldW / 2, this.worldH / 2, this.worldW, this.worldH, 0x123e52).setDepth(-30);

    const waves = this.add.graphics().setDepth(-29);
    waves.lineStyle(2, 0x8bc1cf, 0.11);
    for (let y = 55; y < this.worldH; y += 95) {
      for (let x = 30; x < this.worldW; x += 130) {
        waves.beginPath();
        waves.moveTo(x, y);
        waves.quadraticBezierTo(x + 28, y - 9, x + 56, y);
        waves.quadraticBezierTo(x + 84, y + 9, x + 112, y);
        waves.strokePath();
      }
    }

    this.drawIsland(760, 1760, 320, 0x6c6a4b, 'HARROW');
    this.drawIsland(2790, 760, 370, 0x657451, 'GULLROCK');

    const reef = this.add.graphics().setDepth(-8);
    reef.fillStyle(0x65a7ad, 0.35).fillCircle(1840, 1320, 210);
    reef.fillStyle(0x75b4b7, 0.28).fillCircle(2150, 1160, 135);
    reef.lineStyle(2, 0xd5eced, 0.25).strokeCircle(1840, 1320, 210).strokeCircle(2150, 1160, 135);

    this.add.text(1840, 1320, 'REEF', {
      fontFamily: 'system-ui, sans-serif',
      fontSize: '12px',
      color: '#d7edef',
      alpha: 0.55,
    }).setOrigin(0.5).setDepth(-7);
  }

  private drawIsland(x: number, y: number, radius: number, color: number, label: string): void {
    const g = this.add.graphics().setDepth(-12);
    g.fillStyle(0xd8c28c, 1).fillEllipse(x, y, radius * 2.1, radius * 1.4);
    g.fillStyle(color, 1).fillEllipse(x, y - 24, radius * 1.9, radius * 1.18);
    g.fillStyle(0x36563d, 1).fillCircle(x - radius * 0.25, y - radius * 0.2, radius * 0.34);
    g.fillCircle(x + radius * 0.18, y - radius * 0.17, radius * 0.27);

    this.add.text(x, y + radius * 0.62, label, {
      fontFamily: 'Georgia, serif',
      fontSize: '22px',
      color: '#e5dec6',
      backgroundColor: '#07111688',
      padding: { x: 8, y: 5 },
    }).setOrigin(0.5).setDepth(-5);
  }
}
