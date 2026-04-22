export function renderBar(current: number, goal: number, segments = 10): string {
  if (goal <= 0) return '░'.repeat(segments) + ' 0.00%';
  const ratio = Math.min(1, Math.max(0, current / goal));
  const pct = (ratio * 100).toFixed(2);
  const filled = Math.floor(ratio * segments);
  return '█'.repeat(filled) + '░'.repeat(segments - filled) + ` ${pct}%`;
}
