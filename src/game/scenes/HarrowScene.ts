import Phaser from 'phaser';
import { SaveManager } from '../state/SaveManager';
import type { CaptainOrder } from '../state/types';
import { CrewStatusHud } from '../systems/CrewStatusHud';
import { MobileControls, shouldUseMobileControls } from '../systems/MobileControls';
import { InteractionSystem } from '../systems/InteractionSystem';
import { Toast } from '../systems/Toast';
import { advanceWorldClock, formatWorldTime } from '../systems/WorldClock';

type EnemyRole = 'melee' | 'rifle';

interface EnemyUnit {
  sprite: Phaser.Physics.Arcade.Sprite;
  downLabel?: Phaser.GameObjects.Text;
  role: EnemyRole;
  hp: number;
  alert: boolean;
  attackReadyAt: number;
  patrolX: number;
  patrolY: number;
  phase: number;
  windup?: Phaser.GameObjects.Arc;
}

interface CrewUnit {
  id: 'sera' | 'rowan';
  sprite: Phaser.Physics.Arcade.Sprite;
  label?: Phaser.GameObjects.Text;
  hp: number;
  attackReadyAt: number;
}

export class HarrowScene extends Phaser.Scene {
  private readonly worldW = 1536;
  private readonly worldH = 1024;

  private player!: Phaser.Physics.Arcade.Sprite;
  private crew: CrewUnit[] = [];
  private enemies: EnemyUnit[] = [];
  private props: Phaser.Physics.Arcade.Image[] = [];
  private bullets!: Phaser.Physics.Arcade.Group;
  private keys!: Record<string, Phaser.Input.Keyboard.Key>;
  private mobile?: MobileControls;
  private interactions!: InteractionSystem;
  private toast!: Toast;
  private hud!: Phaser.GameObjects.Text;
  private status!: Phaser.GameObjects.Text;
  private crewHud!: CrewStatusHud;

  private order: CaptainOrder = 'regroup';
  private lastFacing = new Phaser.Math.Vector2(1, 0);
  private attackReadyAt = 0;
  private pullReadyAt = 0;
  private dashReadyAt = 0;
  private dashUntil = 0;
  private lastValid = new Phaser.Math.Vector2(720, 870);
  private dead = false;
  private lastSaveAt = 0;

  constructor() { super('HarrowScene'); }

