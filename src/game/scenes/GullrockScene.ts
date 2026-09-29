import Phaser from 'phaser';
import { SaveManager } from '../state/SaveManager';
import { MobileControls } from '../systems/MobileControls';
import { InteractionSystem } from '../systems/InteractionSystem';
import { Toast } from '../systems/Toast';
import { advanceWorldClock, formatWorldTime } from '../systems/WorldClock';

export class GullrockScene extends Phaser.Scene {
  private readonly worldW = 1500;
  private readonly worldH = 980;
  private player!: Phaser.Physics.Arcade.Sprite;
  private crew: Phaser.Physics.Arcade.Sprite[] = [];
  private keys!: Record<string, Phaser.Input.Keyboard.Key>;
  private mobile?: MobileControls;
  private interactions!: InteractionSystem;
  private toast!: Toast;
  private hud!: Phaser.GameObjects.Text;
  private lastValid = new Phaser.Math.Vector2(725, 790);
  private lastSaveAt = 0;

  constructor() { super('GullrockScene'); }

  create(): void {
    const save = SaveManager.get();
    save.world.scene = 'gullrock';
    save.world.locationId = 'gullrock-port';

    this.physics.world.setBounds(0, 0, this.worldW, this.worldH);
    this.cameras.main.setBounds(0, 0, this.worldW, this.worldH);
    this.drawPort();

    this.player = this.physics.add.sprite(725, 790, 'alexander').setDepth(50).setCollideWorldBounds(true);
    this.player.setBodySize(34, 30).setOffset(19, 70);

    this.crew = [
      this.physics.add.sprite(665, 825, 'sera').setDepth(48).setCollideWorldBounds(true),
      this.physics.add.sprite(785, 825, 'rowan').setDepth(49).setCollideWorldBounds(true),
    ];

    this.createInput();
    this.toast = new Toast(this);
    this.interactions = new InteractionSystem(this.player);
    this.registerInteractions();
    this.createHud();

    if (this.sys.game.device.input.touch) {
      this.mobile = new MobileControls(this, {
        primary: () => undefined,
        secondary: () => undefined,
        dash: () => undefined,
        interact: () => this.interactions.trigger(),
        pause: () => this.pauseGame(),
      });
      this.mobile.setCombatVisible(false);
    }

    this.cameras.main.startFollow(this.player, true, 0.12, 0.12);
    this.cameras.main.setZoom(this.scale.width < 700 ? 1.04 : 1);
    this.toast.show('The Wayward Gull ties off at Gullrock. No one here knows you yet.', 3000);
    SaveManager.save();
  }

  update(_time: number, deltaMs: number): void {
    const dt = Math.min(0.033, deltaMs / 1000);
    advanceWorldClock(SaveManager.get(), dt, 1.3);
    this.updatePlayer();
    this.updateCrew();

    const current = this.interactions.update();
    this.mobile?.setInteract(current?.label ?? null);
    this.updateHud();

    if (this.time.now - this.lastSaveAt > 20_000) {
      SaveManager.save();
      this.lastSaveAt = this.time.now;
    }
  }

  private createInput(): void {
    const keyboard = this.input.keyboard;
    if (!keyboard) throw new Error('Keyboard input unavailable');
    this.keys = keyboard.addKeys({
      up: 'W',
      down: 'S',
      left: 'A',
      right: 'D',
      up2: Phaser.Input.Keyboard.KeyCodes.UP,
      down2: Phaser.Input.Keyboard.KeyCodes.DOWN,
      left2: Phaser.Input.Keyboard.KeyCodes.LEFT,
      right2: Phaser.Input.Keyboard.KeyCodes.RIGHT,
      interact: 'F',
      pause: Phaser.Input.Keyboard.KeyCodes.ESC,
    }) as Record<string, Phaser.Input.Keyboard.Key>;
    this.keys.interact?.on('down', () => this.interactions.trigger());
    this.keys.pause?.on('down', () => this.pauseGame());
  }

