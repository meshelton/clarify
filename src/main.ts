import { Plugin, WorkspaceLeaf } from 'obsidian';
import { Effect, Layer } from 'effect';
import { ClarifyView, CLARIFY_VIEW_TYPE } from './ui/ClarifyView';
import { defaultSettings, ClarifySettings } from './settings/schema';
import { SettingsTab } from './settings/SettingsTab';
import { VaultServiceLive } from './vault/services/VaultService';
import { MetadataServiceLive } from './vault/services/MetadataService';
import { ProjectServiceLive } from './vault/services/ProjectService';

export default class ClarifyPlugin extends Plugin {
  settings!: ClarifySettings;

  async onload() {
    await this.loadSettings();

    const layer = Layer.mergeAll(
      VaultServiceLive(this.app.vault),
      MetadataServiceLive(this.app),
      ProjectServiceLive({
        projectsFolder: this.settings.projectsAndAreas.projectsFolder,
        areasFolder: this.settings.projectsAndAreas.areasFolder,
      }),
    );

    const runEffect = <A, E>(e: Effect.Effect<A, E, any>) =>
      Effect.runPromise(e.pipe(Effect.provide(layer)) as Effect.Effect<A, E, never>);

    this.registerView(
      CLARIFY_VIEW_TYPE,
      (leaf: WorkspaceLeaf) => new ClarifyView(leaf, this.settings, runEffect),
    );

    if (this.settings.launch.showRibbonIcon) {
      this.addRibbonIcon('list-checks', 'Clarify inbox', () => this.activate());
    }

    if (this.settings.launch.commandPaletteEnabled) {
      this.addCommand({
        id: 'clarify-open',
        name: 'Clarify inbox',
        callback: () => this.activate(),
      });
    }

    this.addSettingTab(new SettingsTab(this.app, this));
  }

  async onunload() {
    this.app.workspace.detachLeavesOfType(CLARIFY_VIEW_TYPE);
  }

  async loadSettings() {
    const loaded = await this.loadData() as Partial<ClarifySettings> | null;
    this.settings = { ...defaultSettings, ...(loaded ?? {}) };
  }

  async saveSettings() {
    await this.saveData(this.settings);
  }

  async activate() {
    const { workspace } = this.app;
    let leaf = workspace.getLeavesOfType(CLARIFY_VIEW_TYPE)[0];
    if (!leaf) {
      leaf = workspace.getLeaf(true);
      await leaf.setViewState({ type: CLARIFY_VIEW_TYPE, active: true });
    }
    workspace.revealLeaf(leaf);
  }
}
