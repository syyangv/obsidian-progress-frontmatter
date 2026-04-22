import { RangeSetBuilder } from '@codemirror/state';
import {
  Decoration,
  DecorationSet,
  EditorView,
  ViewPlugin,
  ViewUpdate,
} from '@codemirror/view';
import { Plugin, TFile } from 'obsidian';
import { PluginSettings, DEFAULT_SETTINGS, SettingsTab } from './settings';
import { resolveProgress } from './progress';
import { renderBar } from './bar';

const PROGRESS_VALUE_CLASS = 'progress-frontmatter-accent';
const PROGRESS_LINE_CLASS = 'progress-frontmatter-line-accent';

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function buildProgressDecorations(view: EditorView, outputField: string): DecorationSet {
  const builder = new RangeSetBuilder<Decoration>();
  const fieldPattern = new RegExp(`^\\s*${escapeRegex(outputField)}\\s*:\\s*`);
  const mark = Decoration.mark({ class: PROGRESS_VALUE_CLASS });

  for (const { from, to } of view.visibleRanges) {
    let pos = from;
    while (pos <= to) {
      const line = view.state.doc.lineAt(pos);
      const match = fieldPattern.exec(line.text);
      if (match && line.from + match[0].length < line.to) {
        builder.add(line.from + match[0].length, line.to, mark);
      }
      pos = line.to + 1;
    }
  }

  return builder.finish();
}

export default class ProgressFrontmatterPlugin extends Plugin {
  settings: PluginSettings;
  private progressStyleEl: HTMLStyleElement | null = null;
  private progressObserver: MutationObserver | null = null;

  async onload() {
    await this.loadSettings();
    this.updateProgressStyle();
    this.addSettingTab(new SettingsTab(this.app, this));
    this.registerEditorExtension(this.createProgressDecorationExtension());
    this.startProgressDomStyling();

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

  onunload() {
    this.progressStyleEl?.remove();
    this.progressStyleEl = null;
    this.progressObserver?.disconnect();
    this.progressObserver = null;
  }

  async loadSettings() {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
  }

  async saveSettings() {
    await this.saveData(this.settings);
    this.updateProgressStyle();
  }

  updateProgressStyle() {
    const outputField = this.settings.outputField || DEFAULT_SETTINGS.outputField;
    this.progressStyleEl?.remove();
    this.progressStyleEl = document.createElement('style');
    this.progressStyleEl.textContent = `
.metadata-property[data-property-key="${CSS.escape(outputField)}"] .metadata-property-value {
  color: var(--interactive-accent, #002fa7) !important;
}

.metadata-property[data-property-key="${CSS.escape(outputField)}"] .metadata-property-value *,
.metadata-property[data-property-key="${CSS.escape(outputField)}"] .metadata-input-longtext,
.metadata-property[data-property-key="${CSS.escape(outputField)}"] .metadata-input-text,
.metadata-property[data-property-key="${CSS.escape(outputField)}"] input,
.metadata-property[data-property-key="${CSS.escape(outputField)}"] textarea {
  color: var(--interactive-accent, #002fa7) !important;
  -webkit-text-fill-color: var(--interactive-accent, #002fa7) !important;
}

.${PROGRESS_VALUE_CLASS} {
  color: var(--interactive-accent, #002fa7) !important;
}

.${PROGRESS_LINE_CLASS},
.${PROGRESS_LINE_CLASS} * {
  color: var(--interactive-accent, #002fa7) !important;
}
`;
    document.head.appendChild(this.progressStyleEl);
  }

  private startProgressDomStyling() {
    this.applyProgressDomStyling();

    this.progressObserver = new MutationObserver(() => {
      window.requestAnimationFrame(() => this.applyProgressDomStyling());
    });

    this.progressObserver.observe(document.body, {
      childList: true,
      subtree: true,
      characterData: true,
    });
  }

  private applyProgressDomStyling() {
    const outputField = this.settings.outputField || DEFAULT_SETTINGS.outputField;
    const fieldPattern = new RegExp(`^\\s*${escapeRegex(outputField)}\\s*:`);

    document.querySelectorAll(`.${PROGRESS_LINE_CLASS}`).forEach(el => {
      if (!fieldPattern.test(el.textContent ?? '')) {
        el.classList.remove(PROGRESS_LINE_CLASS);
      }
    });

    document.querySelectorAll('.cm-line, .HyperMD-codeblock, .frontmatter, .frontmatter-container').forEach(el => {
      if (fieldPattern.test(el.textContent ?? '')) {
        el.classList.add(PROGRESS_LINE_CLASS);
      }
    });
  }

  private createProgressDecorationExtension() {
    const plugin = this;
    return ViewPlugin.fromClass(
      class {
        decorations: DecorationSet;

        constructor(view: EditorView) {
          this.decorations = buildProgressDecorations(view, plugin.settings.outputField);
        }

        update(update: ViewUpdate) {
          if (update.docChanged || update.viewportChanged) {
            this.decorations = buildProgressDecorations(update.view, plugin.settings.outputField);
          }
        }
      },
      {
        decorations: value => value.decorations,
      }
    );
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