  create(): void {
    const save = SaveManager.get();
    save.world.scene = 'harrow';
    save.world.locationId = 'harrow-island';

    this.physics.world.setBounds(0, 0, this.worldW, this.worldH);
    this.cameras.main.setBounds(0, 0, this.worldW, this.worldH);
    this.drawHarbor();

    this.player = this.physics.add.sprite(save.player.position.x, save.player.position.y, 'alexander')
      .setDepth(50)
      .setCollideWorldBounds(true);
    this.player.setBodySize(34, 28).setOffset(19, 72);
    this.lastValid.set(this.player.x, this.player.y);

    const seraState = save.crew.find((c) => c.id === 'sera');
    const rowanState = save.crew.find((c) => c.id === 'rowan');
    this.crew = [
      {
        id: 'sera',
        sprite: this.physics.add.sprite(seraState?.position.x ?? 650, seraState?.position.y ?? 905, 'sera').setDepth(48),
        hp: seraState?.hp ?? 76,
        attackReadyAt: 0,
      },
      {
        id: 'rowan',
        sprite: this.physics.add.sprite(rowanState?.position.x ?? 780, rowanState?.position.y ?? 900, 'rowan').setDepth(49),
        hp: rowanState?.hp ?? 110,
        attackReadyAt: 0,
      },
    ];
    for (const unit of this.crew) {
      unit.sprite.setBodySize(32, 28).setOffset(20, 72).setCollideWorldBounds(true);
      const title = unit.id === 'sera' ? 'SERA QUILL · Navigator' : 'ROWAN VALE · Fighter';
      unit.label = this.add.text(unit.sprite.x, unit.sprite.y - 58, title, {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '11px',
        fontStyle: 'bold',
        color: unit.id === 'sera' ? '#d6edf6' : '#f0d9cb',
        backgroundColor: '#071116c9',
        padding: { x: 5, y: 3 },
      }).setOrigin(0.5, 1).setDepth(84);
      if (unit.hp <= 0) this.markCrewDown(unit);
    }

    const defs: Array<[number, number, EnemyRole]> = [
      [470, 610, 'melee'],
      [760, 495, 'melee'],
      [930, 415, 'rifle'],
      [1085, 305, 'melee'],
      [1210, 300, 'rifle'],
    ];
    this.enemies = defs.map(([x, y, role], i) => ({
      sprite: this.physics.add.sprite(x, y, 'marine').setDepth(47).setCollideWorldBounds(true),
      role,
      hp: role === 'rifle' ? 58 : 72,
      alert: Boolean(save.world.flags.harrowMarinesAlerted),
      attackReadyAt: 0,
      patrolX: x,
      patrolY: y,
      phase: i * 1.6,
    }));
    for (const enemy of this.enemies) enemy.sprite.setBodySize(32, 28).setOffset(20, 72);

    this.props = [
      this.makeProp(575, 555, 'crate', 1.1),
      this.makeProp(810, 620, 'crate', 1.35),
      this.makeProp(905, 448, 'barrel', 0.78),
      this.makeProp(1055, 315, 'crate', 1.5),
    ];

    this.bullets = this.physics.add.group({ defaultKey: 'bullet', maxSize: 28 });
    this.physics.add.overlap(this.player, this.bullets, (_p, raw) => {
      if (this.dead || this.time.now < this.dashUntil) return;
      const bullet = raw as Phaser.Physics.Arcade.Image;
      if (!bullet.active) return;
      bullet.disableBody(true, true);
      this.damagePlayer(12);
    });
    for (const unit of this.crew) {
      this.physics.add.overlap(unit.sprite, this.bullets, (_p, raw) => {
        const bullet = raw as Phaser.Physics.Arcade.Image;
        if (!bullet.active || unit.hp <= 0) return;
        bullet.disableBody(true, true);
        unit.hp = Math.max(0, unit.hp - 10);
        if (unit.hp <= 0) this.markCrewDown(unit);
        else this.hitFlash(unit.sprite);
      });
    }

    this.interactions = new InteractionSystem(this.player);
    this.interactions.register({
      id: 'gull',
      x: 1240,
      y: 248,
      radius: 110,
      label: 'Board Gull',
      run: () => this.boardShip(),
    });

    this.createInput();
    this.toast = new Toast(this);
    this.createHud();
    this.crewHud = new CrewStatusHud(this);

    if (shouldUseMobileControls()) {
      this.mobile = new MobileControls(this, {
        primary: () => this.attack(),
        secondary: () => this.pull(),
        dash: () => this.dash(),
        interact: () => this.interactions.trigger(),
        order: () => this.cycleOrder(),
        pause: () => this.pauseGame(),
      });
      this.mobile.setOrderLabel('REGROUP');
    }

    this.cameras.main.startFollow(this.player, true, 0.08, 0.08);
    this.cameras.main.setDeadzone(
      Math.min(280, this.scale.width * 0.38),
      Math.min(220, this.scale.height * 0.28),
    );
    this.cameras.main.setZoom(this.scale.width < 700 ? 1.04 : 1);

    if (save.world.flags.alexanderDead) {
      this.endCampaign();
      return;
    }

    this.toast.show('Sera: The Gull is northeast. We can still slip past the patrols.');
    this.time.delayedCall(2500, () => {
      if (!this.enemies.some((e) => e.alert)) {
        this.toast.show('The patrols are searching, not attacking. Distance still matters.', 2600);
      }
    });
  }

  update(_time: number, deltaMs: number): void {
    if (this.dead) return;

    const dt = Math.min(0.033, deltaMs / 1000);
    const save = SaveManager.get();
    advanceWorldClock(save, dt, 1.5);

    this.updatePlayer(dt);
    this.updateEnemies(dt);
    this.updateCrew(dt);
    this.syncCrewLabels();
    this.updateProps();
    this.updateBullets();

    const interaction = this.interactions.update();
    this.mobile?.setInteract(interaction?.label ?? null);
    this.updateHud();

    if (this.time.now - this.lastSaveAt >= 20_000) {
      this.persist();
      SaveManager.save();
      this.lastSaveAt = this.time.now;
    }
  }

