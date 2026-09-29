import Phaser from 'phaser';
import { SaveManager } from '../state/SaveManager';
import { DialoguePanel, type DialogueChoice } from '../systems/DialoguePanel';
import { MobileControls } from '../systems/MobileControls';
import { InteractionSystem } from '../systems/InteractionSystem';
import { Toast } from '../systems/Toast';
import { advanceWorldClock, advanceWorldMinutes, formatWorldTime } from '../systems/WorldClock';

export class GullrockScene extends Phaser.Scene {
  private readonly worldW = 1500;
  private readonly worldH = 980;
  private player!: Phaser.Physics.Arcade.Sprite;
  private crew: Phaser.Physics.Arcade.Sprite[] = [];
  private keys!: Record<string, Phaser.Input.Keyboard.Key>;
  private mobile?: MobileControls;
  private interactions!: InteractionSystem;
  private dialogue!: DialoguePanel;
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

    const savedSpawn = this.isWalkable(save.player.position.x, save.player.position.y)
      ? save.player.position
      : { x: 725, y: 790 };
    this.player = this.physics.add.sprite(savedSpawn.x, savedSpawn.y, 'alexander').setDepth(50).setCollideWorldBounds(true);
    this.player.setBodySize(34, 30).setOffset(19, 70);
    this.lastValid.set(savedSpawn.x, savedSpawn.y);

    this.crew = [
      this.physics.add.sprite(665, 825, 'sera').setDepth(48).setCollideWorldBounds(true),
      this.physics.add.sprite(785, 825, 'rowan').setDepth(49).setCollideWorldBounds(true),
    ];

