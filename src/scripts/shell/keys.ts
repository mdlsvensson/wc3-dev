export interface Shortcut { code: string; mod?: boolean; alt?: boolean; shift?: boolean }
export interface KeyInput { code: string; ctrlKey: boolean; metaKey: boolean; altKey: boolean; shiftKey: boolean }

// Physical key codes keep shortcuts stable across keyboard layouts and macOS Option characters.
export const SHORTCUTS = {
  palette: { code: 'KeyK', mod: true },
  panel: { code: 'KeyB', mod: true },
  closeTab: { code: 'KeyW', alt: true },
} as const satisfies Record<string, Shortcut>;

/** Ctrl on Windows and Linux and Cmd on macOS both count as the modifier. */
export function matches(event: KeyInput, shortcut: Shortcut): boolean {
  return event.code === shortcut.code
    && (event.ctrlKey || event.metaKey) === Boolean(shortcut.mod)
    && event.altKey === Boolean(shortcut.alt)
    && event.shiftKey === Boolean(shortcut.shift);
}

export function isTypingTarget(target: { tagName?: string; isContentEditable?: boolean } | null): boolean {
  if (!target) return false;
  return target.isContentEditable === true || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName ?? '');
}