  private updatePlayer(): void {
    const x =
      (this.keys.right?.isDown || this.keys.right2?.isDown ? 1 : 0) -
      (this.keys.left?.isDown || this.keys.left2?.isDown ? 1 : 0) +
      (this.mobile?.move.x ?? 0);
    const y =
      (this.keys.down?.isDown || this.keys.down2?.isDown ? 1 : 0) -
      (this.keys.up?.isDown || this.keys.up2?.isDown ? 1 : 0) +
      (this.mobile?.move.y ?? 0);

    const v = new Phaser.Math.Vector2(x, y);
    if (v.lengthSq() > 1) v.normalize();
    this.player.setVelocity(v.x * 205, v.y * 205);

    if (this.isWalkable(this.player.x, this.player.y)) this.lastValid.set(this.player.x, this.player.y);
    else this.player.setPosition(this.lastValid.x, this.lastValid.y).setVelocity(0, 0);
  }

  private updateCrew(): void {
    const [sera, rowan] = this.crew;
    if (sera) this.follow(sera, this.player.x - 55, this.player.y + 40, 138);
    if (rowan) this.follow(rowan, this.player.x + 58, this.player.y + 28, 150);
  }

  private follow(sprite: Phaser.Physics.Arcade.Sprite, x: number, y: number, speed: number): void {
    const v = new Phaser.Math.Vector2(x - sprite.x, y - sprite.y);
    if (v.length() < 44) {
      sprite.setVelocity(0, 0);
      return;
    }
    v.normalize().scale(speed);
    sprite.setVelocity(v.x, v.y);
  }

  private registerInteractions(): void {
    this.interactions.register({
      id: 'harbor-master',
      x: 575,
      y: 560,
      radius: 85,
      label: 'Talk',
      run: () => this.harborMaster(),
    });
    this.interactions.register({
      id: 'provisioner',
      x: 955,
      y: 500,
      radius: 90,
      label: 'Shop',
      run: () => this.provisioner(),
    });
    this.interactions.register({
      id: 'noticeboard',
      x: 785,
      y: 370,
      radius: 85,
      label: 'Read',
      run: () => this.noticeboard(),
    });
    this.interactions.register({
      id: 'return-ship',
      x: 725,
      y: 870,
      radius: 95,
      label: 'Set sail',
      run: () => this.returnToSea(),
    });
  }

  private harborMaster(): void {
    const save = SaveManager.get();
    if (!save.world.flags.gullrockDockFeePaid) {
      if (save.player.berries < 200) {
        this.toast.show('Harbor master: You cannot cover the docking fee.');
        return;
      }
      save.player.berries -= 200;
      save.world.flags.gullrockDockFeePaid = true;
      this.toast.show('Harbor master: Two hundred berries for the berth. Sera handles the paperwork.', 3200);
      SaveManager.save();
      return;
    }
    this.toast.show('Harbor master: Your berth is paid through tomorrow. Keep trouble off my pier.');
  }

  private provisioner(): void {
    const save = SaveManager.get();
    if (save.player.berries < 900) {
      this.toast.show('Provisioner: Nine hundred berries for food and water.');
      return;
    }
    if (save.ship.supplies >= 96) {
      this.toast.show('Sera: We already have plenty packed aboard.');
      return;
    }

    save.player.berries -= 900;
    save.ship.supplies = Math.min(100, save.ship.supplies + 18);
    save.inventory['Rations'] = (save.inventory['Rations'] ?? 0) + 3;
    save.inventory['Fresh water'] = (save.inventory['Fresh water'] ?? 0) + 3;
    this.toast.show('Food and fresh water are delivered to the Wayward Gull.');
    SaveManager.save();
  }

  private noticeboard(): void {
    const save = SaveManager.get();
    const id = 'gullrock-rumor-voss';
    if (!save.journal.some((entry) => entry.id === id)) {
      save.journal.push({
        id,
        title: 'Rumor at Gullrock',
        body: 'Sailors say a bounty hunter crew has been asking about an 8,000,000-berry pirate captured alive somewhere west.',
        known: true,
      });
    }
    this.toast.show('Shipping notices, wanted posters, and one rumor sound uncomfortably familiar.', 3200);
    SaveManager.save();
  }

