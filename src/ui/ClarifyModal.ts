import { App, Modal } from 'obsidian';
import { render, h } from 'preact';
import { Wizard } from './Wizard';
import type { ClarifySettings } from '../settings/schema';
import type { Effect } from 'effect';

export class ClarifyModal extends Modal {
  constructor(
    app: App,
    private settings: ClarifySettings,
    private runEffect: <A, E>(e: Effect.Effect<A, E, any>) => Promise<A>,
  ) {
    super(app);
  }

  onOpen() {
    this.modalEl.addClass('clarify-modal');
    this.contentEl.empty();
    this.contentEl.addClass('clarify-view');
    render(
      h(Wizard, { settings: this.settings, runEffect: this.runEffect, onDone: () => this.close() }),
      this.contentEl,
    );
  }

  onClose() {
    render(null, this.contentEl);
    this.contentEl.empty();
  }
}