  private createInput(): void {
    const kb = this.input.keyboard;
    if (!kb) throw new Error('Keyboard input unavailable');

    this.keys = kb.addKeys({
      up: 'W',
      down: 'S',
      left: 'A',
      right: 'D',
      up2: Phaser.Input.Keyboard.KeyCodes.UP,
      down2: Phaser.Input.Keyboard.KeyCodes.DOWN,
      left2: Phaser.Input.Keyboard.KeyCodes.LEFT,
      right2: Phaser.Input.Keyboard.KeyCodes.RIGHT,
      attack: Phaser.Input.Keyboard.KeyCodes.SPACE,
      pull: 'E',
      dash: Phaser.Input.Keyboard.KeyCodes.SHIFT,
      interact: 'F',
      order: 'Q',
      pause: Phaser.Input.Keyboard.KeyCodes.ESC,
    }) as Record<string, Phaser.Input.Keyboard.Key>;

    this.keys.attack?.on('down', () => this.attack());
    this.keys.pull?.on('down', () => this.pull());
    this.keys.dash?.on('down', () => this.dash());
    this.keys.interact?.on('down', () => this.interactions.trigger());
    this.keys.order?.on('down', () => this.cycleOrder());
    this.keys.pause?.on('down', () => this.pauseGame());
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

    this.status = this.add.text(this.scale.width - 14, 14, '', {
      fontFamily: 'system-ui, sans-serif',
      fontSize: '12px',
      color: '#d5e1e5',
      backgroundColor: '#071116cc',
      padding: { x: 10, y: 7 },
      align: 'right',
    }).setOrigin(1, 0).setScrollFactor(0).setDepth(2500);

    this.scale.on('resize', (size: Phaser.Structs.Size) => this.status.setPosition(size.width - 14, 14));
  }

  private updateHud(): void {
    const save = SaveManager.get();
    this.hud.setText(this.mobile
      ? [
          `HP ${Math.ceil(save.player.hp)}/${save.player.maxHp} · STM ${Math.ceil(save.player.stamina)}/${save.player.maxStamina}`,
          `Pull familiarity ${Math.round(save.player.fruit.mastery * 100)}%`,
        ]
      : [
          `HP ${Math.ceil(save.player.hp)}/${save.player.maxHp}`,
          `Stamina ${Math.ceil(save.player.stamina)}/${save.player.maxStamina}`,
          `Pull familiarity ${Math.round(save.player.fruit.mastery * 100)}%`,
          `Order: ${this.order.replace('-', ' ')}`,
        ]);
    const alerted = this.enemies.filter((e) => e.alert && e.hp > 0).length;
    this.status.setText(`Harrow Docks\n${formatWorldTime(save)}${alerted ? `\n${alerted} alerted` : ''}`);
    this.crewHud.update(this.crew.map((unit) => {
      const state = save.crew.find((member) => member.id === unit.id);
      return {
        id: unit.id,
        name: state?.name ?? (unit.id === 'sera' ? 'Sera Quill' : 'Rowan Vale'),
        hp: unit.hp,
        maxHp: state?.maxHp ?? unit.hp,
      };
    }));
  }

  private getMove(): Phaser.Math.Vector2 {
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
    return v;
  }

  private updatePlayer(dt: number): void {
    const save = SaveManager.get();
    save.player.stamina = Math.min(save.player.maxStamina, save.player.stamina + 22 * dt);

    if (this.time.now >= this.dashUntil) {
      const v = this.getMove();
      if (v.lengthSq() > 0.01) this.lastFacing.copy(v).normalize();
      this.player.setVelocity(v.x * 210, v.y * 210);
    }

    if (this.isWalkable(this.player.x, this.player.y)) {
      this.lastValid.set(this.player.x, this.player.y);
    } else {
      this.player.setPosition(this.lastValid.x, this.lastValid.y).setVelocity(0, 0);
      this.dashUntil = 0;
    }

    save.player.position = { x: this.player.x, y: this.player.y };
  }

