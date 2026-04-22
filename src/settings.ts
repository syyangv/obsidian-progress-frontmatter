import { App, PluginSettingTab, Setting } from 'obsidian';
import type ProgressFrontmatterPlugin from './main';

export interface PluginSettings {
  triggerCssClass: string;
  currentPointerField: string;
  goalPointerField: string;
  outputField: string;
}

export const DEFAULT_SETTINGS: PluginSettings = {
  triggerCssClass: 'progress-tracker',
  currentPointerField: 'progress_current',
  goalPointerField: 'progress_goal',
  outputField: 'progress_display',
};

export class SettingsTab extends PluginSettingTab {
  plugin: ProgressFrontmatterPlugin;

  constructor(app: App, plugin: ProgressFrontmatterPlugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display(): void {
    const { containerEl } = this;
    containerEl.empty();

    new Setting(containerEl)
      .setName('Trigger CSS class')
      .setDesc('Notes must include this class in cssclasses to activate the plugin.')
      .addText(text =>
        text
          .setValue(this.plugin.settings.triggerCssClass)
          .onChange(async value => {
            this.plugin.settings.triggerCssClass = value.trim();
            await this.plugin.saveSettings();
          })
      );

    new Setting(containerEl)
      .setName('Current pointer field')
      .setDesc('Frontmatter field whose value names the field holding the current count.')
      .addText(text =>
        text
          .setValue(this.plugin.settings.currentPointerField)
          .onChange(async value => {
            this.plugin.settings.currentPointerField = value.trim();
            await this.plugin.saveSettings();
          })
      );

    new Setting(containerEl)
      .setName('Goal pointer field')
      .setDesc('Frontmatter field whose value names the field holding the goal count.')
      .addText(text =>
        text
          .setValue(this.plugin.settings.goalPointerField)
          .onChange(async value => {
            this.plugin.settings.goalPointerField = value.trim();
            await this.plugin.saveSettings();
          })
      );

    new Setting(containerEl)
      .setName('Output field')
      .setDesc('Frontmatter field where the rendered bar string is written.')
      .addText(text =>
        text
          .setValue(this.plugin.settings.outputField)
          .onChange(async value => {
            this.plugin.settings.outputField = value.trim();
            await this.plugin.saveSettings();
          })
      );
  }
}
