import Phaser from 'phaser';
import { SaveManager } from '../state/SaveManager';
import { DialoguePanel, type DialogueChoice } from '../systems/DialoguePanel';
import type { DialogueSpeakerId } from '../systems/DialogueIntent';
import { resolveDialogueAI } from '../systems/DialogueAI';
import { CrewStatusHud } from '../systems/CrewStatusHud';
import { EQUIPMENT, GULLROCK_GEAR_STOCK, isCompatible } from '../systems/Equipment';
import { MobileControls, shouldUseMobileControls } from '../systems/MobileControls';
import { InteractionSystem } from '../systems/InteractionSystem';
import { Toast } from '../systems/Toast';
import { advanceWorldClock, advanceWorldMinutes } from '../systems/WorldClock';

export class GullrockScene extends Phaser.Scene {
  private readonly worldW = 1500;
  private readonly worldH = 980;
  private player!: Phaser.Physics.Arcade.Sprite;
  private crew: Phaser.Physics.Arcade.Sprite[] = [];
  private crewLabels: Phaser.GameObjects.Text[] = [];
  private keys!: Record<string, Phaser.Input.Keyboard.Key>;
  private mobile?: MobileControls;
  private interactions!: InteractionSystem;
  private dialogue!: DialoguePanel;
  private toast!: Toast;
  private hud!: Phaser.GameObjects.Text;
  private crewHud!: CrewStatusHud;
  private dockJobMarkers: Phaser.GameObjects.Text[] = [];
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
    this.createDockJobMarkers();

    const savedSpawn = this.isWalkable(save.player.position.x, save.player.position.y)
      ? save.player.position
      : { x: 725, y: 790 };
    this.player = this.physics.add.sprite(savedSpawn.x, savedSpawn.y, 'alexander').setDepth(50).setCollideWorldBounds(true);
    this.player.setBodySize(34, 30).setOffset(19, 70);
    this.lastValid.set(savedSpawn.x, savedSpawn.y);

    const sera = this.physics.add.sprite(665, 825, 'sera').setDepth(48).setCollideWorldBounds(true);
    const rowan = this.physics.add.sprite(785, 825, 'rowan').setDepth(49).setCollideWorldBounds(true);
    this.crew = [sera, rowan];
    this.crewLabels = [
      this.makeCrewLabel(sera, 'SERA QUILL', '#d6edf6'),
      this.makeCrewLabel(rowan, 'ROWAN VALE', '#f0d9cb'),
    ];

    this.dialogue = new DialoguePanel(this);
    this.createInput();
    this.toast = new Toast(this);
    this.interactions = new InteractionSystem(this.player);
    this.registerInteractions();
    this.createHud();
    this.crewHud = new CrewStatusHud(this);
    this.crewHud.setVisible(false);

    if (shouldUseMobileControls()) {
      this.mobile = new MobileControls(this, {
        primary: () => undefined,
        secondary: () => undefined,
        dash: () => undefined,
        interact: () => this.interact(),
        pause: () => this.pauseOrCloseDialogue(),
      });
      this.mobile.setCombatVisible(false);
    }