  private updateEnemies(_dt: number): void {
    const save = SaveManager.get();

    for (const enemy of this.enemies) {
      if (enemy.hp <= 0) continue;

      const dist = Phaser.Math.Distance.Between(enemy.sprite.x, enemy.sprite.y, this.player.x, this.player.y);
      if (!enemy.alert && dist < 260) {
        enemy.alert = true;
        save.world.flags.harrowMarinesAlerted = true;
        this.toast.show('Marine: There! Stop!');
      }

      if (!enemy.alert) {
        const t = this.time.now / 1000 + enemy.phase;
        const tx = enemy.patrolX + Math.cos(t * 0.55) * 52;
        const ty = enemy.patrolY + Math.sin(t * 0.43) * 34;
        this.moveToward(enemy.sprite, tx, ty, 62);
        continue;
      }

      if (enemy.role === 'melee') {
        if (dist > 54) this.moveToward(enemy.sprite, this.player.x, this.player.y, 118);
        else {
          enemy.sprite.setVelocity(0, 0);
          if (this.time.now >= enemy.attackReadyAt) this.meleeWindup(enemy);
        }
      } else {
        if (dist < 180) {
          const away = new Phaser.Math.Vector2(enemy.sprite.x - this.player.x, enemy.sprite.y - this.player.y).normalize();
          this.setWalkableVelocity(enemy.sprite, away.x * 95, away.y * 95);
        } else if (dist > 350) {
          this.moveToward(enemy.sprite, this.player.x, this.player.y, 78);
        } else {
          enemy.sprite.setVelocity(0, 0);
        }
        if (dist < 470 && this.time.now >= enemy.attackReadyAt) this.rifleWindup(enemy);
      }

      if (!this.isCharacterWalkable(enemy.sprite.x, enemy.sprite.y)) {
        enemy.sprite.setVelocity(0, 0);
      }
    }
  }

  private meleeWindup(enemy: EnemyUnit): void {
    enemy.attackReadyAt = this.time.now + 980;
    const arc = this.add.circle(enemy.sprite.x, enemy.sprite.y, 42, 0xff8f76, 0.08)
      .setStrokeStyle(3, 0xff8f76, 0.8)
      .setDepth(70);
    enemy.windup?.destroy();
    enemy.windup = arc;

    this.time.delayedCall(280, () => {
      arc.destroy();
      if (enemy.hp <= 0 || this.dead) return;
      const d = Phaser.Math.Distance.Between(enemy.sprite.x, enemy.sprite.y, this.player.x, this.player.y);
      if (d <= 62 && this.time.now >= this.dashUntil) this.damagePlayer(15);
    });
  }

  private rifleWindup(enemy: EnemyUnit): void {
    enemy.attackReadyAt = this.time.now + 1450;
    const line = this.add.line(
      0,
      0,
      enemy.sprite.x,
      enemy.sprite.y,
      this.player.x,
      this.player.y,
      0xff8f76,
      0.48,
    ).setOrigin(0).setDepth(65);

    this.time.delayedCall(420, () => {
      line.destroy();
      if (enemy.hp <= 0 || this.dead) return;
      const angle = Phaser.Math.Angle.Between(enemy.sprite.x, enemy.sprite.y, this.player.x, this.player.y);
      const bullet = this.bullets.get(enemy.sprite.x, enemy.sprite.y, 'bullet') as Phaser.Physics.Arcade.Image | null;
      if (!bullet) return;
      bullet.enableBody(true, enemy.sprite.x, enemy.sprite.y, true, true);
      bullet.setVelocity(Math.cos(angle) * 420, Math.sin(angle) * 420);
      bullet.setData('expires', this.time.now + 1500);
    });
  }

  private updateBullets(): void {
    this.bullets.children.each((child) => {
      const bullet = child as Phaser.Physics.Arcade.Image;
      if (!bullet.active) return null;
      const expires = Number(bullet.getData('expires') ?? 0);
      if (this.time.now > expires || !this.isWalkable(bullet.x, bullet.y)) bullet.disableBody(true, true);
      return null;
    });
  }

