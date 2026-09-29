import Phaser from 'phaser';

export interface DialogueChoice {
  label: string;
  run: () => void;
  disabled?: boolean;
}

export interface DialogueOptions {
  speaker: string;
  text: string;
  choices?: DialogueChoice[];
  onClose?: () => void;
}

export class DialoguePanel {
  private root: HTMLDivElement | null = null;
  private closeHandler: (() => void) | undefined;

  constructor(scene: Phaser.Scene) {
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.close(false));
  }

  isOpen(): boolean {
    return Boolean(this.root);
  }

  show(options: DialogueOptions): void {
    this.close(false);

    const choices = options.choices ?? [{ label: 'Close', run: () => undefined }];

    const overlay = document.createElement('div');
    overlay.className = 'dialogue-overlay';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.setAttribute('aria-label', `Conversation with ${options.speaker}`);

    const panel = document.createElement('section');
    panel.className = 'dialogue-panel';

    const header = document.createElement('div');
    header.className = 'dialogue-speaker';
    header.textContent = options.speaker.toUpperCase();

    const body = document.createElement('div');
    body.className = 'dialogue-body';
    body.textContent = options.text;

    const choiceWrap = document.createElement('div');
    choiceWrap.className = 'dialogue-choices';

    for (const choice of choices) {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'dialogue-choice';
      button.textContent = choice.label;
      button.disabled = Boolean(choice.disabled);

      if (!choice.disabled) {
        button.addEventListener('click', (event) => {
          event.preventDefault();
          event.stopPropagation();
          this.close();
          choice.run();
        });
      }

      choiceWrap.append(button);
    }

    panel.append(header, body, choiceWrap);
    overlay.append(panel);

    const absorb = (event: Event) => event.stopPropagation();
    overlay.addEventListener('pointerdown', absorb);
    overlay.addEventListener('pointermove', absorb);
    overlay.addEventListener('pointerup', absorb);
    overlay.addEventListener('click', absorb);

    this.closeHandler = options.onClose;
    this.root = overlay;
    document.body.append(overlay);

    const firstEnabled = choiceWrap.querySelector<HTMLButtonElement>('button:not(:disabled)');
    firstEnabled?.focus({ preventScroll: true });
  }

  close(invokeHandler = true): void {
    if (!this.root) return;

    this.root.remove();
    this.root = null;

    const handler = this.closeHandler;
    this.closeHandler = undefined;
    if (invokeHandler) handler?.();
  }
}
