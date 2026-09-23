/** One stored file a previewer may load, from the page's `data-files`. */
export interface PreviewFile { role: string; format: string; url: string; name: string }

export type PreviewKind = 'model' | 'image' | 'audio' | 'script';

/** Which previewer handles each resource type; links have none. */
export const PREVIEW_KINDS: Record<string, PreviewKind> = { model: 'model', icon: 'image', texture: 'image', audio: 'audio', script: 'script' };

/** The decoded last path segment of a URL, e.g. the stored file's original name. */
export function fileName(url: string): string {
  try {
    return decodeURIComponent(new URL(url, 'https://wc3.dev/').pathname.split('/').pop() ?? '');
  } catch {
    return '';
  }
}

export function parsePreviewFiles(raw: string | undefined): PreviewFile[] {
  try {
    const value = JSON.parse(raw ?? '[]');
    if (!Array.isArray(value)) return [];
    return value
      .filter((file) => typeof file?.role === 'string' && typeof file?.format === 'string' && typeof file?.url === 'string')
      .map((file) => ({ role: file.role, format: file.format, url: file.url, name: fileName(file.url) }));
  } catch {
    return [];
  }
}

const SCRIPT_LANGUAGES: Record<string, string> = { jass: 'jass', lua: 'lua', ts: 'typescript' };
export const scriptLanguage = (format: string): string => SCRIPT_LANGUAGES[format] ?? 'lua';
