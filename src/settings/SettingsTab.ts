import { App, PluginSettingTab, Setting } from 'obsidian';
import type ClarifyPlugin from '../main';

export class SettingsTab extends PluginSettingTab {
  constructor(app: App, private plugin: ClarifyPlugin) { super(app, plugin); }

  display() {
    const { containerEl } = this;
    containerEl.empty();
    const s = this.plugin.settings;

    containerEl.createEl('h2', { text: 'Inbox source' });
    new Setting(containerEl)
      .setName('Inbox folder')
      .setDesc('Items in this folder are considered inbox items')
      .addText((t) => t.setValue(s.inbox.folderPath ?? '').onChange((v) => this.update('inbox.folderPath', v || null)));
    new Setting(containerEl)
      .setName('Captured status value')
      .addText((t) => t.setValue(s.inbox.capturedStatusValue ?? '').onChange((v) => this.update('inbox.capturedStatusValue', v || null)));
    new Setting(containerEl)
      .setName('Status field name')
      .addText((t) => t.setValue(s.inbox.statusFieldName).onChange((v) => this.update('inbox.statusFieldName', v || 'status')));

    containerEl.createEl('h2', { text: 'Outcomes — folders' });
    containerEl.createEl('p', {
      text: 'Action items (someday, tickler, do-now, waiting, calendar, next-action) move into the bound project/area\'s folder — there\'s no per-outcome folder to set. The two below are for items that aren\'t bound to a project: Trash and Reference.',
      cls: 'setting-item-description',
    });
    const folderRow = (label: string, getter: () => string | null, setter: (v: string | null) => void) =>
      new Setting(containerEl).setName(label).addText((t) => t.setValue(getter() ?? '').onChange((v) => setter(v || null)));
    folderRow('Trash folder',     () => s.outcomes.trash.folder,     (v) => this.update('outcomes.trash.folder', v || '.trash'));
    folderRow('Reference folder', () => s.outcomes.reference.folder, (v) => this.update('outcomes.reference.folder', v || 'Resources'));

    containerEl.createEl('h2', { text: 'Projects & areas' });
    new Setting(containerEl).setName('Projects folder').addText((t) => t.setValue(s.projectsAndAreas.projectsFolder).onChange((v) => this.update('projectsAndAreas.projectsFolder', v)));
    new Setting(containerEl).setName('Areas folder').addText((t) => t.setValue(s.projectsAndAreas.areasFolder).onChange((v) => this.update('projectsAndAreas.areasFolder', v)));
    new Setting(containerEl).setName('Misc area name').addText((t) => t.setValue(s.projectsAndAreas.miscAreaName).onChange((v) => this.update('projectsAndAreas.miscAreaName', v)));
    new Setting(containerEl).setName('Project link field').addText((t) => t.setValue(s.projectsAndAreas.projectLinkField).onChange((v) => this.update('projectsAndAreas.projectLinkField', v)));

    containerEl.createEl('h2', { text: 'Keybindings' });
    for (const [event, binding] of Object.entries(s.keybindings) as [string, { key: string }][]) {
      new Setting(containerEl).setName(event).addText((t) => t.setValue(binding.key).onChange((v) => this.update(`keybindings.${event}.key`, v)));
    }

    containerEl.createEl('h2', { text: 'Launch' });
    new Setting(containerEl).setName('Show ribbon icon').addToggle((t) => t.setValue(s.launch.showRibbonIcon).onChange((v) => this.update('launch.showRibbonIcon', v)));
    new Setting(containerEl).setName('Enable command palette command').addToggle((t) => t.setValue(s.launch.commandPaletteEnabled).onChange((v) => this.update('launch.commandPaletteEnabled', v)));
  }

  private update(path: string, value: unknown) {
    const parts = path.split('.');
    let obj: any = this.plugin.settings;
    for (let i = 0; i < parts.length - 1; i++) obj = obj[parts[i]];
    obj[parts[parts.length - 1]] = value;
    this.plugin.saveSettings();
  }
}
