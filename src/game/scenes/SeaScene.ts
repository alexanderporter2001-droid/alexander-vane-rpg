import Phaser from 'phaser';
import { SaveManager } from '../state/SaveManager';
import { DialoguePanel } from '../systems/DialoguePanel';
import { resolveDialogueAI } from '../systems/DialogueAI';
import { CrewStatusHud } from '../systems/CrewStatusHud';
import { equippedEffects } from '../systems/Equipment';
import { MobileControls, shouldUseMobileControls } from '../systems/MobileControls';
import { Toast } from '../systems/Toast';
import { advanceWorldClock, formatWorldTime } from '../systems/WorldClock';

interface Port {
  id: 'harrow' | 'gullrock';
  name: string;
  x: number;
  y: number;
  radius: number;
  approachX: number;
  approachY: number;
  dockX: number;
  dockY: number;
}

type NavigationMode = 'manual' | 'sera';

export class SeaScene extends Phaser.Scene {
  private readonly worldW = 4200;
  private readonly worldH = 3200;
  private readonly ports: Port[] = [
    {
      id: 'harrow',
      name: 'Harrow Island',
      x: 760,
      y: 1760,
      radius: 320,
      approachX: 760,
      approachY: 2160,
      dockX: 760,
      dockY: 2020,
    },
    {
      id: 'gullrock',
      name: 'Gullrock Port',
      x: 2790,
      y: 760,
      radius: 370,
      approachX: 2790,
      approachY: 1215,
      dockX: 2790,
      dockY: 1065,
    },
  ];
  private readonly safeWaypoint = new Phaser.Math.Vector2(2300, 1850);

  private ship!: Phaser.Physics.Arcade.Sprite;
  private keys!: Record<string, Phaser.Input.Keyboard.Key>;
  private mobile?: MobileControls;
  private toast!: Toast;
  private dialogue!: DialoguePanel;
  private hud!: Phaser.GameObjects.Text;
  private nav!: Phaser.GameObjects.Text;
  private crewHud!: CrewStatusHud;
  private wake!: Phaser.GameObjects.Particles.ParticleEmitter;

  private navigationMode: NavigationMode = 'manual';
  private navTarget!: Port;
  private speed = 0;
  private heading = -Math.PI / 2;
  private lastSaveAt = 0;
  private nearestPort: Port | null = null;
  private breachNotified = false;
  private arrivalNotifiedPortId: Port['id'] | null = null;
  private arrivalReady = false;
  private docking = false;

  private deck?: Phaser.GameObjects.Container;
  private deckPlayer?: Phaser.GameObjects.Image;
  private deckSera?: Phaser.GameObjects.Image;
  private deckRowan?: Phaser.GameObjects.Image;
  private deckPlayerLocal = new Phaser.Math.Vector2(0, 62);

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

    this.navTarget = this.resolveNavigationTarget();
    this.navigationMode = this.canSeraNavigate() && save.world.flags.sailingDelegated !== false
      ? 'sera'
      : 'manual';

    this.createInput();
    this.toast = new Toast(this);
    this.dialogue = new DialoguePanel(this);
    this.createHud();
    this.crewHud = new CrewStatusHud(this);

    if (shouldUseMobileControls()) {
      this.mobile = new MobileControls(this, {
        primary: () => undefined,
        secondary: () => undefined,
        dash: () => undefined,
        interact: () => this.contextAction(),
        order: () => this.toggleNavigationMode(),
        pause: () => this.pauseOrCloseDialogue(),
      });
      this.mobile.setCombatVisible(false);
    }

    this.createDeckView();
    this.applyNavigationPresentation(false);

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