    this.dialogue = new DialoguePanel(this);
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
        interact: () => this.interact(),
        pause: () => this.pauseOrCloseDialogue(),
      });
      this.mobile.setCombatVisible(false);
    }

    this.cameras.main.startFollow(this.player, true, 0.12, 0.12);
    this.cameras.main.setZoom(this.scale.width < 700 ? 1.04 : 1);
    this.toast.show('The Wayward Gull ties off at Gullrock. No one here knows you yet.', 3000);
    SaveManager.save();
  }

  update(_time: number, deltaMs: number): void {
    if (this.dialogue.isOpen()) {
      this.player.setVelocity(0, 0);
      for (const member of this.crew) member.setVelocity(0, 0);
      this.mobile?.setInteract(null);
      this.updateHud();
      return;
    }

    const dt = Math.min(0.033, deltaMs / 1000);
    advanceWorldClock(SaveManager.get(), dt, 1.3);
    this.updatePlayer();
    this.updateCrew();

    const current = this.interactions.update();
    this.mobile?.setInteract(current?.label ?? null);
    const save = SaveManager.get();
    save.player.position = { x: this.player.x, y: this.player.y };
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

    this.keys.interact?.on('down', () => this.interact());
    this.keys.pause?.on('down', () => this.pauseOrCloseDialogue());
  }

  private interact(): void {
    if (this.dialogue.isOpen()) return;
    this.interactions.trigger();
  }

  private pauseOrCloseDialogue(): void {
    if (this.dialogue.isOpen()) {
      this.dialogue.close();
      return;
    }
    this.pauseGame();
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
      id: 'tavern-keeper',
      x: 405,
      y: 500,
      radius: 88,
      label: 'Talk',
      run: () => this.tavernKeeper(),
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
      id: 'shipwright',
      x: 1120,
      y: 540,
      radius: 92,
      label: 'Shipwright',
      run: () => this.shipwright(),
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

  private openDialogue(speaker: string, text: string, choices?: DialogueChoice[]): void {
    advanceWorldMinutes(SaveManager.get(), 1);
    this.player.setVelocity(0, 0);
    for (const member of this.crew) member.setVelocity(0, 0);
    this.mobile?.setVisible(false);

    this.dialogue.show({
      speaker,
      text,
      choices,
      onClose: () => {
        this.mobile?.setVisible(true);
        SaveManager.save();
      },
    });
  }

  private harborMaster(): void {
    const save = SaveManager.get();

    const legacyPaid = save.world.flags.gullrockDockFeePaid === true;
    let paidUntilDay = Number(save.world.flags.gullrockDockFeeUntilDay ?? 0);
    if (legacyPaid && paidUntilDay === 0) {
      paidUntilDay = save.world.day + 1;
      save.world.flags.gullrockDockFeeUntilDay = paidUntilDay;
      save.world.flags.gullrockDockFeePaid = false;
    }
    const berthPaid = paidUntilDay >= save.world.day;

    if (!berthPaid) {
      const canPay = save.player.berries >= 200;
      this.openDialogue(
        'Harbor Master',
        'The berth is yours for the day if you pay the fee. I do not care where you came from, only whether your crew causes trouble on my pier.',
        [
          {
            label: canPay ? 'Pay docking fee — 200 berries' : 'Docking fee — 200 berries (not enough)',
            disabled: !canPay,
            run: () => this.payDockFee(),
          },
          { label: 'Ask about Gullrock', run: () => this.harborInfo() },
          { label: 'Leave', run: () => undefined },
        ],
      );
      return;
    }

    this.openDialogue(
      'Harbor Master',
      'Your berth is paid through tomorrow. If the Gull needs work, the shipwright is east of the market. If you want gossip, buy a drink instead of asking me.',
      [
        { label: 'Ask about Gullrock', run: () => this.harborInfo() },
        { label: 'Leave', run: () => undefined },
      ],
    );
  }

  private payDockFee(): void {
    const save = SaveManager.get();
    const paidUntilDay = Number(save.world.flags.gullrockDockFeeUntilDay ?? 0);
    if (paidUntilDay >= save.world.day || save.player.berries < 200) return;

    save.player.berries -= 200;
    save.world.flags.gullrockDockFeePaid = false;
    save.world.flags.gullrockDockFeeUntilDay = save.world.day + 1;
    advanceWorldMinutes(save, 4);

    if (!save.journal.some((entry) => entry.id === 'gullrock-berth')) {
      save.journal.push({
        id: 'gullrock-berth',
        title: 'Gullrock berth',
        body: `The Wayward Gull has a paid berth at Gullrock through Day ${save.world.day + 1}.`,
        known: true,
      });
    }

    SaveManager.save();
    this.openDialogue(
      'Harbor Master',
      'Paid. Sera signs the berth register while the harbor master stamps the page without asking for names beyond the ship manifest.',
      [{ label: 'Done', run: () => undefined }],
    );
  }

  private harborInfo(): void {
    this.openDialogue(
      'Harbor Master',
      'Gullrock lives on repair work, coastal trade, and people who do not ask too many questions. Marines inspect the outer quay irregularly, usually around midday.',
      [{ label: 'Back', run: () => this.harborMaster() }],
    );
  }

  private provisioner(): void {
    const save = SaveManager.get();
    const tooFull = save.ship.supplies >= 96;
    const canBuy = save.player.berries >= 900 && !tooFull;

    this.openDialogue(
      'Provisioner',
      'Salted food, clean water, lamp oil, spare cloth, and a little medicine. I sell voyage packs to crews who want to leave quickly.',
      [
        {
          label: tooFull
            ? 'Voyage pack — cargo already full'
            : canBuy
              ? 'Buy voyage pack — 900 berries'
              : 'Voyage pack — 900 berries (not enough)',
          disabled: !canBuy,
          run: () => this.buyProvisions(),
        },
        { label: 'Ask about the sea east of Gullrock', run: () => this.provisionerRumor() },
        { label: 'Leave', run: () => undefined },
      ],
    );
  }

  private buyProvisions(): void {
    const save = SaveManager.get();
    if (save.player.berries < 900 || save.ship.supplies >= 96) return;

    save.player.berries -= 900;
    save.ship.supplies = Math.min(100, save.ship.supplies + 18);
    save.inventory['Rations'] = (save.inventory['Rations'] ?? 0) + 3;
    save.inventory['Fresh water'] = (save.inventory['Fresh water'] ?? 0) + 3;
    advanceWorldMinutes(save, 12);
    SaveManager.save();

    this.openDialogue(
      'Provisioner',
      'Two dockhands carry the food and water down to the Wayward Gull. Sera checks every bundle before it goes aboard.',
      [{ label: 'Done', run: () => undefined }],
    );
  }

  private provisionerRumor(): void {
    const save = SaveManager.get();
    save.world.flags.gullrockEastWeatherRumor = true;

    if (!save.journal.some((entry) => entry.id === 'gullrock-east-weather')) {
      save.journal.push({
        id: 'gullrock-east-weather',
        title: 'Weather east of Gullrock',
        body: 'Local sailors warn that the wind east of Gullrock strengthens after sunset and can push small ships south if they carry too much sail.',
        known: true,
      });
    }

    this.openDialogue(
      'Provisioner',
      'Eastbound captains have been reefing their sails before sunset. The wind turns hard from the north and small ships drift south if they get greedy with speed.',
      [{ label: 'Back', run: () => this.provisioner() }],
    );
  }

  private shipwright(): void {
    const save = SaveManager.get();
    const missing = Math.max(0, Math.ceil(save.ship.maxHull - save.ship.hull));

    if (missing <= 0) {
      this.openDialogue(
        'Shipwright',
        'I walked the Gull from bow to stern. She is sound enough for open water. Come back when the sea gives me something to fix.',
        [{ label: 'Leave', run: () => undefined }],
      );
      return;
    }

    const cost = Math.max(300, missing * 65);
    const repairMinutes = Math.max(30, missing * 2);
    const canAfford = save.player.berries >= cost;

    this.openDialogue(
      'Shipwright',
      save.world.flags.waywardGullDisabled
        ? `That emergency patch got you here, but I would not trust it through another reef. Full repair is ${cost.toLocaleString()} berries and about ${repairMinutes} minutes.`
        : `The Gull is down ${missing} points of hull integrity. I can restore her fully for ${cost.toLocaleString()} berries. Figure ${repairMinutes} minutes if my crew starts now.`,
      [
        {
          label: canAfford
            ? `Repair Wayward Gull — ${cost.toLocaleString()} berries`
            : `Repair — ${cost.toLocaleString()} berries (not enough)`,
          disabled: !canAfford,
          run: () => this.repairShip(cost, repairMinutes),
        },
        { label: 'Leave', run: () => undefined },
      ],
    );
  }

  private repairShip(cost: number, minutes: number): void {
    const save = SaveManager.get();
    if (save.player.berries < cost) return;

    save.player.berries -= cost;
    save.ship.hull = save.ship.maxHull;
    save.ship.speed = 0;
    save.world.flags.waywardGullDisabled = false;
    advanceWorldMinutes(save, minutes);

    for (const member of save.crew) {
      member.morale = Math.min(1, member.morale + 0.02);
    }

    if (!save.journal.some((entry) => entry.id === 'gullrock-ship-repair')) {
      save.journal.push({
        id: 'gullrock-ship-repair',
        title: 'Wayward Gull repaired',
        body: 'A Gullrock shipwright restored the Wayward Gull to full hull integrity after inspecting and replacing damaged planks and fittings.',
        known: true,
      });
    }

    SaveManager.save();
    this.openDialogue(
      'Shipwright',
      'Fresh planks, new fasteners, seams checked twice. The Gull is seaworthy again.',
      [{ label: 'Done', run: () => undefined }],
    );
  }

  private tavernKeeper(): void {
    const save = SaveManager.get();
    const canEat = save.player.berries >= 150;

    this.openDialogue(
      'Tavern Keeper',
      'Three strangers and a quiet navigator do not draw much attention here. Pay for a meal, ask a question, or keep moving.',
      [
        {
          label: canEat ? 'Buy a crew meal — 150 berries' : 'Crew meal — 150 berries (not enough)',
          disabled: !canEat,
          run: () => this.buyCrewMeal(),
        },
        { label: 'Ask about the Voss rumor', run: () => this.vossRumor() },
        { label: 'Ask about Marine patrols', run: () => this.marineRumor() },
        { label: 'Leave', run: () => undefined },
      ],
    );
  }

  private buyCrewMeal(): void {
    const save = SaveManager.get();
    if (save.player.berries < 150) return;

    save.player.berries -= 150;
    save.player.stamina = save.player.maxStamina;
    for (const member of save.crew) {
      member.morale = Math.min(1, member.morale + 0.04);
    }
    advanceWorldMinutes(save, 45);
    SaveManager.save();

    this.openDialogue(
      'Tavern Keeper',
      'Hot food, clean plates, no speeches. Rowan eats like he has not seen a table in a week. Sera spends most of the meal listening to nearby sailors.',
      [{ label: 'Done', run: () => undefined }],
    );
  }

  private vossRumor(): void {
    const save = SaveManager.get();
    save.world.flags.gullrockVossRumorKnown = true;

    if (!save.journal.some((entry) => entry.id === 'gullrock-rumor-voss')) {
      save.journal.push({
        id: 'gullrock-rumor-voss',
        title: 'Questions about Derrick Voss',
        body: 'A bounty-hunter crew passed through Gullrock asking about Derrick “Iron Nail” Voss. They carried a rough sketch of Voss, not Alexander.',
        known: true,
      });
    }

    this.openDialogue(
      'Tavern Keeper',
      'A bounty-hunter crew came through asking about Derrick “Iron Nail” Voss. They had his face sketched on cheap paper. Nobody showed me yours.',
      [{ label: 'Back', run: () => this.tavernKeeper() }],
    );
  }

  private marineRumor(): void {
    const save = SaveManager.get();
    save.world.flags.gullrockMarinePatrolKnown = true;

    if (!save.journal.some((entry) => entry.id === 'gullrock-marine-routine')) {
      save.journal.push({
        id: 'gullrock-marine-routine',
        title: 'Gullrock Marine routine',
        body: 'Marine inspections at Gullrock are inconsistent. The outer quay receives more attention around midday, but there is no permanent checkpoint inside the market.',
        known: true,
      });
    }

    this.openDialogue(
      'Tavern Keeper',
      'No permanent checkpoint. A patrol boat noses around the outer quay when it feels like it—often near midday. They care more about cargo papers than faces unless they came looking for someone.',
      [{ label: 'Back', run: () => this.tavernKeeper() }],
    );
  }

  private noticeboard(): void {
    const save = SaveManager.get();

    this.openDialogue(
      'Gullrock Noticeboard',
      'Fresh shipping circulars cover older wanted posters. One notice warns merchants about thieves working the north road. Another lists a Marine inspection advisory for the outer quay.',
      [
        {
          label: 'Read the older bounty notice underneath',
          run: () => {
            if (!save.journal.some((entry) => entry.id === 'gullrock-board-voss')) {
              save.journal.push({
                id: 'gullrock-board-voss',
                title: 'Old bounty notice',
                body: 'An older Gullrock notice mentions Derrick “Iron Nail” Voss at 8,000,000 berries. Nothing on the board identifies Alexander Vane.',
                known: true,
              });
            }
            SaveManager.save();
            this.openDialogue(
              'Gullrock Noticeboard',
              'Derrick Voss — 8,000,000 berries. The paper is weathered and partly covered by newer notices. There is nothing here with Alexander’s face.',
              [{ label: 'Back', run: () => this.noticeboard() }],
            );
          },
        },
        { label: 'Leave', run: () => undefined },
      ],
    );
  }

  private returnToSea(): void {
    const save = SaveManager.get();

    if (save.world.flags.waywardGullDisabled || save.ship.hull <= 0) {
      this.openDialogue(
        'Sera Quill',
        'We are not taking the Gull out like this. The shipwright is right there. If the hull fails outside the harbor, there may not be a second chance.',
        [{ label: 'Stay ashore', run: () => undefined }],
      );
      return;
    }

    this.openDialogue(
      'Sera Quill',
      'The Gull is ready. Once we cast off, the berth and the market are behind us until we turn back.',
      [
        { label: 'Set sail', run: () => this.confirmSetSail() },
        { label: 'Stay in Gullrock', run: () => undefined },
      ],
    );
  }

  private confirmSetSail(): void {
    const save = SaveManager.get();
    this.mobile?.setVisible(false);
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
      `Gull hull ${Math.ceil(save.ship.hull)}/${save.ship.maxHull} · Supplies ${Math.floor(save.ship.supplies)}`,
      this.sys.game.device.input.touch
        ? 'Use INTERACT near people and objects'
        : 'F near people and objects',
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
      [260, 135, 220, 160, 0x4b302b],
      [530, 135, 230, 155, 0x523b30],
      [810, 145, 210, 150, 0x4a3933],
      [1060, 140, 200, 160, 0x3f4540],
    ];
    for (const [x, y, w, h, color] of buildings) {
      g.fillStyle(color, 1).fillRoundedRect(x, y, w, h, 8);
      g.fillStyle(0xd3a65c, 0.75).fillRect(x + 25, y + 52, 28, 38);
    }

    this.add.text(370, 180, 'TAVERN', {
      fontFamily: 'Georgia, serif',
      fontSize: '13px',
      color: '#ead7b5',
    }).setOrigin(0.5).setDepth(26);
    this.add.text(1160, 185, 'SHIPWRIGHT', {
      fontFamily: 'Georgia, serif',
      fontSize: '13px',
      color: '#d7e1df',
    }).setOrigin(0.5).setDepth(26);

    this.add.circle(405, 500, 24, 0xa66d54, 1).setDepth(25);
    this.add.text(405, 460, 'Tavern Keeper', { fontSize: '12px', color: '#f0f4f5' }).setOrigin(0.5).setDepth(26);

    this.add.circle(575, 560, 24, 0xb99162, 1).setDepth(25);
    this.add.text(575, 520, 'Harbor Master', { fontSize: '12px', color: '#f0f4f5' }).setOrigin(0.5).setDepth(26);

    this.add.circle(955, 500, 24, 0x7ebc85, 1).setDepth(25);
    this.add.text(955, 460, 'Provisioner', { fontSize: '12px', color: '#f0f4f5' }).setOrigin(0.5).setDepth(26);

    this.add.circle(1120, 540, 24, 0x8b9fa1, 1).setDepth(25);
    this.add.text(1120, 500, 'Shipwright', { fontSize: '12px', color: '#f0f4f5' }).setOrigin(0.5).setDepth(26);

    g.fillStyle(0x503520, 1).fillRect(755, 340, 60, 70);
    this.add.text(785, 320, 'Noticeboard', { fontSize: '12px', color: '#f0f4f5' }).setOrigin(0.5).setDepth(26);
    this.add.image(725, 930, 'wayward-gull').setScale(0.72).setDepth(20);
  }
}
