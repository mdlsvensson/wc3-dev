import { parsePreviewFiles, type PreviewFile, PREVIEW_KINDS, type PreviewKind } from './files.ts';
import { reason, showMessage } from './ui.ts';

type Mount = (preview: HTMLElement, files: PreviewFile[]) => Promise<() => void>;

/** Previewers load on demand so each page downloads only the code its resource type needs. */
const LOADERS: Partial<Record<PreviewKind, () => Promise<{ mount: Mount }>>> = {
};

const LABELS: Record<PreviewKind, string> = { model: '3D preview', image: 'Image preview', audio: 'Audio preview', script: 'Source view' };

let dispose: (() => void) | undefined;
// Bumped on every navigation, so a previewer that finishes loading after the user left is disposed at once.
let generation = 0;

async function mountPreview(): Promise<void> {
  const preview = document.getElementById('resource-preview');
  const kind = preview ? PREVIEW_KINDS[preview.dataset.type ?? ''] : undefined;
  const load = kind ? LOADERS[kind] : undefined;
  if (!preview || !kind || !load) return;
  const current = ++generation;
  try {
    const { mount } = await load();
    const cleanup = await mount(preview, parsePreviewFiles(preview.dataset.files));
    if (current === generation) dispose = cleanup;
    else cleanup();
  } catch (error) {
    if (current === generation) showMessage(preview, `${LABELS[kind]} unavailable: ${reason(error)}`, () => void mountPreview());
  }
}

document.addEventListener('astro:page-load', () => void mountPreview());
document.addEventListener('astro:before-swap', () => {
  generation++;
  dispose?.();
  dispose = undefined;
});