    if (this.navigationMode === 'sera') {
      if (Math.abs(this.speed) < 35) this.speed = 52;
      this.toast.show(`Sera takes the helm for ${this.navTarget.name}. You are free to move around the deck.`, 3600);
    } else {
      this.toast.show('No navigator is currently handling the helm. Alexander must steer.', 3300);
    }
  }

  update(_time: number, deltaMs: number): void {
    const dt = Math.min(0.033, deltaMs / 1000);
    const save = SaveManager.get();
    advanceWorldClock(save, dt, 5.5);

    if (Math.abs(this.speed) > 25 && save.ship.supplies > 0) {
      save.ship.supplies = Math.max(0, save.ship.supplies - dt * 0.004);
    }

    const talking = this.dialogue.isOpen();

    if (this.docking) {
      this.updateHud();
      return;
    }

    if (this.navigationMode === 'sera') {
      if (!this.canSeraNavigate()) {
        this.navigationMode = 'manual';
        save.world.flags.sailingDelegated = false;
        this.toast.show('Sera cannot navigate right now. Alexander has to take the helm.', 3400);
        this.applyNavigationPresentation();
      } else {
        this.updateSeraNavigation(dt);
        if (!talking) this.updateDeckMovement(dt);
      }
    } else {
      this.updateManualShip(dt);
    }

    this.applyShipVelocity(dt);
    this.syncDeckToShip();
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
      delegate: 'R',
      pause: Phaser.Input.Keyboard.KeyCodes.ESC,
    }) as Record<string, Phaser.Input.Keyboard.Key>;

    this.keys.dock?.on('down', () => this.contextAction());
    this.keys.delegate?.on('down', () => {
      if (!this.dialogue.isOpen()) this.toggleNavigationMode();
    });
    this.keys.pause?.on('down', () => this.pauseOrCloseDialogue());
  }

  private getMoveInput(): Phaser.Math.Vector2 {
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

  private updateManualShip(dt: number): void {
    const move = this.getMoveInput();
    const turn = move.x;
    const throttle = -move.y;

    const steerStrength = Phaser.Math.Clamp(Math.abs(this.speed) / 125 + 0.28, 0.28, 1);
    this.heading += Phaser.Math.Clamp(turn, -1, 1) * 1.35 * steerStrength * dt;

    if (throttle > 0.05) this.speed += 78 * throttle * dt;
    else if (throttle < -0.05) this.speed += 100 * throttle * dt;
    else this.speed *= Math.pow(0.992, dt * 60);

    this.speed = Phaser.Math.Clamp(this.speed, -48, 205);
  }

  private updateSeraNavigation(dt: number): void {
    const point = this.getAutopilotPoint();
    const desired = Phaser.Math.Angle.Between(this.ship.x, this.ship.y, point.x, point.y);
    const turn = Phaser.Math.Angle.Wrap(desired - this.heading);
    this.heading += Phaser.Math.Clamp(turn, -1.1, 1.1) * 1.25 * dt;

    const approachDistance = Phaser.Math.Distance.Between(
      this.ship.x,
      this.ship.y,
      this.navTarget.approachX,
      this.navTarget.approachY,
    );

    if (approachDistance <= 34) {
      this.speed = 0;
      this.enterArrivalApproach();
      return;
    }

    const sera = SaveManager.get().crew.find((member) => member.id === 'sera');
    const awareness = sera ? equippedEffects(sera.equipment).seaAwarenessBonus : 0;

    let targetSpeed = 155;
    if (approachDistance < 520 + awareness) targetSpeed = 92;
    if (approachDistance < 250 + awareness * 0.45) targetSpeed = 54;
    if (approachDistance < 110 + awareness * 0.2) targetSpeed = 24;

    const accel = targetSpeed > this.speed ? 54 : 82;
    this.speed = Phaser.Math.Linear(this.speed, targetSpeed, Phaser.Math.Clamp((accel * dt) / 160, 0, 1));
    this.speed = Phaser.Math.Clamp(this.speed, 0, 170);
  }

  private getAutopilotPoint(): Phaser.Math.Vector2 {
    const waypointDistance = Phaser.Math.Distance.Between(
      this.ship.x,
      this.ship.y,
      this.safeWaypoint.x,
      this.safeWaypoint.y,
    );

    if (this.navTarget.id === 'gullrock' && this.ship.x < 2390 && waypointDistance > 190) {
      return this.safeWaypoint;
    }
    if (this.navTarget.id === 'harrow' && this.ship.x > 2180 && waypointDistance > 190) {
      return this.safeWaypoint;
    }

    return new Phaser.Math.Vector2(this.navTarget.approachX, this.navTarget.approachY);
  }

  private updateDeckMovement(dt: number): void {
    if (!this.deckPlayer) return;

    const move = this.getMoveInput();
    this.deckPlayerLocal.x = Phaser.Math.Clamp(this.deckPlayerLocal.x + move.x * 118 * dt, -66, 66);
    this.deckPlayerLocal.y = Phaser.Math.Clamp(this.deckPlayerLocal.y + move.y * 118 * dt, -88, 106);

    const taper = Math.abs(this.deckPlayerLocal.y) > 74 ? 54 : 66;
    this.deckPlayerLocal.x = Phaser.Math.Clamp(this.deckPlayerLocal.x, -taper, taper);
    this.deckPlayer.setPosition(this.deckPlayerLocal.x, this.deckPlayerLocal.y);
  }

  private applyShipVelocity(dt: number): void {
    const save = SaveManager.get();
    if (save.world.flags.waywardGullDisabled || save.ship.hull <= 0) {
      this.disableGull();
      return;
    }

    const vx = Math.cos(this.heading) * this.speed;
    const vy = Math.sin(this.heading) * this.speed;
    const nextX = this.ship.x + vx * 0.16;
    const nextY = this.ship.y + vy * 0.16;

    if (this.ports.some((port) => this.isInsideIslandLand(nextX, nextY, port))) {
      this.speed = 0;
      this.ship.setVelocity(0, 0);
    } else {
      this.ship.setVelocity(vx, vy);
    }
    this.ship.setRotation(this.heading + Math.PI / 2);

    if (this.ship.x < 35 || this.ship.x > this.worldW - 35 || this.ship.y < 35 || this.ship.y > this.worldH - 35) {
      this.speed *= 0.45;
    }

    const inReef = this.isInReef(this.ship.x, this.ship.y);
    if (inReef && Math.abs(this.speed) > 80) {
      save.ship.hull = Math.max(0, save.ship.hull - 8 * dt);
      this.speed *= 0.97;
      if (Math.random() < 0.025) this.cameras.main.shake(70, 0.003);
      if (save.ship.hull <= 0) this.disableGull();
    }
  }

  private toggleNavigationMode(): void {
    if (this.navigationMode === 'sera') {
      this.navigationMode = 'manual';
      SaveManager.get().world.flags.sailingDelegated = false;
      this.toast.show('Alexander takes the helm. Sera steps away and watches the water.', 2600);
      this.applyNavigationPresentation();
      SaveManager.save();
      return;
    }

    if (!this.canSeraNavigate()) {
      this.toast.show('Sera is not able to take the helm right now.', 2600);
      return;
    }

    this.navigationMode = 'sera';
    SaveManager.get().world.flags.sailingDelegated = true;
    if (this.speed < 35) this.speed = 52;
    this.toast.show(`Sera takes the helm and resumes the course for ${this.navTarget.name}.`, 2900);
    this.applyNavigationPresentation();
    SaveManager.save();
  }

  private applyNavigationPresentation(showToast = true): void {
    const delegated = this.navigationMode === 'sera';
    const deckMode = delegated && !this.arrivalReady;
    this.ship.setVisible(!deckMode);
    this.deck?.setVisible(deckMode);

    if (delegated && this.arrivalReady) {
      this.cameras.main.startFollow(this.ship, true, 0.07, 0.07);
      this.cameras.main.setZoom(this.scale.width < 700 ? 1.08 : 1.02);
      this.mobile?.setOrderLabel('TAKE HELM');
    } else if (delegated) {
      this.cameras.main.startFollow(this.ship, true, 0.12, 0.12);
      this.cameras.main.setZoom(this.scale.width < 700 ? 1.55 : 1.42);
      this.mobile?.setOrderLabel('TAKE HELM');
      if (showToast) this.toast.show('Sera has the course. Move freely around the deck.', 2300);
    } else {
      this.cameras.main.startFollow(this.ship, true, 0.08, 0.08);
      this.cameras.main.setZoom(this.scale.width < 700 ? 0.82 : 0.95);
      this.mobile?.setOrderLabel('SERA HELM');
    }
  }

  private enterArrivalApproach(): void {
    if (this.arrivalReady) return;
    this.arrivalReady = true;
    this.speed = 0;
    this.ship.setVelocity(0, 0);
    this.applyNavigationPresentation(false);
    this.arrivalNotifiedPortId = this.navTarget.id;
    this.toast.show(
      `Sera: ${this.navTarget.name} ahead. We're holding offshore—give the word and I'll bring the Gull into the harbor.`,
      4200,
    );
  }

  private canSeraNavigate(): boolean {
    const sera = SaveManager.get().crew.find((member) => member.id === 'sera');
    return Boolean(sera && sera.hp > 0);
  }

  private resolveNavigationTarget(): Port {
    const save = SaveManager.get();
    const requested = save.world.flags.shipDestination;
    if (requested === 'harrow' || requested === 'gullrock') {
      const port = this.ports.find((candidate) => candidate.id === requested);
      if (port) return port;
    }

    const byDistance = [...this.ports].sort((a, b) => {
      const da = Phaser.Math.Distance.Between(save.ship.x, save.ship.y, a.x, a.y);
      const db = Phaser.Math.Distance.Between(save.ship.x, save.ship.y, b.x, b.y);
      return da - db;
    });
    const nearest = byDistance[0];
    const target = nearest?.id === 'harrow'
      ? this.ports.find((port) => port.id === 'gullrock')
      : this.ports.find((port) => port.id === 'harrow');

    const resolved = target ?? this.ports[1]!;
    save.world.flags.shipDestination = resolved.id;
    return resolved;
  }

  private createDeckView(): void {
    const deck = this.add.container(this.ship.x, this.ship.y).setDepth(310);

    const g = this.add.graphics();
    g.fillStyle(0x0b0d0e, 0.28).fillEllipse(0, 12, 210, 320);
    g.fillStyle(0x6f4e31, 1).fillRoundedRect(-92, -148, 184, 296, 62);
    g.lineStyle(5, 0xb58b56, 0.92).strokeRoundedRect(-92, -148, 184, 296, 62);
    g.lineStyle(2, 0x3e2b1d, 0.62);
    for (let y = -110; y <= 110; y += 28) g.lineBetween(-78, y, 78, y);

    g.fillStyle(0x4f351f, 1).fillRoundedRect(-64, 56, 128, 62, 10);
    g.lineStyle(3, 0x271a11, 0.8).strokeRoundedRect(-64, 56, 128, 62, 10);

    g.fillStyle(0x3a291b, 1).fillRect(-5, -126, 10, 170);
    g.fillStyle(0xc6b289, 0.92).fillTriangle(8, -116, 8, -44, 70, -65);
    g.fillStyle(0x172735, 1).fillCircle(0, -103, 18);
    g.lineStyle(4, 0xb98a4c, 1).strokeCircle(0, -103, 18);

    g.fillStyle(0x51371f, 1).fillRoundedRect(-78, 124, 156, 18, 8);
    g.lineStyle(3, 0x2b1d13, 0.7).strokeRoundedRect(-78, 124, 156, 18, 8);

    const title = this.add.text(0, -171, 'WAYWARD GULL · DECK', {
      fontFamily: 'Georgia, serif',
      fontSize: '12px',
      fontStyle: 'bold',
      color: '#f0e4c7',
      backgroundColor: '#071116cc',
      padding: { x: 8, y: 4 },
    }).setOrigin(0.5);

    this.deckPlayer = this.add.image(this.deckPlayerLocal.x, this.deckPlayerLocal.y, 'alexander')
      .setScale(0.58)
      .setDepth(8);
    this.deckSera = this.add.image(0, -80, 'sera').setScale(0.54).setDepth(7);
    this.deckRowan = this.add.image(48, 22, 'rowan').setScale(0.56).setDepth(7);

    const seraLabel = this.add.text(0, -121, 'SERA · HELM', {
      fontFamily: 'system-ui, sans-serif',
      fontSize: '9px',
      fontStyle: 'bold',
      color: '#d6edf6',
      backgroundColor: '#071116bb',
      padding: { x: 4, y: 2 },
    }).setOrigin(0.5);

    const rowanLabel = this.add.text(48, -20, 'ROWAN', {
      fontFamily: 'system-ui, sans-serif',
      fontSize: '9px',
      fontStyle: 'bold',
      color: '#f0d9cb',
      backgroundColor: '#071116bb',
      padding: { x: 4, y: 2 },
    }).setOrigin(0.5);

    deck.add([g, title, this.deckSera, this.deckRowan, this.deckPlayer, seraLabel, rowanLabel]);
    this.deck = deck;

    const save = SaveManager.get();
    const sera = save.crew.find((member) => member.id === 'sera');
    const rowan = save.crew.find((member) => member.id === 'rowan');
    if (sera && sera.hp <= 0) {
      this.deckSera.setTint(0x555b5f).setAlpha(0.7).setAngle(90);
      seraLabel.setText('SERA · DOWN').setColor('#ffd3ca');
    }
    if (rowan && rowan.hp <= 0) {
      this.deckRowan.setTint(0x555b5f).setAlpha(0.7).setAngle(90);
      rowanLabel.setText('ROWAN · DOWN').setColor('#ffd3ca');
    }
  }

  private syncDeckToShip(): void {
    if (!this.deck) return;
    this.deck.setPosition(this.ship.x, this.ship.y);
  }

  private disableGull(): void {
    const save = SaveManager.get();
    save.ship.hull = 0;
    save.ship.speed = 0;
    save.world.flags.waywardGullDisabled = true;
    this.speed = 0;
    this.ship.setVelocity(0, 0);
    if (!this.breachNotified) {
      this.breachNotified = true;
      this.toast.show('Hull breach. The Gull is disabled; movement is impossible until the crew makes an emergency patch.', 4200);
      SaveManager.save();
    }
  }

  private emergencyPatch(): void {
    const save = SaveManager.get();
    const rope = save.inventory['Rope'] ?? 0;
    if (rope < 1 || save.ship.supplies < 18) {
      this.toast.show('Sera: We do not have enough rope and spare supplies for a seaworthy emergency patch.', 4200);
      return;
    }

    save.inventory['Rope'] = rope - 1;
    save.ship.supplies -= 18;
    save.ship.hull = 18;
    save.world.flags.waywardGullDisabled = false;
    for (const crew of save.crew) crew.morale = Math.max(0, crew.morale - 0.06);
    advanceWorldClock(save, 180 * 60, 1);

    if (!save.journal.some((entry) => entry.id === 'gull-emergency-patch')) {
      save.journal.push({
        id: 'gull-emergency-patch',
        title: 'Emergency hull patch',
        body: 'The Wayward Gull suffered a hull breach at sea. The crew consumed rope and supplies to make a temporary repair. A proper shipwright is still needed.',
        known: true,
      });
    }

    this.breachNotified = false;
    SaveManager.save();
    this.toast.show('Three hours later, the emergency patch holds. The Gull can move again, but the hull is in bad shape.', 4500);
  }

  private updateNavigation(): void {
    const save = SaveManager.get();
    if (save.world.flags.waywardGullDisabled) {
      this.mobile?.setInteract('Patch hull');
      return;
    }

    let best: { port: Port; d: number } | null = null;
    for (const port of this.ports) {
      const d = Phaser.Math.Distance.Between(
        this.ship.x,
        this.ship.y,
        port.approachX,
        port.approachY,
      );
      if (!best || d < best.d) best = { port, d };
    }
    this.nearestPort = best?.port ?? null;

    const gullrock = this.ports[1];
    if (gullrock) {
      const d = Phaser.Math.Distance.Between(this.ship.x, this.ship.y, gullrock.x, gullrock.y);
      if (d < 760 && !save.world.flags.gullrockDiscovered) {
        save.world.flags.gullrockDiscovered = true;
        this.toast.show('Sera: Land ahead. Gullrock Port.');
      }
    }

    if (
      this.navigationMode === 'sera' &&
      best?.port.id === this.navTarget.id &&
      best.d <= 40
    ) {
      this.enterArrivalApproach();
    }

    const canDock = Boolean(best && best.d <= 70 && Math.abs(this.speed) <= 28);
    const talkTarget = this.deckTalkTarget();
    if (talkTarget) {
      this.mobile?.setInteract(`Talk ${talkTarget === 'sera' ? 'Sera' : 'Rowan'}`);
    } else {
      this.mobile?.setInteract(canDock ? `Dock ${best?.port.name ?? ''}` : null);
    }
  }

  private contextAction(): void {
    if (this.dialogue.isOpen()) return;
    const target = this.deckTalkTarget();
    if (target) {
      this.openCrewConversation(target);
      return;
    }
    this.tryDock();
  }

  private deckTalkTarget(): 'sera' | 'rowan' | null {
    if (this.navigationMode !== 'sera' || !this.deck?.visible) return null;

    const save = SaveManager.get();
    const sera = save.crew.find((member) => member.id === 'sera');
    const rowan = save.crew.find((member) => member.id === 'rowan');

    const seraDistance = Phaser.Math.Distance.Between(
      this.deckPlayerLocal.x,
      this.deckPlayerLocal.y,
      0,
      -80,
    );
    const rowanDistance = Phaser.Math.Distance.Between(
      this.deckPlayerLocal.x,
      this.deckPlayerLocal.y,
      48,
      22,
    );

    const candidates: Array<{ id: 'sera' | 'rowan'; distance: number }> = [];
    if (sera && sera.hp > 0 && seraDistance <= 72) candidates.push({ id: 'sera', distance: seraDistance });
    if (rowan && rowan.hp > 0 && rowanDistance <= 72) candidates.push({ id: 'rowan', distance: rowanDistance });
    candidates.sort((a, b) => a.distance - b.distance);
    return candidates[0]?.id ?? null;
  }

  private openCrewConversation(id: 'sera' | 'rowan'): void {
    const save = SaveManager.get();
    const member = save.crew.find((candidate) => candidate.id === id);
    if (!member || member.hp <= 0) return;

    this.mobile?.setVisible(false);
    const speaker = id === 'sera' ? 'Sera Quill' : 'Rowan Vale';
    const opening = id === 'sera'
      ? 'Sera keeps one hand near the helm and glances over. “I can listen. The course is steady.”'
      : 'Rowan leans against the rail. “What is it?”';

    this.dialogue.show({
      speaker,
      text: opening,
      choices: [{ label: 'End conversation', run: () => undefined }],
      freeform: {
        placeholder: `Say anything to ${speaker}...`,
        onSubmit: async (message, history) => {
          const current = SaveManager.get();
          current.world.flags[`talkedTo-${id}`] = true;
          const result = await resolveDialogueAI(id, message, current, history);

          if (id === 'sera' && result.action.type === 'set_course') {
            const port = this.ports.find((candidate) => candidate.id === result.action.target);
            if (port) {
              current.world.flags.shipDestination = port.id;
              this.navTarget = port;
              this.arrivalReady = false;
              this.arrivalNotifiedPortId = null;
              if (this.navigationMode === 'sera' && this.speed < 35) this.speed = 52;
              this.applyNavigationPresentation(false);
            }
          }

          if (id === 'sera' && result.action.type === 'set_helm') {
            if (result.action.target === 'sera' && this.canSeraNavigate()) {
              this.navigationMode = 'sera';
              current.world.flags.sailingDelegated = true;
              if (this.speed < 35) this.speed = 52;
              this.applyNavigationPresentation(false);
            } else if (result.action.target === 'alexander') {
              this.navigationMode = 'manual';
              current.world.flags.sailingDelegated = false;
              this.applyNavigationPresentation(false);
            }
          }

          SaveManager.save();
          return result.reply;
        },
      },
      onClose: () => {
        this.mobile?.setVisible(true);
        SaveManager.save();
      },
    });
  }

  private pauseOrCloseDialogue(): void {
    if (this.dialogue.isOpen()) {
      this.dialogue.close();
      return;
    }
    this.pauseGame();
  }

  private tryDock(): void {
    if (SaveManager.get().world.flags.waywardGullDisabled) {
      this.emergencyPatch();
      return;
    }
    if (!this.nearestPort || this.docking) return;

    const d = Phaser.Math.Distance.Between(
      this.ship.x,
      this.ship.y,
      this.nearestPort.approachX,
      this.nearestPort.approachY,
    );

    if (d > 70) {
      this.toast.show('We are not lined up with the harbor approach yet.');
      return;
    }
    if (Math.abs(this.speed) > 28) {
      this.toast.show('Too fast to begin docking. Reduce speed first.');
      return;
    }

    this.beginDockingSequence(this.nearestPort);
  }

  private beginDockingSequence(port: Port): void {
    this.docking = true;
    this.arrivalReady = true;
    this.speed = 0;
    this.ship.setVelocity(0, 0);
    this.deck?.setVisible(false);
    this.ship.setVisible(true);
    this.mobile?.setVisible(false);

    this.cameras.main.startFollow(this.ship, true, 0.08, 0.08);
    this.cameras.main.setZoom(this.scale.width < 700 ? 1.16 : 1.08);
    this.toast.show(`Sera brings the Wayward Gull in toward ${port.name}'s dock.`, 2400);

    const angle = Phaser.Math.Angle.Between(this.ship.x, this.ship.y, port.dockX, port.dockY);
    this.heading = angle;
    this.ship.setRotation(angle + Math.PI / 2);

    this.tweens.add({
      targets: this.ship,
      x: port.dockX,
      y: port.dockY,
      duration: 1600,
      ease: 'Sine.easeInOut',
      onComplete: () => {
        this.cameras.main.fadeOut(360, 5, 12, 18);
        this.time.delayedCall(390, () => this.completeDock(port));
      },
    });
  }

  private completeDock(port: Port): void {
    const save = SaveManager.get();
    save.ship.x = port.dockX;
    save.ship.y = port.dockY;
    save.ship.heading = this.heading;
    save.ship.speed = 0;

    if (port.id === 'gullrock') {
      save.world.scene = 'gullrock';
      save.world.locationId = 'gullrock-port';
      save.world.flags.gullrockDiscovered = true;
      save.world.flags.shipDestination = 'harrow';
      save.player.position = { x: 620, y: 760 };
      SaveManager.save();
      this.scene.start('GullrockScene');
      return;
    }

    save.world.scene = 'harrow';
    save.world.locationId = 'harrow-island';
    save.world.flags.shipDestination = 'gullrock';
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
    const delegated = this.navigationMode === 'sera';
    this.hud.setText([
      `Wayward Gull · Hull ${Math.ceil(save.ship.hull)}/${save.ship.maxHull}`,
      `Supplies ${Math.floor(save.ship.supplies)} · Speed ${Math.round(Math.abs(this.speed))}`,
      `Berries ${save.player.berries.toLocaleString()}`,
      delegated
        ? `Sera at helm · course: ${this.navTarget.name}`
        : 'Alexander at helm · R / ORDER gives helm to Sera',
      delegated
        ? 'Walk the deck freely · R / ORDER takes the helm'
        : 'W/S throttle · A/D steer · F dock',
    ]);

    const dist = Math.round(Phaser.Math.Distance.Between(
      this.ship.x,
      this.ship.y,
      this.navTarget.approachX,
      this.navTarget.approachY,
    ));
    const bearing = this.cardinal(Phaser.Math.Angle.Between(
      this.ship.x,
      this.ship.y,
      this.navTarget.x,
      this.navTarget.y,
    ));
    this.nav.setText([
      formatWorldTime(save),
      `${this.navTarget.name}: ${dist} m ${bearing}`,
      `World position: ${Math.round(this.ship.x)}, ${Math.round(this.ship.y)}`,
    ]);

    this.crewHud.update(save.crew.map((member) => ({
      id: member.id,
      name: member.name,
      hp: member.hp,
      maxHp: member.maxHp,
    })));
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
    save.world.flags.sailingDelegated = this.navigationMode === 'sera';
    SaveManager.save();
    this.scene.launch('PauseScene', { source: this.scene.key });
    this.scene.pause();
  }

  private isInsideIslandLand(x: number, y: number, port: Port): boolean {
    const dx = (x - port.x) / (port.radius * 1.02);
    const dy = (y - port.y) / (port.radius * 0.68);
    return dx * dx + dy * dy < 1;
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
        waves.lineTo(x + 56, y);
        waves.lineTo(x + 112, y);
        waves.strokePath();
      }
    }

    this.drawIsland(760, 1760, 320, 0x6c6a4b, 'HARROW');
    this.drawIsland(2790, 760, 370, 0x657451, 'GULLROCK');
    for (const port of this.ports) this.drawHarborApproach(port);

    const reef = this.add.graphics().setDepth(-8);
    reef.fillStyle(0x65a7ad, 0.35).fillCircle(1840, 1320, 210);
    reef.fillStyle(0x75b4b7, 0.28).fillCircle(2150, 1160, 135);
    reef.lineStyle(2, 0xd5eced, 0.25).strokeCircle(1840, 1320, 210).strokeCircle(2150, 1160, 135);

    this.add.text(1840, 1320, 'REEF', {
      fontFamily: 'system-ui, sans-serif',
      fontSize: '12px',
      color: '#d7edef',
    }).setOrigin(0.5).setAlpha(0.55).setDepth(-7);
  }

  private drawHarborApproach(port: Port): void {
    const g = this.add.graphics().setDepth(-6);
    g.lineStyle(4, 0x7a5b3d, 0.9);
    g.lineBetween(port.dockX - 34, port.dockY, port.dockX + 34, port.dockY);
    g.lineStyle(2, 0xd7edef, 0.28);
    g.strokeCircle(port.approachX, port.approachY, 28);
    this.add.text(port.approachX, port.approachY + 40, 'HARBOR APPROACH', {
      fontFamily: 'system-ui, sans-serif',
      fontSize: '10px',
      color: '#d7edef',
      backgroundColor: '#07111688',
      padding: { x: 5, y: 3 },
    }).setOrigin(0.5).setDepth(-5);
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