  private updateCrew(_dt: number): void {
    const rowan = this.crew.find((c) => c.id === 'rowan');
    const sera = this.crew.find((c) => c.id === 'sera');
    if (!rowan || !sera) return;

    if (sera.hp > 0) {
      const seraTargetX = this.order === 'retreat' ? this.player.x - 80 : this.player.x - 70;
      const seraTargetY = this.order === 'retreat' ? this.player.y + 55 : this.player.y + 70;
      if (Phaser.Math.Distance.Between(sera.sprite.x, sera.sprite.y, seraTargetX, seraTargetY) > 55) {
        this.moveToward(sera.sprite, seraTargetX, seraTargetY, 150);
      } else sera.sprite.setVelocity(0, 0);
    }

    if (rowan.hp <= 0) return;
    const living = this.enemies.filter((e) => e.alert && e.hp > 0);
    const target = living
      .map((enemy) => ({
        enemy,
        d: Phaser.Math.Distance.Between(rowan.sprite.x, rowan.sprite.y, enemy.sprite.x, enemy.sprite.y),
      }))
      .sort((a, b) => a.d - b.d)[0];

    const shouldEngage = target && (
      this.order === 'aggressive' ||
      this.order === 'protect-sera' ||
      target.d < 150
    ) && this.order !== 'retreat';

    if (shouldEngage && target) {
      if (target.d > 58) {
        this.moveToward(rowan.sprite, target.enemy.sprite.x, target.enemy.sprite.y, this.order === 'aggressive' ? 190 : 165);
      } else {
        rowan.sprite.setVelocity(0, 0);
        if (this.time.now >= rowan.attackReadyAt) {
          rowan.attackReadyAt = this.time.now + 720;
          target.enemy.hp -= 22;
          this.hitFlash(target.enemy.sprite);
          if (target.enemy.hp <= 0) this.downEnemy(target.enemy);
        }
      }
    } else {
      const offsetX = this.order === 'defensive' ? -35 : 50;
      const offsetY = this.order === 'defensive' ? 25 : 60;
      if (Phaser.Math.Distance.Between(rowan.sprite.x, rowan.sprite.y, this.player.x + offsetX, this.player.y + offsetY) > 70) {
        this.moveToward(rowan.sprite, this.player.x + offsetX, this.player.y + offsetY, 165);
      } else rowan.sprite.setVelocity(0, 0);
    }
  }

  private attack(): void {
    if (this.dead || this.time.now < this.attackReadyAt) return;
    this.attackReadyAt = this.time.now + 380;

    const facing = this.getAttackFacing();
    this.lastFacing.copy(facing);

    const slash = this.add.arc(
      this.player.x,
      this.player.y,
      62,
      Phaser.Math.RadToDeg(facing.angle() - 0.95),
      Phaser.Math.RadToDeg(facing.angle() + 0.95),
      false,
      0xffefbd,
      0,
    ).setStrokeStyle(7, 0xffefbd, 0.9).setDepth(90);
    this.tweens.add({ targets: slash, alpha: 0, scale: 1.18, duration: 150, onComplete: () => slash.destroy() });

    for (const enemy of this.enemies) {
      if (enemy.hp <= 0) continue;
      const to = new Phaser.Math.Vector2(enemy.sprite.x - this.player.x, enemy.sprite.y - this.player.y);
      if (to.length() > (this.mobile ? 86 : 80)) continue;
      if (to.clone().normalize().dot(facing) < -0.08) continue;
      enemy.alert = true;
      enemy.hp -= 26;
      this.hitFlash(enemy.sprite);
      if (enemy.hp <= 0) this.downEnemy(enemy);
    }
  }

  private getAttackFacing(): Phaser.Math.Vector2 {
    const input = this.getMove();
    const movingFacing = input.lengthSq() > 0.02 ? input.clone().normalize() : null;

    if (this.mobile) {
      const nearby = this.enemies
        .filter((enemy) => enemy.hp > 0)
        .map((enemy) => ({
          enemy,
          distance: Phaser.Math.Distance.Between(
            this.player.x,
            this.player.y,
            enemy.sprite.x,
            enemy.sprite.y,
          ),
        }))
        .filter((entry) => entry.distance <= 100)
        .sort((a, b) => a.distance - b.distance)[0];

      if (nearby) {
        const toward = new Phaser.Math.Vector2(
          nearby.enemy.sprite.x - this.player.x,
          nearby.enemy.sprite.y - this.player.y,
        ).normalize();

        if (!movingFacing || toward.dot(movingFacing) >= -0.2) return toward;
      }
    }

    if (movingFacing) return movingFacing;
    return this.lastFacing.clone().normalize();
  }

