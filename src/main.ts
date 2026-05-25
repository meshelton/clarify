import { Plugin } from 'obsidian';

export default class ClarifyPlugin extends Plugin {
  async onload() {
    console.log('[clarify] loaded');
  }

  onunload() {
    console.log('[clarify] unloaded');
  }
}
