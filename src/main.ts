import { Plugin } from 'obsidian';
import { Effect, Layer } from 'effect';
import { ClarifyModal } from './ui/ClarifyModal';
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

    if (this.settings.launch.showRibbonIcon) {
      this.addRibbonIcon('list-checks', 'Clarify inbox', () => this.openClarifyModal(runEffect));
    }

    if (this.settings.launch.commandPaletteEnabled) {
      this.addCommand({
        id: 'clarify-open',
        name: 'Clarify inbox',
        callback: () => this.openClarifyModal(runEffect),
      });
    }

    this.addSettingTab(new SettingsTab(this.app, this));
  }

  async loadSettings() {
    const loaded = await this.loadData() as Partial<ClarifySettings> | null;
    this.settings = { ...defaultSettings, ...(loaded ?? {}) };
  }

  async saveSettings() {
    await this.saveData(this.settings);
  }

  private openClarifyModal(runEffect: <A, E>(e: Effect.Effect<A, E, any>) => Promise<A>) {
    new ClarifyModal(this.app, this.settings, runEffect).open();
  }
}