  private pull(): void {
    const save = SaveManager.get();
    if (this.dead || this.time.now < this.pullReadyAt || save.player.stamina < 12) return;

    this.pullReadyAt = this.time.now + 560;
    save.player.stamina -= 12;
    const range = save.player.fruit.range;
    let affected = 0;

    const pulse = this.add.circle(this.player.x, this.player.y, 24, 0x79bfd3, 0)
      .setStrokeStyle(4, 0x9bd8e9, 0.75)
      .setDepth(85);
    this.tweens.add({ targets: pulse, scale: range / 24, alpha: 0, duration: 260, onComplete: () => pulse.destroy() });

    for (const enemy of this.enemies) {
      if (enemy.hp <= 0) continue;
      const d = Phaser.Math.Distance.Between(this.player.x, this.player.y, enemy.sprite.x, enemy.sprite.y);
      if (d > range) continue;
      const n = new Phaser.Math.Vector2(this.player.x - enemy.sprite.x, this.player.y - enemy.sprite.y).normalize();
      const resistance = enemy.role === 'melee' ? 0.86 : 1;
      this.setWalkableVelocity(
        enemy.sprite,
        n.x * save.player.fruit.force * resistance,
        n.y * save.player.fruit.force * resistance,
        0.08,
      );
      enemy.alert = true;
      affected += 1;
    }

    for (const prop of this.props) {
      const d = Phaser.Math.Distance.Between(this.player.x, this.player.y, prop.x, prop.y);
      if (d > range) continue;
      const mass = Number(prop.getData('mass') ?? 1);
      const n = new Phaser.Math.Vector2(this.player.x - prop.x, this.player.y - prop.y).normalize();
      prop.setVelocity(n.x * save.player.fruit.force / mass, n.y * save.player.fruit.force / mass);
      affected += 1;
    }

    save.player.fruit.mastery = Math.min(1, save.player.fruit.mastery + Math.max(1, affected) * 0.0005);
    if (affected === 0) this.toast.show('The force catches nothing useful.');
  }

  private updateProps(): void {
    for (const prop of this.props) {
      const body = prop.body as Phaser.Physics.Arcade.Body;
      body.velocity.scale(0.94);
      if (!this.isWalkable(prop.x, prop.y)) {
        prop.setPosition(Number(prop.getData('homeX')), Number(prop.getData('homeY')));
        prop.setVelocity(0, 0);
      }
      if (body.velocity.length() < 210) continue;
      for (const enemy of this.enemies) {
        if (enemy.hp <= 0) continue;
        if (Phaser.Math.Distance.Between(prop.x, prop.y, enemy.sprite.x, enemy.sprite.y) < 42) {
          enemy.alert = true;
          enemy.hp -= Math.min(30, 12 + body.velocity.length() * 0.045);
          prop.setVelocity(-body.velocity.x * 0.3, -body.velocity.y * 0.3);
          this.hitFlash(enemy.sprite);
          if (enemy.hp <= 0) this.downEnemy(enemy);
        }
      }
    }
  }

  private dash(): void {
    const save = SaveManager.get();
    if (this.dead || this.time.now < this.dashReadyAt || save.player.stamina < 18) return;

    let v = this.getMove();
    if (v.lengthSq() < 0.01) v = this.lastFacing.clone();
    else this.lastFacing.copy(v).normalize();
    v.normalize();

    save.player.stamina -= 18;
    this.dashReadyAt = this.time.now + 680;
    this.dashUntil = this.time.now + 175;
    this.player.setVelocity(v.x * 560, v.y * 560);
    this.tweens.add({ targets: this.player, alpha: 0.55, yoyo: true, duration: 80, repeat: 1 });
  }

  private cycleOrder(): void {
    const orders: CaptainOrder[] = ['regroup', 'aggressive', 'defensive', 'protect-sera', 'retreat'];
    const next = (orders.indexOf(this.order) + 1) % orders.length;
    this.order = orders[next] ?? 'regroup';
    const label = this.order === 'protect-sera' ? 'PROTECT' : this.order.toUpperCase();
    this.mobile?.setOrderLabel(label);
    this.toast.show(`Captain order: ${this.order.replace('-', ' ')}`);
  }

