import Phaser from 'phaser';

export interface DialogueChoice {
  label: string;
  run: () => void;
  disabled?: boolean;
}

export interface DialogueFreeform {
  placeholder?: string;
  onSubmit: (text: string) => string | null;
}

export interface DialogueOptions {
  speaker: string;
  text: string;
  choices?: DialogueChoice[];
  freeform?: DialogueFreeform;
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

    const opening = document.createElement('p');
    opening.className = 'dialogue-line dialogue-line-npc';
    opening.textContent = options.text;
    body.append(opening);

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

    panel.append(header, body);

    if (options.freeform) {
      const form = document.createElement('form');
      form.className = 'dialogue-freeform';

      const input = document.createElement('textarea');
      input.className = 'dialogue-input';
      input.rows = 2;
      input.maxLength = 320;
      input.placeholder = options.freeform.placeholder ?? 'Say what you want...';
      input.autocomplete = 'off';
      input.spellcheck = true;
      input.setAttribute('aria-label', `Say something to ${options.speaker}`);

      const send = document.createElement('button');
      send.type = 'submit';
      send.className = 'dialogue-send';
      send.textContent = 'SAY';

      const submit = () => {
        const text = input.value.trim();
        if (!text) return;

        const userLine = document.createElement('p');
        userLine.className = 'dialogue-line dialogue-line-player';
        userLine.textContent = `YOU: ${text}`;
        body.append(userLine);

        const reply = options.freeform?.onSubmit(text) ?? null;
        if (reply) {
          const replyLine = document.createElement('p');
          replyLine.className = 'dialogue-line dialogue-line-npc';
          replyLine.textContent = `${options.speaker.toUpperCase()}: ${reply}`;
          body.append(replyLine);
        }

        input.value = '';
        body.scrollTop = body.scrollHeight;
        input.focus({ preventScroll: true });
      };

      form.addEventListener('submit', (event) => {
        event.preventDefault();
        event.stopPropagation();
        submit();
      });
      input.addEventListener('keydown', (event) => {
        if (event.key === 'Enter' && !event.shiftKey) {
          event.preventDefault();
          submit();
        }
      });

      form.append(input, send);
      panel.append(form);
    }

    panel.append(choiceWrap);
    overlay.append(panel);

    const absorb = (event: Event) => event.stopPropagation();
    overlay.addEventListener('pointerdown', absorb);
    overlay.addEventListener('pointermove', absorb);
    overlay.addEventListener('pointerup', absorb);
    overlay.addEventListener('click', absorb);

    this.closeHandler = options.onClose;
    this.root = overlay;
    document.body.append(overlay);

    if (!options.freeform) {
      const firstEnabled = choiceWrap.querySelector<HTMLButtonElement>('button:not(:disabled)');
      firstEnabled?.focus({ preventScroll: true });
    }
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
