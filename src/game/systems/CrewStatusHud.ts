import Phaser from 'phaser';
import type { CrewState } from '../state/types';

interface CrewHealthSnapshot {
  id: CrewState['id'];
  name: string;
  hp: number;
  maxHp: number;
}

export class CrewStatusHud {
  private root: HTMLDivElement;
  private rows = new Map<CrewState['id'], {
    row: HTMLDivElement;
    name: HTMLSpanElement;
    hp: HTMLSpanElement;
    fill: HTMLDivElement;
  }>();

  constructor(scene: Phaser.Scene) {
    this.root = document.createElement('div');
    this.root.className = 'crew-status-hud';
    this.root.setAttribute('aria-label', 'Crew health');

    const title = document.createElement('div');
    title.className = 'crew-status-title';
    title.textContent = 'CREW';
    this.root.append(title);

    for (const id of ['sera', 'rowan'] as const) {
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
      this.rows.set(id, { row, name, hp, fill });
    }

    document.body.append(this.root);
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.destroy());
  }

  update(crew: CrewHealthSnapshot[]): void {
    for (const id of ['sera', 'rowan'] as const) {
      const view = this.rows.get(id);
      if (!view) continue;

      const member = crew.find((candidate) => candidate.id === id);
      if (!member) {
        view.row.style.display = 'none';
        continue;
      }

      view.row.style.display = 'block';
      view.name.textContent = member.name.replace(' Quill', '').replace(' Vale', '');

      const pct = Phaser.Math.Clamp(member.hp / Math.max(1, member.maxHp), 0, 1);
      view.fill.style.width = `${Math.round(pct * 100)}%`;
      view.fill.dataset.state =
        member.hp <= 0 ? 'down' :
        pct <= 0.25 ? 'critical' :
        pct <= 0.55 ? 'hurt' :
        'healthy';

      if (member.hp <= 0) {
        view.hp.textContent = 'DOWN';
        view.row.dataset.state = 'down';
      } else {
        view.hp.textContent = `${Math.ceil(member.hp)}/${member.maxHp}`;
        view.row.dataset.state = '';
      }
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