  private boardShip(): void {
    const nearbyThreat = this.enemies.some((e) =>
      e.hp > 0 &&
      e.alert &&
      Phaser.Math.Distance.Between(e.sprite.x, e.sprite.y, this.player.x, this.player.y) < 175
    );
    if (nearbyThreat) {
      this.toast.show('Too exposed to board safely. Break contact first.');
      return;
    }

    const save = SaveManager.get();
    this.persist();
    save.world.flags.harrowEscaped = true;
    save.world.flags.shipDestination = 'gullrock';
    save.world.flags.sailingDelegated = true;
    save.world.scene = 'sea';
    save.world.locationId = 'east-blue-open-sea';
    save.ship.x = 760;
    save.ship.y = 1600;
    save.ship.heading = -Math.PI / 2;
    save.ship.speed = 0;
    SaveManager.save();
    this.scene.start('SeaScene');
  }

  private damagePlayer(amount: number): void {
    const save = SaveManager.get();
    save.player.hp = Math.max(0, save.player.hp - amount);
    this.hitFlash(this.player);
    this.cameras.main.shake(85, 0.0045);
    if (save.player.hp <= 0) {
      save.world.flags.alexanderDead = true;
      SaveManager.save();
      this.endCampaign();
    }
  }

  private endCampaign(): void {
    this.dead = true;
    this.player?.setVelocity(0, 0);
    for (const enemy of this.enemies) enemy.sprite.setVelocity(0, 0);
    for (const unit of this.crew) unit.sprite.setVelocity(0, 0);

    const save = SaveManager.get();
    save.player.hp = 0;
    save.world.flags.alexanderDead = true;
    this.persist();
    SaveManager.save();

    this.cameras.main.fadeOut(320, 5, 7, 9);
    this.time.delayedCall(340, () => this.scene.start('GameOverScene'));
  }

  private downEnemy(enemy: EnemyUnit): void {
    enemy.hp = 0;
    enemy.sprite.setVelocity(0, 0);
    enemy.sprite
      .setData('downed', true)
      .setTint(0x555b5f)
      .setAlpha(0.72)
      .setAngle(90)
      .setScale(0.9, 0.55);

    const body = enemy.sprite.body as Phaser.Physics.Arcade.Body;
    body.enable = false;
    enemy.windup?.destroy();

    if (!enemy.downLabel) {
      enemy.downLabel = this.add.text(enemy.sprite.x, enemy.sprite.y - 18, 'DOWN', {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '11px',
        fontStyle: 'bold',
        color: '#ffd3ca',
        backgroundColor: '#341a1acc',
        padding: { x: 6, y: 3 },
      }).setOrigin(0.5).setDepth(88);
    }
  }

  private markCrewDown(unit: CrewUnit): void {
    unit.hp = 0;
    unit.sprite
      .setVelocity(0, 0)
      .setData('downed', true)
      .setTint(0x555b5f)
      .setAlpha(0.74)
      .setAngle(90)
      .setScale(0.9, 0.55);

    const body = unit.sprite.body as Phaser.Physics.Arcade.Body;
    body.enable = false;

    const name = unit.id === 'sera' ? 'SERA QUILL' : 'ROWAN VALE';
    unit.label
      ?.setText(`${name} · DOWN`)
      .setColor('#ffd3ca')
      .setBackgroundColor('#341a1acc')
      .setAlpha(1);
  }

  private hitFlash(target: Phaser.GameObjects.Sprite): void {
    target.setTintFill(0xffffff);
    this.time.delayedCall(80, () => {
      if (!target.active) return;
      if (target.getData('downed')) target.setTint(0x555b5f);
      else target.clearTint();
    });
  }

  private moveToward(sprite: Phaser.Physics.Arcade.Sprite, x: number, y: number, speed: number): void {
    const v = new Phaser.Math.Vector2(x - sprite.x, y - sprite.y);
    if (v.lengthSq() < 16) {
      sprite.setVelocity(0, 0);
      return;
    }
    v.normalize().scale(speed);
    this.setWalkableVelocity(sprite, v.x, v.y);
  }

  private setWalkableVelocity(
    sprite: Phaser.Physics.Arcade.Sprite,
    vx: number,
    vy: number,
    lookahead = 0.14,
  ): void {
    const nextX = sprite.x + vx * lookahead;
    const nextY = sprite.y + vy * lookahead;

    if (this.isCharacterWalkable(nextX, nextY)) {
      sprite.setVelocity(vx, vy);
      return;
    }

    if (this.isCharacterWalkable(nextX, sprite.y)) {
      sprite.setVelocity(vx, 0);
      return;
    }

    if (this.isCharacterWalkable(sprite.x, nextY)) {
      sprite.setVelocity(0, vy);
      return;
    }

    sprite.setVelocity(0, 0);
  }

