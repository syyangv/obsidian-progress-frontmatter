import { App, TFile } from 'obsidian';
import type { PluginSettings } from './settings';

export interface Progress {
  current: number;
  goal: number;
}

export async function resolveProgress(
  file: TFile,
  settings: PluginSettings,
  app: App
): Promise<Progress | null> {
  const cache = app.metadataCache.getFileCache(file);
  if (!cache) return null;

  const fm = cache.frontmatter ?? {};

  const currentPointer = fm[settings.currentPointerField];
  const goalPointer = fm[settings.goalPointerField];

  if (currentPointer !== undefined && goalPointer !== undefined) {
    const current = Number(fm[currentPointer]);
    const goal = Number(fm[goalPointer]);
    if (!isNaN(current) && !isNaN(goal)) {
      return { current, goal };
    }
  }

  // Checkbox fallback
  const content = await app.vault.cachedRead(file);
  const checked = (content.match(/- \[x\]/gi) ?? []).length;
  const unchecked = (content.match(/- \[ \]/g) ?? []).length;
  const total = checked + unchecked;
  if (total === 0) return null;

  return { current: checked, goal: total };
}
