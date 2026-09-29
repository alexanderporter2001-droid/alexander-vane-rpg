import Phaser from 'phaser';
import type { CrewState } from '../state/types';

interface CrewHealthSnapshot {
  id: CrewState['id'];
  name: string;
  hp: number;
  maxHp: number;
}

interface CrewHealthRow {
  row: HTMLDivElement;
  name: HTMLSpanElement;
  hp: HTMLSpanElement;
  fill: HTMLDivElement;
}

export class CrewStatusHud {
  private root: HTMLDivElement;
  private rows = new Map<CrewState['id'], CrewHealthRow>();

  constructor(scene: Phaser.Scene) {
    this.root = document.createElement('div');
    this.root.className = 'crew-status-hud';
    this.root.setAttribute('aria-label', 'Contextual crew health');

    const title = document.createElement('div');
    title.className = 'crew-status-title';
    title.textContent = 'CREW IN FIGHT';
    this.root.append(title);

    document.body.append(this.root);
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.destroy());
  }

  private ensureRow(id: string): CrewHealthRow {
    const existing = this.rows.get(id);
    if (existing) return existing;

    const row = document.createElement('div');
    row.className = 'crew-status-row';

    const line = document.createElement('div');
    line.className = 'crew-status-line';

    const name = document.createElement('span');
    name.className = 'crew-status-name';

    const hp = document.createElement('span');
    hp.className = 'crew-status-hp';

    const track = document.createElement('div');
    track.className = 'crew-status-track';

    const fill = document.createElement('div');
    fill.className = 'crew-status-fill';
    track.append(fill);

    line.append(name, hp);
    row.append(line, track);
    this.root.append(row);

    const view = { row, name, hp, fill };
    this.rows.set(id, view);
    return view;
  }

  update(crew: CrewHealthSnapshot[]): void {
    const visibleIds = new Set<string>();

    for (const member of crew) {
      visibleIds.add(member.id);
      const view = this.ensureRow(member.id);
      view.row.style.display = 'block';
      view.name.textContent = member.name.split(' ')[0] ?? member.name;

      const pct = Phaser.Math.Clamp(member.hp / Math.max(1, member.maxHp), 0, 1);
      view.fill.style.width = Math.round(pct * 100) + '%';
      view.fill.dataset.state =
        member.hp <= 0 ? 'down'
          : pct <= 0.25 ? 'critical'
            : pct <= 0.55 ? 'hurt'
              : 'healthy';

      if (member.hp <= 0) {
        view.hp.textContent = 'DOWN';
        view.row.dataset.state = 'down';
      } else {
        view.hp.textContent = Math.ceil(member.hp) + '/' + member.maxHp;
        view.row.dataset.state = '';
      }
    }

    for (const [id, view] of this.rows) {
      if (!visibleIds.has(id)) view.row.style.display = 'none';
    }
  }

  setVisible(visible: boolean): void {
    this.root.style.display = visible ? 'block' : 'none';
  }

  destroy(): void {
    this.root.remove();
    this.rows.clear();
  }
}