  private syncCrewLabels(): void {
    for (const unit of this.crew) {
      unit.label
        ?.setPosition(unit.sprite.x, unit.sprite.y - 64)
        .setAlpha(1);
    }
  }

  private makeProp(x: number, y: number, key: string, mass: number): Phaser.Physics.Arcade.Image {
    const prop = this.physics.add.image(x, y, key).setDepth(44);
    prop.setData('mass', mass);
    prop.setData('homeX', x);
    prop.setData('homeY', y);
    prop.setDrag(45, 45);
    return prop;
  }

  private persist(): void {
    const save = SaveManager.get();
    save.player.position = { x: this.player.x, y: this.player.y };
    for (const state of save.crew) {
      const unit = this.crew.find((c) => c.id === state.id);
      if (!unit) continue;
      state.hp = unit.hp;
      state.position = { x: unit.sprite.x, y: unit.sprite.y };
    }
  }

  private pauseGame(): void {
    if (this.dead) return;
    this.persist();
    SaveManager.save();
    this.scene.launch('PauseScene', { source: this.scene.key });
    this.scene.pause();
  }

  private isWalkable(x: number, y: number): boolean {
    const land = y >= 535 && x >= 110 && x <= 1425;
    const centerDock = x >= 610 && x <= 900 && y >= 300 && y <= 650;
    const eastWalk = x >= 845 && x <= 1030 && y >= 330 && y <= 570;
    const eastDock = x >= 920 && x <= 1375 && y >= 220 && y <= 370;
    const shipRamp = x >= 1170 && x <= 1310 && y >= 165 && y <= 280;
    return land || centerDock || eastWalk || eastDock || shipRamp;
  }

  private isCharacterWalkable(x: number, y: number): boolean {
    const margin = 12;
    const samples: Array<[number, number]> = [
      [x, y],
      [x - margin, y],
      [x + margin, y],
      [x, y - margin],
      [x, y + margin],
      [x - margin, y - margin],
      [x + margin, y - margin],
      [x - margin, y + margin],
      [x + margin, y + margin],
    ];
    return samples.every(([px, py]) => this.isWalkable(px, py));
  }

  private drawHarbor(): void {
    this.add.rectangle(this.worldW / 2, this.worldH / 2, this.worldW, this.worldH, 0x173b49).setDepth(-20);

    const water = this.add.graphics().setDepth(-19);
    water.lineStyle(2, 0x78a8b7, 0.13);
    for (let y = 40; y < this.worldH; y += 52) {
      for (let x = 20; x < this.worldW; x += 90) {
        water.beginPath();
        water.moveTo(x, y);
        water.lineTo(x + 28, y - 5);
        water.lineTo(x + 55, y);
        water.strokePath();
      }
    }

    const ground = this.add.graphics().setDepth(-10);
    ground.fillStyle(0x6f6250, 1).fillRect(110, 535, 1315, 489);
    ground.fillStyle(0x7f6545, 1).fillRect(610, 300, 290, 350);
    ground.fillRect(845, 330, 185, 240);
    ground.fillRect(920, 220, 455, 150);
    ground.fillRect(1170, 165, 140, 115);

    ground.lineStyle(3, 0x3d3024, 0.8);
    for (let y = 555; y < 1024; y += 62) ground.lineBetween(110, y, 1425, y);
    for (let x = 630; x < 1380; x += 58) ground.lineBetween(x, 220, x, 650);

    this.add.text(170, 595, 'HARROW DOCKS', {
      fontFamily: 'Georgia, serif',
      fontSize: '32px',
      color: '#c7b99e',
    }).setAlpha(0.34).setDepth(-8);

    this.add.sprite(1240, 145, 'wayward-gull').setScale(1.18).setDepth(10);
    this.add.text(1240, 70, 'WAYWARD GULL', {
      fontFamily: 'system-ui, sans-serif',
      fontSize: '12px',
      color: '#d9e4e7',
      backgroundColor: '#071116aa',
      padding: { x: 8, y: 4 },
    }).setOrigin(0.5).setDepth(20);
  }
}