    this.cameras.main.startFollow(this.player, true, 0.08, 0.08);
    this.cameras.main.setDeadzone(
      Math.min(280, this.scale.width * 0.38),
      Math.min(220, this.scale.height * 0.28),
    );
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
    this.updateDockJobMarkers();
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
    this.syncCrewLabels();
  }

  private makeCrewLabel(sprite: Phaser.Physics.Arcade.Sprite, text: string, color: string): Phaser.GameObjects.Text {
    return this.add.text(sprite.x, sprite.y - 58, text, {
      fontFamily: 'system-ui, sans-serif',
      fontSize: '11px',
      fontStyle: 'bold',
      color,
      backgroundColor: '#071116c9',
      padding: { x: 5, y: 3 },
    }).setOrigin(0.5, 1).setDepth(84);
  }

  private syncCrewLabels(): void {
    this.crewLabels.forEach((label, index) => {
      const sprite = this.crew[index];
      if (sprite) label.setPosition(sprite.x, sprite.y - 58);
    });
  }

  private follow(sprite: Phaser.Physics.Arcade.Sprite, x: number, y: number, speed: number): void {
    const v = new Phaser.Math.Vector2(x - sprite.x, y - sprite.y);
    if (v.length() < 44) {
      sprite.setVelocity(0, 0);
      return;
    }
    v.normalize().scale(speed);
    const lookahead = 0.14;
    const nextX = sprite.x + v.x * lookahead;
    const nextY = sprite.y + v.y * lookahead;

    if (this.isWalkable(nextX, nextY)) {
      sprite.setVelocity(v.x, v.y);
    } else if (this.isWalkable(nextX, sprite.y)) {
      sprite.setVelocity(v.x, 0);
    } else if (this.isWalkable(sprite.x, nextY)) {
      sprite.setVelocity(0, v.y);
    } else {
      sprite.setVelocity(0, 0);
    }
  }

  private registerInteractions(): void {
    const sera = () => this.crew[0];
    const rowan = () => this.crew[1];

    this.interactions.register({
      id: 'sera',
      x: () => sera()?.x ?? -9999,
      y: () => sera()?.y ?? -9999,
      radius: 78,
      label: 'Talk Sera',
      enabled: () => (SaveManager.get().crew.find((member) => member.id === 'sera')?.hp ?? 0) > 0,
      run: () => this.crewConversation('sera'),
    });
    this.interactions.register({
      id: 'rowan',
      x: () => rowan()?.x ?? -9999,
      y: () => rowan()?.y ?? -9999,
      radius: 78,
      label: 'Talk Rowan',
      enabled: () => (SaveManager.get().crew.find((member) => member.id === 'rowan')?.hp ?? 0) > 0,
      run: () => this.crewConversation('rowan'),
    });
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
      label: 'Brann Cale — Shipwright',
      run: () => this.shipwright(),
    });
    this.interactions.register({
      id: 'elias',
      x: 660,
      y: 385,
      radius: 76,
      label: 'Talk Elias',
      run: () => this.localConversation('elias'),
    });
    this.interactions.register({
      id: 'nico',
      x: 770,
      y: 600,
      radius: 76,
      label: 'Talk Nico',
      run: () => this.localConversation('nico'),
    });
    this.interactions.register({
      id: 'maris',
      x: 1085,
      y: 355,
      radius: 78,
      label: 'Talk Maris',
      run: () => this.localConversation('maris'),
    });
    this.interactions.register({
      id: 'perrin',
      x: 520,
      y: 365,
      radius: 76,
      label: 'Talk Perrin',
      run: () => this.localConversation('perrin'),
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
      id: 'dock-work-a',
      x: 585,
      y: 735,
      radius: 72,
      label: 'Load cargo 1/3',
      enabled: () => SaveManager.get().world.flags.gullrockDockJobActive === true
        && Number(SaveManager.get().world.flags.gullrockDockJobProgress ?? 0) === 0,
      run: () => this.workCargoPoint(0),
    });
    this.interactions.register({
      id: 'dock-work-b',
      x: 885,
      y: 735,
      radius: 72,
      label: 'Load cargo 2/3',
      enabled: () => SaveManager.get().world.flags.gullrockDockJobActive === true
        && Number(SaveManager.get().world.flags.gullrockDockJobProgress ?? 0) === 1,
      run: () => this.workCargoPoint(1),
    });
    this.interactions.register({
      id: 'dock-work-c',
      x: 725,
      y: 825,
      radius: 72,
      label: 'Load cargo 3/3',
      enabled: () => SaveManager.get().world.flags.gullrockDockJobActive === true
        && Number(SaveManager.get().world.flags.gullrockDockJobProgress ?? 0) === 2,
      run: () => this.workCargoPoint(2),
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

    const intentSpeaker = this.intentSpeakerFor(speaker);
    this.dialogue.show({
      speaker,
      text,
      choices,
      freeform: intentSpeaker
        ? {
            placeholder: `Say anything to ${speaker}...`,
            onSubmit: async (message, history) => {
              const save = SaveManager.get();
              advanceWorldMinutes(save, 1);
              save.world.flags[`talkedTo-${intentSpeaker}`] = true;
              const result = await resolveDialogueAI(intentSpeaker, message, save, history);
              if (result.action.type === 'set_course' && intentSpeaker === 'sera') {
                save.world.flags.shipDestination = result.action.target;
              }
              if (result.action.type === 'set_helm' && intentSpeaker === 'sera') {
                save.world.flags.sailingDelegated = result.action.target === 'sera';
              }
              SaveManager.save();
              return result.reply;
            },
          }
        : undefined,
      onClose: () => {
        this.mobile?.setVisible(true);
        SaveManager.save();
      },
    });
  }

  private intentSpeakerFor(speaker: string): DialogueSpeakerId | null {
    const normalized = speaker.toLowerCase();
    if (normalized.includes('sera')) return 'sera';
    if (normalized.includes('rowan')) return 'rowan';
    if (normalized.includes('harbor master')) return 'harbor-master';
    if (normalized.includes('tavern keeper')) return 'tavern-keeper';
    if (normalized.includes('provisioner')) return 'provisioner';
    if (normalized.includes('shipwright')) return 'shipwright';
    if (normalized.includes('elias')) return 'elias';
    if (normalized.includes('nico')) return 'nico';
    if (normalized.includes('maris')) return 'maris';
    if (normalized.includes('perrin')) return 'perrin';
    return null;
  }

  private localConversation(id: 'elias' | 'nico' | 'maris' | 'perrin'): void {
    const openings: Record<typeof id, { speaker: string; text: string }> = {
      elias: {
        speaker: 'Elias — Sailor',
        text: 'Elias glances from the harbor mouth back to you. “Need something?”',
      },
      nico: {
        speaker: 'Nico — Dockhand',
        text: 'Nico sets down the rope coil he was moving. “Yeah?”',
      },
      maris: {
        speaker: 'Maris — Coastal Trader',
        text: 'Maris gives you the quick measuring look of someone used to pricing risk. “What are you after?”',
      },
      perrin: {
        speaker: 'Perrin — Porter',
        text: 'Perrin braces one hand on a crate and looks over. “Got a question?”',
      },
    };

    if (id === 'maris') {
      this.traderShop();
      return;
    }

    if (id === 'nico') {
      this.dockWork();
      return;
    }

    const opening = openings[id];
    this.openDialogue(
      opening.speaker,
      opening.text,
      [{ label: 'End conversation', run: () => undefined }],
    );
  }

  private traderStock(itemId: string): number {
    const save = SaveManager.get();
    const key = `gullrockGearStock-${itemId}`;
    const existing = save.world.flags[key];
    if (typeof existing === 'number') return Math.max(0, Math.floor(existing));

    const starting = itemId === 'padded-deck-guard' || itemId === 'weatherproof-coat' ? 2 : 1;
    save.world.flags[key] = starting;
    return starting;
  }

  private compatibleNames(itemId: string): string {
    const save = SaveManager.get();
    const item = EQUIPMENT[itemId];
    if (!item) return 'nobody';

    const names: string[] = [];
    if (isCompatible(item, save.player.equipmentTags)) names.push('Alexander');
    for (const member of save.crew) {
      if (isCompatible(item, member.equipmentTags)) names.push(member.name.split(' ')[0] ?? member.name);
    }
    return names.length ? names.join(', ') : 'no current crew';
  }

  private traderShop(): void {
    const save = SaveManager.get();
    const choices: DialogueChoice[] = GULLROCK_GEAR_STOCK.map((itemId) => {
      const item = EQUIPMENT[itemId];
      if (!item) {
        return {
          label: 'Unknown stock item',
          disabled: true,
          run: () => undefined,
        };
      }
      const stock = this.traderStock(itemId);
      const canAfford = save.player.berries >= item.price;
      return {
        label: stock <= 0
          ? `${item.name} — SOLD OUT`
          : canAfford
            ? `${item.name} — ${item.price.toLocaleString()} berries · fits ${this.compatibleNames(itemId)}`
            : `${item.name} — ${item.price.toLocaleString()} berries (not enough)`,
        disabled: stock <= 0 || !canAfford,
        run: () => this.buyEquipment(itemId),
      };
    });

    choices.push({ label: 'Just talk', run: () => this.openDialogue(
      'Maris — Coastal Trader',
      'Maris folds her arms over the counter. “Fine. What did you actually want to ask?”',
      [{ label: 'Back to stock', run: () => this.traderShop() }],
    ) });
    choices.push({ label: 'Leave', run: () => undefined });

    this.openDialogue(
      'Maris — Coastal Trader',
      `“Gear costs what it costs. I do not sell people things they cannot use.”\n\nYou have ${save.player.berries.toLocaleString()} berries. Bought equipment goes into the ship's gear inventory until you assign it from the GEAR tab.`,
      choices,
    );
  }

  private buyEquipment(itemId: string): void {
    const save = SaveManager.get();
    const item = EQUIPMENT[itemId];
    if (!item) return;

    const stock = this.traderStock(itemId);
    if (stock <= 0 || save.player.berries < item.price) return;

    save.player.berries -= item.price;
    save.equipmentInventory[itemId] = (save.equipmentInventory[itemId] ?? 0) + 1;
    save.world.flags[`gullrockGearStock-${itemId}`] = stock - 1;
    advanceWorldMinutes(save, 3);
    SaveManager.save();

    this.openDialogue(
      'Maris — Coastal Trader',
      `Maris wraps the ${item.name} for the Gull. “${item.description} Assign it to somebody who can actually use it.”\n\nRemaining berries: ${save.player.berries.toLocaleString()}.`,
      [
        { label: 'Back to gear stock', run: () => this.traderShop() },
        { label: 'Done', run: () => undefined },
      ],
    );
  }

  private dockWork(): void {
    const save = SaveManager.get();
    const active = save.world.flags.gullrockDockJobActive === true;
    const completedDay = Number(save.world.flags.gullrockDockShiftDay ?? 0);
    const progress = Number(save.world.flags.gullrockDockJobProgress ?? 0);

    if (active) {
      this.openDialogue(
        'Nico — Dockhand',
        `“Still got that loading shift. You are ${progress}/3 stacks in. Follow the cargo markers on the main quay.”`,
        [
          { label: 'Talk about something else', run: () => this.openDialogue(
            'Nico — Dockhand',
            'Nico wipes his hands on his trousers. “All right. What is it?”',
            [{ label: 'Back', run: () => this.dockWork() }],
          ) },
          { label: 'Leave', run: () => undefined },
        ],
      );
      return;
    }

    if (completedDay === save.world.day) {
      this.openDialogue(
        'Nico — Dockhand',
        '“You already did a paid loading shift today. I can probably find more work tomorrow, but the harbor master is not paying twice for the same hands.”',
        [
          { label: 'Talk', run: () => this.openDialogue(
            'Nico — Dockhand',
            'Nico leans against a bollard. “What do you want to know?”',
            [{ label: 'Back', run: () => this.dockWork() }],
          ) },
          { label: 'Leave', run: () => undefined },
        ],
      );
      return;
    }

    this.openDialogue(
      'Nico — Dockhand',
      '“If you want honest money, three cargo stacks need to reach the outgoing pier before the tide turns. Pay is 2,400 berries for the shift. Walk the quay, load all three, then you are done.”',
      [
        { label: 'Take loading shift — 2,400 berries on completion', run: () => this.acceptDockShift() },
        { label: 'Just talk', run: () => this.openDialogue(
          'Nico — Dockhand',
          'Nico sets the rope coil aside. “Sure. What did you want?”',
          [{ label: 'Back', run: () => this.dockWork() }],
        ) },
        { label: 'Leave', run: () => undefined },
      ],
    );
  }

  private acceptDockShift(): void {
    const save = SaveManager.get();
    save.world.flags.gullrockDockJobActive = true;
    save.world.flags.gullrockDockJobProgress = 0;
    advanceWorldMinutes(save, 2);
    SaveManager.save();
    this.dialogue.close();
    this.updateDockJobMarkers();
    this.toast.show('Dock shift started · follow the CARGO 1 marker on the quay.', 3600);
  }

  private workCargoPoint(expectedProgress: number): void {
    const save = SaveManager.get();
    if (save.world.flags.gullrockDockJobActive !== true) return;

    const progress = Number(save.world.flags.gullrockDockJobProgress ?? 0);
    if (progress !== expectedProgress) return;

    const next = progress + 1;
    save.world.flags.gullrockDockJobProgress = next;
    advanceWorldMinutes(save, 12);

    if (next < 3) {
      SaveManager.save();
      this.updateDockJobMarkers();
      this.toast.show(`Cargo loaded · ${next}/3. Follow the next cargo marker.`, 3000);
      return;
    }

    const pay = 2_400;
    save.player.berries += pay;
    save.world.flags.gullrockDockJobActive = false;
    save.world.flags.gullrockDockShiftDay = save.world.day;
    save.world.flags.gullrockDockJobProgress = 0;

    if (!save.journal.some((entry) => entry.id === 'gullrock-dock-work')) {
      save.journal.push({
        id: 'gullrock-dock-work',
        title: 'Paid Work in Gullrock',
        body: 'Nico can arrange one paid cargo-loading shift per day at Gullrock. Completing the three quay loading points pays 2,400 berries.',
        known: true,
      });
    }

    SaveManager.save();
    this.updateDockJobMarkers();
    this.toast.show(`Shift complete · +${pay.toLocaleString()} berries.`, 4200);
  }

  private crewConversation(id: 'sera' | 'rowan'): void {
    const save = SaveManager.get();
    const state = save.crew.find((member) => member.id === id);
    if (!state || state.hp <= 0) return;

    if (id === 'sera') {
      this.openDialogue(
        'Sera Quill',
        `Sera turns toward you, keeping one eye on the harbor. “What do you need?”`,
        [{ label: 'End conversation', run: () => undefined }],
      );
      return;
    }

    this.openDialogue(
      'Rowan Vale',
      'Rowan rests one chain hook against his shoulder and looks over. “Yeah?”',
      [{ label: 'End conversation', run: () => undefined }],
    );
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
        'Dren Pike — Harbor Master',
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
      'Dren Pike — Harbor Master',
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
      'Dren Pike — Harbor Master',
      'Paid. Sera signs the berth register while the harbor master stamps the page without asking for names beyond the ship manifest.',
      [{ label: 'Done', run: () => undefined }],
    );
  }

  private harborInfo(): void {
    this.openDialogue(
      'Dren Pike — Harbor Master',
      'Gullrock lives on repair work, coastal trade, and people who do not ask too many questions. Marines inspect the outer quay irregularly, usually around midday.',
      [{ label: 'Back', run: () => this.harborMaster() }],
    );
  }

  private provisioner(): void {
    const save = SaveManager.get();
    const tooFull = save.ship.supplies >= 96;
    const canBuy = save.player.berries >= 900 && !tooFull;

    this.openDialogue(
      'Toma Reed — Provisioner',
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
      'Toma Reed — Provisioner',
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
      'Toma Reed — Provisioner',
      'Eastbound captains have been reefing their sails before sunset. The wind turns hard from the north and small ships drift south if they get greedy with speed.',
      [{ label: 'Back', run: () => this.provisioner() }],
    );
  }

  private shipwright(): void {
    const save = SaveManager.get();
    const missing = Math.max(0, Math.ceil(save.ship.maxHull - save.ship.hull));

    if (missing <= 0) {
      this.openDialogue(
        'Brann Cale — Shipwright',
        'I walked the Gull from bow to stern. She is sound enough for open water. Come back when the sea gives me something to fix.',
        [{ label: 'Leave', run: () => undefined }],
      );
      return;
    }

    const cost = Math.max(300, missing * 65);
    const repairMinutes = Math.max(30, missing * 2);
    const canAfford = save.player.berries >= cost;

    this.openDialogue(
      'Brann Cale — Shipwright',
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
      'Brann Cale — Shipwright',
      'Fresh planks, new fasteners, seams checked twice. The Gull is seaworthy again.',
      [{ label: 'Done', run: () => undefined }],
    );
  }

  private tavernKeeper(): void {
    const save = SaveManager.get();
    const canEat = save.player.berries >= 150;

    this.openDialogue(
      'Marta Vell — Tavern Keeper',
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
      'Marta Vell — Tavern Keeper',
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
      'Marta Vell — Tavern Keeper',
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
      'Marta Vell — Tavern Keeper',
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
    save.world.flags.shipDestination = 'harrow';
    save.world.flags.sailingDelegated = true;
    SaveManager.save();

    this.cameras.main.fadeOut(350, 5, 12, 18);
    this.time.delayedCall(380, () => this.scene.start('SeaScene'));
  }

  private pauseGame(): void {
    SaveManager.save();
    this.hud.setVisible(false);
    this.crewHud.setVisible(false);
    this.mobile?.setVisible(false);
    this.events.once('resume', () => { this.hud.setVisible(true); this.mobile?.setVisible(true); });
    this.scene.launch('PauseScene', { source: this.scene.key });
    this.scene.pause();
  }

  private createDockJobMarkers(): void {
    const points = [
      { x: 585, y: 735, label: 'CARGO 1' },
      { x: 885, y: 735, label: 'CARGO 2' },
      { x: 725, y: 825, label: 'CARGO 3' },
    ];

    this.dockJobMarkers = points.map((point) =>
      this.add.text(point.x, point.y - 34, point.label, {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '11px',
        fontStyle: 'bold',
        color: '#fff1b9',
        backgroundColor: '#382b13dd',
        padding: { x: 7, y: 4 },
      }).setOrigin(0.5).setDepth(70).setVisible(false),
    );
  }

  private updateDockJobMarkers(): void {
    const save = SaveManager.get();
    const active = save.world.flags.gullrockDockJobActive === true;
    const progress = Number(save.world.flags.gullrockDockJobProgress ?? 0);

    this.dockJobMarkers.forEach((marker, index) => {
      marker.setVisible(active && index === progress);
    });
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
    this.hud.setText([`Gullrock Port`, `HP ${Math.ceil(save.player.hp)}/${save.player.maxHp}`]);
    this.crewHud.setVisible(false);
    this.crewHud.update(save.crew.map((member) => ({
      id: member.id,
      name: member.name,
      hp: member.hp,
      maxHp: member.maxHp,
    })));
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

    // Water and shoreline
    g.fillStyle(0x123d50, 1).fillRect(0, 0, this.worldW, this.worldH);
    g.fillStyle(0x1b5265, 0.7).fillRect(0, 560, this.worldW, 420);

    g.lineStyle(2, 0x9ed4df, 0.10);
    for (let y = 30; y < this.worldH; y += 58) {
      for (let x = 0; x < this.worldW; x += 120) {
        g.beginPath();
        g.moveTo(x, y);
        g.lineTo(x + 38, y - 4);
        g.lineTo(x + 76, y + 2);
        g.strokePath();
      }
    }

    // Main quay, market stone, and upper town.
    g.fillStyle(0x66503a, 1).fillRoundedRect(500, 650, 450, 330, 8);
    g.fillStyle(0x9b895d, 1).fillRoundedRect(320, 310, 860, 420, 10);
    g.fillStyle(0x747c50, 1).fillRoundedRect(210, 120, 1080, 280, 14);

    // Pier planks and rope posts.
    g.lineStyle(3, 0x3f2d20, 0.65);
    for (let y = 675; y < 970; y += 42) g.lineBetween(515, y, 935, y);
    for (let x = 520; x <= 930; x += 82) {
      g.fillStyle(0x3b2a1e, 1).fillRoundedRect(x, 650, 10, 44, 4);
      g.fillStyle(0xb99a6d, 0.75).fillCircle(x + 5, 651, 5);
    }

    // Market walkways and patches of grass.
    g.lineStyle(3, 0x6f6146, 0.45);
    for (let x = 360; x <= 1130; x += 95) g.lineBetween(x, 325, x, 715);
    g.fillStyle(0x5c6e43, 0.75).fillCircle(265, 330, 54);
    g.fillCircle(1240, 330, 62);
    g.fillCircle(860, 185, 42);

    const buildings: Array<[number, number, number, number, number, number]> = [
      [250, 135, 230, 165, 0x4b302b, 0x7e4b35],
      [520, 135, 240, 158, 0x523b30, 0x85573c],
      [805, 142, 220, 154, 0x4a3933, 0x715042],
      [1050, 137, 215, 165, 0x3f4540, 0x59645e],
    ];

    for (const [x, y, w, h, wall, roof] of buildings) {
      g.fillStyle(0x19130f, 0.30).fillRoundedRect(x + 8, y + 10, w, h, 10);
      g.fillStyle(wall, 1).fillRoundedRect(x, y, w, h, 9);
      g.fillStyle(roof, 1).fillTriangle(x - 12, y + 18, x + w / 2, y - 26, x + w + 12, y + 18);
      g.fillStyle(0x2a211d, 1).fillRoundedRect(x + w / 2 - 18, y + h - 54, 36, 54, 5);
      for (const wx of [x + 32, x + w - 62]) {
        g.fillStyle(0xd3a65c, 0.82).fillRoundedRect(wx, y + 54, 30, 38, 4);
        g.fillStyle(0x30434a, 0.35).fillRect(wx + 4, y + 58, 22, 30);
      }
    }

    // Market stalls and cargo make the port feel occupied.
    const stalls: Array<[number, number, number]> = [
      [470, 420, 0xb65e4a],
      [700, 455, 0xd09a4e],
      [880, 410, 0x557b72],
      [1040, 410, 0x8b5e8a],
    ];
    for (const [x, y, canopy] of stalls) {
      g.fillStyle(0x6d4a2f, 1).fillRoundedRect(x - 36, y, 72, 38, 5);
      g.fillStyle(canopy, 1).fillTriangle(x - 48, y + 2, x, y - 28, x + 48, y + 2);
      g.lineStyle(3, 0x3b2b21, 0.8).lineBetween(x - 28, y + 35, x - 28, y + 70);
      g.lineBetween(x + 28, y + 35, x + 28, y + 70);
    }

    // Lamps, barrels, crates, and a little dock clutter.
    const lamps: Array<[number, number]> = [[350, 625], [1165, 625], [550, 735], [900, 735]];
    for (const [x, y] of lamps) {
      g.fillStyle(0x2f2d2a, 1).fillRect(x - 3, y - 42, 6, 42);
      g.fillStyle(0xf2c76a, 0.82).fillCircle(x, y - 48, 7);
      g.fillStyle(0xf2c76a, 0.10).fillCircle(x, y - 48, 24);
    }

    for (const [x, y] of [[430, 665], [470, 690], [1010, 690], [1070, 705]] as Array<[number, number]>) {
      this.add.image(x, y, 'crate').setScale(0.72).setDepth(18);
    }
    for (const [x, y] of [[600, 610], [900, 575], [1180, 350]] as Array<[number, number]>) {
      this.add.image(x, y, 'barrel').setScale(0.72).setDepth(18);
    }

    this.add.text(365, 180, 'THE SALT CUP', {
      fontFamily: 'Georgia, serif',
      fontSize: '13px',
      color: '#ead7b5',
      backgroundColor: '#2a1714aa',
      padding: { x: 7, y: 4 },
    }).setOrigin(0.5).setDepth(26);
    this.add.text(1160, 185, 'SHIPWRIGHT', {
      fontFamily: 'Georgia, serif',
      fontSize: '13px',
      color: '#d7e1df',
      backgroundColor: '#1b2221aa',
      padding: { x: 7, y: 4 },
    }).setOrigin(0.5).setDepth(26);

    const npc = (
      x: number,
      y: number,
      texture: string,
      label: string,
      labelColor = '#f0f4f5',
    ) => {
      this.add.image(x, y, texture).setScale(0.62).setDepth(25);
      this.add.text(x, y - 58, label, {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '11px',
        fontStyle: 'bold',
        color: labelColor,
        backgroundColor: '#071116c7',
        padding: { x: 5, y: 3 },
      }).setOrigin(0.5, 1).setDepth(26);
    };

    npc(405, 500, 'npc-tavern', 'Marta Vell — Tavern Keeper', '#f2d8bd');
    npc(575, 560, 'npc-harbor', 'Dren Pike — Harbor Master', '#d9e8ed');
    npc(955, 500, 'npc-provisioner', 'Toma Reed — Provisioner', '#dce6c8');
    npc(1120, 540, 'npc-shipwright', 'Brann Cale — Shipwright', '#e2d4c8');

    // Named locals are full conversation targets rather than decorative quest-marker filler.
    npc(660, 385, 'npc-sailor', 'Elias — Sailor', '#c9d8dc');
    npc(770, 600, 'npc-dockhand', 'Nico — Dockhand', '#c9d8dc');
    npc(1085, 355, 'npc-sailor', 'Maris — Coastal Trader', '#c9d8dc');
    npc(520, 365, 'npc-dockhand', 'Perrin — Porter', '#c9d8dc');

    g.fillStyle(0x503520, 1).fillRoundedRect(755, 340, 60, 70, 5);
    g.fillStyle(0xe1d4b3, 1).fillRect(765, 350, 40, 20);
    g.fillStyle(0xc9b889, 1).fillRect(765, 376, 30, 18);
    this.add.text(785, 320, 'NOTICEBOARD', {
      fontFamily: 'system-ui, sans-serif',
      fontSize: '11px',
      fontStyle: 'bold',
      color: '#f0f4f5',
      backgroundColor: '#071116aa',
      padding: { x: 5, y: 3 },
    }).setOrigin(0.5).setDepth(26);

    // Moored ship and shoreline foam.
    this.add.image(725, 930, 'wayward-gull').setScale(0.72).setDepth(20);
    g.lineStyle(4, 0xcbe3e8, 0.22);
    g.beginPath().moveTo(510, 646).lineTo(945, 646).strokePath();
  }

}
