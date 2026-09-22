export const PANEL_MIN = 200;
export const PANEL_MAX = 420;
export const PANEL_DEFAULT = 260;

/** Rounds a requested side-panel width into the allowed range. */
export function clampPanelWidth(width: number): number {
  if (!Number.isFinite(width)) return PANEL_DEFAULT;
  return Math.round(Math.min(PANEL_MAX, Math.max(PANEL_MIN, width)));
}
