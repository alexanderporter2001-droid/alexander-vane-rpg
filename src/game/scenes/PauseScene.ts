import Phaser from 'phaser';
import { SaveManager } from '../state/SaveManager';
import { routeCampaign } from '../state/SceneRouter';
import { formatWorldTime } from '../systems/WorldClock';
import {
  EQUIPMENT,
  availableEquipmentCount,
  equipItem,
  equipmentDefinition,
  isCompatible,
  unequipSlot,
} from '../systems/Equipment';
import type { EquipmentLoadout, EquipmentSlot } from '../state/types';

interface PauseData { source: string }
type Tab = 'overview' | 'gear' | 'journal' | 'save';

export class PauseScene extends Phaser.Scene {
  private source = 'HarrowScene';
  private panel!: Phaser.GameObjects.Container;
  private content!: Phaser.GameObjects.Text;
  private tab: Tab = 'overview';
  private panelW = 720;
  private panelH = 620;
  private saveButtons: Phaser.GameObjects.Text[] = [];
  private gearWearerIndex = 0;

  constructor() { super('PauseScene'); }

  create(data: PauseData): void {
    this.source = data.source || 'HarrowScene';
    document.body.classList.add('journal-open');
    const { width, height } = this.scale;

    this.add.rectangle(0, 0, width, height, 0x020609, 0.88)
      .setOrigin(0)
      .setInteractive();

    this.panelW = Math.min(760, width - 24);
    this.panelH = Math.min(680, height - 34);

    const bg = this.add.rectangle(0, 0, this.panelW, this.panelH, 0x0c1820, 0.99)
      .setStrokeStyle(2, 0x7896a0, 0.42);

    const title = this.add.text(-this.panelW / 2 + 24, -this.panelH / 2 + 20, 'CAPTAIN’S JOURNAL', {
      fontFamily: 'Georgia, serif',
      fontSize: width < 600 ? '24px' : '28px',
      color: '#f1e6ca',
      fontStyle: 'bold',
    });

    const tabs = [
      this.makeTab('OVERVIEW', -this.panelW / 2 + 24, -this.panelH / 2 + 68, 'overview'),
      this.makeTab('GEAR', -this.panelW / 2 + 126, -this.panelH / 2 + 68, 'gear'),
      this.makeTab('JOURNAL', -this.panelW / 2 + 194, -this.panelH / 2 + 68, 'journal'),
      this.makeTab('SAVE', -this.panelW / 2 + 286, -this.panelH / 2 + 68, 'save'),
    ];

    this.content = this.add.text(-this.panelW / 2 + 24, -this.panelH / 2 + 118, '', {
      fontFamily: 'system-ui, sans-serif',
      fontSize: width < 600 ? '12px' : '14px',
      color: '#d9e4e7',
      lineSpacing: 5,
      wordWrap: { width: this.panelW - 48 },
    });

    const resume = this.makeButton('RESUME', -this.panelW / 2 + 24, this.panelH / 2 - 52, () => this.resumeGame());
    const titleButton = this.makeButton('TITLE', -this.panelW / 2 + 124, this.panelH / 2 - 52, () => this.toTitle(), true);

    this.panel = this.add.container(width / 2, height / 2, [bg, title, ...tabs, this.content, resume, titleButton]).setDepth(100);
    this.renderTab();

    this.input.keyboard?.once('keydown-ESC', () => this.resumeGame());
    this.scale.on('resize', this.onResize, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.scale.off('resize', this.onResize, this);
      document.body.classList.remove('journal-open');
    });
  }

  private makeTab(label: string, x: number, y: number, tab: Tab): Phaser.GameObjects.Text {
    const button = this.add.text(x, y, label, {
      fontFamily: 'system-ui, sans-serif',
      fontSize: '11px',
      fontStyle: 'bold',
      color: '#cfe0e5',
      backgroundColor: '#18303b',
      padding: { x: 10, y: 7 },
    }).setInteractive({ useHandCursor: true });

    button.on('pointerdown', () => {
      this.tab = tab;
      this.renderTab();
    });
    return button;
  }

  private renderTab(): void {
    this.clearSaveButtons();
    if (this.tab === 'overview') this.renderOverview();
    else if (this.tab === 'gear') this.renderGear();
    else if (this.tab === 'journal') this.renderJournal();
    else this.renderSaveTools();
  }

  private renderOverview(): void {
    const save = SaveManager.get();
    const crew = save.crew
      .map((c) => `${c.name} — ${c.role} · HP ${Math.ceil(c.hp)}/${c.maxHp} · morale ${Math.round(c.morale * 100)}%`)
      .join('\n');

    const inventory = Object.entries(save.inventory)
      .map(([name, count]) => `${name}: ${count}`)
      .join('   ·   ');

    const currentObjective =
      save.world.scene === 'harrow'
        ? save.journal.find((j) => j.id === 'harrow-escape')
        : save.world.scene === 'sea'
          ? { title: 'At sea', body: 'Sail where you choose. Gullrock is currently charted.' }
          : { title: 'Gullrock Port', body: 'Explore, resupply, gather information, or return to sea.' };

    this.content.setText([
      `${formatWorldTime(save)} · ${save.world.locationId.replaceAll('-', ' ')}`,
      '',
      'CURRENT OBJECTIVE',
      `${currentObjective?.title ?? 'No immediate objective'}`,
      currentObjective?.body ?? '',
      '',
      'CAPTAIN',
      `HP ${Math.ceil(save.player.hp)}/${save.player.maxHp} · Stamina ${Math.ceil(save.player.stamina)}/${save.player.maxStamina}`,
      `Berries ${save.player.berries.toLocaleString()} · Bounty ${save.player.bounty.toLocaleString()}`,
      `Fruit familiarity ${Math.round(save.player.fruit.mastery * 100)}% · name unknown`,
      `Combat experience ${Math.floor(save.player.progression.combatExperience)} · conditioning ${Math.round(save.player.progression.physicalConditioning * 100)}%`,
      '',
      'CREW',
      crew,
      '',
      'WAYWARD GULL',
      `Hull ${Math.ceil(save.ship.hull)}/${save.ship.maxHull} · Supplies ${Math.ceil(save.ship.supplies)}`,
      '',
      'INVENTORY',
      inventory || 'Empty',
    ].join('\n'));
  }

  private loadoutLines(loadout: EquipmentLoadout): string[] {
    const slots: EquipmentSlot[] = ['weapon', 'armor', 'tool', 'accessory'];
    return slots.map((slot) => {
      const item = equipmentDefinition(loadout[slot]);
      return `${slot.toUpperCase()}: ${item?.name ?? '—'}`;
    });
  }

  private renderGear(): void {
    const save = SaveManager.get();
    const wearers = [
      {
        id: 'alexander',
        name: 'Alexander Vane',
        tags: save.player.equipmentTags,
        loadout: save.player.equipment,
      },
      ...save.crew.map((member) => ({
        id: member.id,
        name: member.name,
        tags: member.equipmentTags,
        loadout: member.equipment,
      })),
    ];

    if (!wearers.length) return;
    this.gearWearerIndex = Phaser.Math.Wrap(this.gearWearerIndex, 0, wearers.length);
    const wearer = wearers[this.gearWearerIndex]!;

    const owned = Object.entries(save.equipmentInventory)
      .filter(([, count]) => count > 0)
      .map(([itemId, count]) => {
        const item = EQUIPMENT[itemId];
        if (!item) return null;
        const fits = isCompatible(item, wearer.tags);
        const free = availableEquipmentCount(save, itemId);
        return `${item.name} ×${count} · ${fits ? 'compatible' : 'not compatible'} · ${free} free`;
      })
      .filter((line): line is string => Boolean(line));

    this.content.setText([
      `BERRIES  ${save.player.berries.toLocaleString()}`,
      '',
      `SELECTED: ${wearer.name}  (${this.gearWearerIndex + 1}/${wearers.length})`,
      `Compatibility: ${wearer.tags.join(', ')}`,
      '',
      ...this.loadoutLines(wearer.loadout),
      '',
      'OWNED EQUIPMENT',
      owned.length ? owned.join('\n') : 'No equipment purchased yet. Maris sells gear at Gullrock.',
      '',
      'Use the buttons below to change wearer or equip compatible owned gear.',
    ].join('\n'));

    const prev = this.makeButton('◀ PERSON', 0, 0, () => {
      this.gearWearerIndex = Phaser.Math.Wrap(this.gearWearerIndex - 1, 0, wearers.length);
      this.renderTab();
    }, true);
    const next = this.makeButton('PERSON ▶', 0, 0, () => {
      this.gearWearerIndex = Phaser.Math.Wrap(this.gearWearerIndex + 1, 0, wearers.length);
      this.renderTab();
    }, true);
    prev.setPosition(-this.panelW / 2 + 24, this.panelH / 2 - 154);
    next.setPosition(-this.panelW / 2 + 124, this.panelH / 2 - 154);
    this.panel.add([prev, next]);
    this.saveButtons.push(prev, next);

    const ownedIds = Object.keys(save.equipmentInventory).filter((itemId) => (save.equipmentInventory[itemId] ?? 0) > 0);
    let buttonIndex = 0;
    for (const itemId of ownedIds) {
      const item = EQUIPMENT[itemId];
      if (!item || !isCompatible(item, wearer.tags)) continue;

      const equippedHere = wearer.loadout[item.slot] === itemId;
      const available = availableEquipmentCount(save, itemId);
      if (!equippedHere && available <= 0) continue;

      const label = equippedHere ? `UNEQUIP ${item.name}` : `EQUIP ${item.name}`;
      const button = this.makeButton(label, 0, 0, () => {
        if (equippedHere) {
          unequipSlot(save, wearer.id, item.slot);
        } else {
          equipItem(save, wearer.id, itemId);
        }
        SaveManager.save();
        this.renderTab();
      }, equippedHere);

      const column = buttonIndex % 2;
      const row = Math.floor(buttonIndex / 2);
      button.setPosition(
        -this.panelW / 2 + 24 + column * Math.min(300, this.panelW * 0.46),
        this.panelH / 2 - 108 + row * 38,
      );
      this.panel.add(button);
      this.saveButtons.push(button);
      buttonIndex += 1;
    }
  }

  private renderJournal(): void {
    const save = SaveManager.get();
    const entries = save.journal.filter((entry) => entry.known).slice(-8);
    const text = entries.length
      ? entries.map((entry) => `${entry.title.toUpperCase()}\n${entry.body}`).join('\n\n')
      : 'No journal entries yet.';
    this.content.setText(text);
  }

  private renderSaveTools(): void {
    const save = SaveManager.get();
    this.content.setText([
      'CAMPAIGN SAVE',
      `Schema v${save.saveVersion} · game ${save.gameVersion}`,
      `Last saved: ${new Date(save.updatedAt).toLocaleString()}`,
      '',
      'Browser autosave runs during play. Exported JSON is the durable backup you control.',
      '',
      'EXPORT SAVE — download a copy of the campaign.',
      'IMPORT SAVE — replace the browser save with a compatible exported campaign.',
      '',
      'Starting a new campaign is only available from the title screen and requires confirmation.',
    ].join('\n'));

    const exportButton = this.makeButton('EXPORT SAVE', 0, 0, () => this.exportSave());
    const importButton = this.makeButton('IMPORT SAVE', 136, 0, () => this.importSave(), true);
    exportButton.setPosition(-this.panelW / 2 + 24, this.panelH / 2 - 102);
    importButton.setPosition(-this.panelW / 2 + 162, this.panelH / 2 - 102);
    this.panel.add([exportButton, importButton]);
    this.saveButtons = [exportButton, importButton];
  }

  private clearSaveButtons(): void {
    for (const button of this.saveButtons) button.destroy();
    this.saveButtons = [];
  }

  private makeButton(label: string, x: number, y: number, run: () => void, secondary = false): Phaser.GameObjects.Text {
    const button = this.add.text(x, y, label, {
      fontFamily: 'system-ui, sans-serif',
      fontSize: '11px',
      fontStyle: 'bold',
      color: secondary ? '#dce8eb' : '#071116',
      backgroundColor: secondary ? '#1c333e' : '#c9d7dc',
      padding: { x: 12, y: 9 },
    }).setInteractive({ useHandCursor: true });
    button.on('pointerdown', run);
    return button;
  }

  private resumeGame(): void {
    document.body.classList.remove('journal-open');
    this.scene.stop();
    this.scene.resume(this.source);
  }

  private toTitle(): void {
    SaveManager.save();
    this.scene.stop(this.source);
    this.scene.stop();
    this.scene.start('TitleScene');
  }

  private exportSave(): void {
    const blob = new Blob([SaveManager.exportText()], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `alexander-vane-save-${Date.now()}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  private importSave(): void {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json,application/json';
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return;
      try {
        const save = SaveManager.importText(await file.text());
        this.scene.stop(this.source);
        this.scene.stop();
        this.scene.start(routeCampaign(save));
      } catch {
        this.content.setText('IMPORT FAILED\n\nThat file could not be read as a compatible Alexander Vane campaign save.');
      }
    };
    input.click();
  }

  private onResize(size: Phaser.Structs.Size): void {
    this.panel.setPosition(size.width / 2, size.height / 2);
  }
}