  private returnToSea(): void {
    const save = SaveManager.get();
    save.world.scene = 'sea';
    save.world.locationId = 'east-blue-open-sea';
    save.ship.x = 2610;
    save.ship.y = 830;
    save.ship.heading = Math.PI;
    save.ship.speed = 32;
    SaveManager.save();

    this.cameras.main.fadeOut(350, 5, 12, 18);
    this.time.delayedCall(380, () => this.scene.start('SeaScene'));
  }

  private pauseGame(): void {
    SaveManager.save();
    this.scene.launch('PauseScene', { source: this.scene.key });
    this.scene.pause();
  }

  private createHud(): void {
    this.hud = this.add.text(14, 14, '', {
      fontFamily: 'system-ui, sans-serif',
      fontSize: '12px',
      color: '#edf4f6',
      backgroundColor: '#071116d3',
      padding: { x: 10, y: 8 },
      lineSpacing: 3,
    }).setScrollFactor(0).setDepth(900);
  }

  private updateHud(): void {
    const save = SaveManager.get();
    this.hud.setText([
      'Gullrock Port',
      formatWorldTime(save),
      `Berries ${save.player.berries.toLocaleString()}`,
      'F / INTERACT near people and objects',
    ]);
  }

  private isWalkable(x: number, y: number): boolean {
    return (
      new Phaser.Geom.Rectangle(500, 650, 450, 330).contains(x, y) ||
      new Phaser.Geom.Rectangle(320, 310, 860, 420).contains(x, y) ||
      new Phaser.Geom.Rectangle(210, 120, 1080, 280).contains(x, y)
    );
  }

  private drawPort(): void {
    const g = this.add.graphics();
    g.fillStyle(0x164150, 1).fillRect(0, 0, this.worldW, this.worldH);

    g.lineStyle(2, 0x9ed4df, 0.12);
    for (let y = 30; y < this.worldH; y += 58) {
      for (let x = 0; x < this.worldW; x += 120) {
        g.beginPath();
        g.moveTo(x, y);
        g.lineTo(x + 60, y);
        g.lineTo(x + 120, y);
        g.strokePath();
      }
    }

    g.fillStyle(0x66503a, 1).fillRect(500, 650, 450, 330);
    g.fillStyle(0x9b895d, 1).fillRect(320, 310, 860, 420);
    g.fillStyle(0x747c50, 1).fillRect(210, 120, 1080, 280);

    const buildings: Array<[number, number, number, number, number]> = [
      [300, 150, 210, 150, 0x4c3930],
      [560, 135, 230, 155, 0x523b30],
      [840, 145, 210, 150, 0x4a3933],
      [1080, 150, 170, 150, 0x4b3b2f],
    ];
    for (const [x, y, w, h, color] of buildings) {
      g.fillStyle(color, 1).fillRoundedRect(x, y, w, h, 8);
      g.fillStyle(0xd3a65c, 0.75).fillRect(x + 25, y + 52, 28, 38);
    }

    this.add.circle(575, 560, 24, 0xb99162, 1).setDepth(25);
    this.add.text(575, 520, 'Harbor Master', { fontSize: '12px', color: '#f0f4f5' }).setOrigin(0.5).setDepth(26);
    this.add.circle(955, 500, 24, 0x7ebc85, 1).setDepth(25);
    this.add.text(955, 460, 'Provisioner', { fontSize: '12px', color: '#f0f4f5' }).setOrigin(0.5).setDepth(26);

    g.fillStyle(0x503520, 1).fillRect(755, 340, 60, 70);
    this.add.text(785, 320, 'Noticeboard', { fontSize: '12px', color: '#f0f4f5' }).setOrigin(0.5).setDepth(26);
    this.add.image(725, 930, 'wayward-gull').setScale(0.72).setDepth(20);
  }
}
