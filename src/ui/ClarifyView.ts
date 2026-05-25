import { ItemView, WorkspaceLeaf } from 'obsidian';
import { render, h } from 'preact';
import { Wizard } from './Wizard';
import type { ClarifySettings } from '../settings/schema';
import type { Effect } from 'effect';

export const CLARIFY_VIEW_TYPE = 'clarify-view';

export class ClarifyView extends ItemView {
  constructor(
    leaf: WorkspaceLeaf,
    private settings: ClarifySettings,
    private runEffect: <A, E>(e: Effect.Effect<A, E, any>) => Promise<A>,
  ) { super(leaf); }

  getViewType() { return CLARIFY_VIEW_TYPE; }
  getDisplayText() { return 'Clarify'; }
  getIcon() { return 'list-checks'; }

  async onOpen() {
    this.containerEl.empty();
    this.containerEl.addClass('clarify-view');
    render(h(Wizard, { settings: this.settings, runEffect: this.runEffect }), this.containerEl);
  }

  async onClose() {
    render(null, this.containerEl);
  }
}
