import { Plugin, TFile } from 'obsidian';
import { PluginSettings, DEFAULT_SETTINGS, SettingsTab } from './settings';
import { resolveProgress } from './progress';
import { renderBar } from './bar';

export default class ProgressFrontmatterPlugin extends Plugin {
  settings: PluginSettings;

  async onload() {
    await this.loadSettings();
    this.addSettingTab(new SettingsTab(this.app, this));

    this.registerEvent(
      this.app.metadataCache.on('changed', (file) => {
        this.updateFile(file).catch(err => console.error('[progress-frontmatter]', err));
      })
    );

    // Backfill opted-in notes on startup
    for (const file of this.app.vault.getMarkdownFiles()) {
      this.updateFile(file).catch(err => console.error('[progress-frontmatter]', err));
    }
  }

  onunload() {}

  async loadSettings() {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
  }

  async saveSettings() {
    await this.saveData(this.settings);
  }

  private hasTriggerClass(file: TFile): boolean {
    const cache = this.app.metadataCache.getFileCache(file);
    if (!cache) return false;
    const fm = cache.frontmatter ?? {};
    const classes = fm['cssclasses'] ?? fm['cssclass'];
    if (!classes) return false;
    const list = Array.isArray(classes) ? classes : String(classes).split(/[\s,]+/);
    return list.map(c => String(c).trim()).includes(this.settings.triggerCssClass);
  }

  private async updateFile(file: TFile) {
    if (!(file instanceof TFile) || file.extension !== 'md') return;
    if (!this.hasTriggerClass(file)) return;

    const progress = await resolveProgress(file, this.settings, this.app);
    if (!progress) return;

    const bar = renderBar(progress.current, progress.goal);

    const cache = this.app.metadataCache.getFileCache(file);
    const existing = cache?.frontmatter?.[this.settings.outputField];
    if (existing === bar) return; // no-op guard against infinite loop

    try {
      await this.app.fileManager.processFrontMatter(file, fm => {
        fm[this.settings.outputField] = bar;
      });
    } catch (err) {
      console.error('[progress-frontmatter] write failed:', err);
    }
  }
}
