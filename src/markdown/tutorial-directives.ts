import { statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import type { MdastNode, MdastPluginDefinition, PluginFactoryContext } from 'satteri';

/** Tutorial directives apply only to lessons; Starlight docs and all other Markdown are left alone. */
const TUTORIALS_DIR = '/src/content/tutorials/';

const CALLOUTS: Record<string, string> = { tip: 'Tip', note: 'Note', caution: 'Caution' };
const CHECKPOINT_TITLE = 'Checkpoint: your map now…';
/** Every container directive a lesson may use; any other is an error. */
const CONTAINERS = ['steps', ...Object.keys(CALLOUTS), 'checkpoint'];
/** Every leaf directive a lesson may use; any other is an error. */
const LEAVES = ['shot'];
/** An author note marking an editor fact to confirm; `tutorial:check` lists them. */
const VERIFY = /<!--\s*verify:[\s\S]*?-->/g;

export function isTutorialFile(fileURL: URL | undefined): fileURL is URL {
  return fileURL !== undefined && fileURLToPath(fileURL).replaceAll('\\', '/').includes(TUTORIALS_DIR);
}

type Child = unknown;

/**
 * A node rendered as `tagName`. Sätteri, like remark-rehype, honours `data.hName` and
 * `data.hProperties`. `blockquote` holds block content; `paragraph` and `emphasis` hold phrasing.
 */
function element(type: 'blockquote' | 'paragraph' | 'emphasis', tagName: string, properties: Record<string, unknown>, children: Child[]): MdastNode {
  return { type, data: { hName: tagName, hProperties: properties }, children } as unknown as MdastNode;
}
const text = (value: string) => ({ type: 'text', value });

/**
 * `Ctrl+F9` → `<kbd class="keys"><kbd>Ctrl</kbd>+<kbd>F9</kbd></kbd>`. Only a `+` between two keys
 * separates them, so `:kbd[+]` and `:kbd[Ctrl++]` keep the plus key.
 */
function keys(combination: string, fileURL: URL): MdastNode {
  const names = combination.trim().split(/(?<=\S)\s*\+\s*(?=\S)/).filter(Boolean);
  if (names.length === 0) throw new Error(`:kbd needs at least one key (${fileURLToPath(fileURL)})`);
  const children: Child[] = [];
  names.forEach((key, index) => {
    if (index > 0) children.push(text('+'));
    children.push(element('emphasis', 'kbd', {}, [text(key)]));
  });
  return element('emphasis', 'kbd', { className: ['keys'] }, children);
}

/** `Scenario > Map Options` → a menu path with a separator between items. */
function menuPath(path: string): MdastNode {
  const children: Child[] = [];
  path.split('>').map((item) => item.trim()).filter(Boolean).forEach((item, index) => {
    if (index > 0) {
      // Screen readers hear " > " rather than the decorative chevron.
      children.push(element('emphasis', 'span', { className: ['menu-sep'], ariaHidden: 'true' }, [text('›')]));
      children.push(element('emphasis', 'span', { className: ['visually-hidden'] }, [text(' > ')]));
    }
    children.push(element('emphasis', 'span', {}, [text(item)]));
  });
  return element('emphasis', 'span', { className: ['menu-path'] }, children);
}

/** Whether `path` is a regular file; a directory or a missing path is not. */
function isFile(path: string): boolean {
  try {
    return statSync(path).isFile();
  } catch {
    return false;
  }
}

/** A screenshot: the image when its file exists next to the lesson, otherwise a placeholder showing the capture note. */
function shot(alt: string, attributes: Record<string, string | null | undefined> | null | undefined, fileURL: URL): MdastNode {
  const src = attributes?.src ?? '';
  if (!src.startsWith('./')) {
    throw new Error(`::shot needs a src relative to the lesson, starting with "./" (${fileURLToPath(fileURL)}: "${alt}")`);
  }
  if (src.split(/[/\\]/).includes('..')) {
    throw new Error(`::shot src must stay in the lesson's folder, without ".." (${fileURLToPath(fileURL)}: "${src}")`);
  }
  const caption = attributes?.caption;
  const figcaption = caption ? [element('paragraph', 'figcaption', {}, [text(caption)])] : [];
  if (isFile(fileURLToPath(new URL(src, fileURL)))) {
    return element('blockquote', 'figure', { className: ['shot'] }, [{ type: 'image', url: src, alt }, ...figcaption]);
  }
  return element('blockquote', 'figure', { className: ['shot', 'shot-missing'] }, [
    // The placeholder is for authors; keep its capture note out of the search index.
    element('paragraph', 'div', { className: ['shot-placeholder'], dataPagefindIgnore: '' }, [
      element('emphasis', 'span', { className: ['shot-flag'] }, [text('Screenshot needed')]),
      element('emphasis', 'span', { className: ['shot-note'] }, [text(alt)]),
    ]),
    ...figcaption,
  ]);
}

/** Sätteri plugin factory, registered in `astro.config.ts`. */
export function tutorialDirectives({ fileURL }: PluginFactoryContext): MdastPluginDefinition | undefined {
  if (!isTutorialFile(fileURL)) return undefined;
  return {
    name: 'wc3-tutorial-directives',
    textDirective(node, ctx) {
      if (node.name === 'kbd') return keys(ctx.textContent(node), fileURL);
      if (node.name === 'menu') return menuPath(ctx.textContent(node));
    },
    leafDirective(node, ctx) {
      if (node.name === 'shot') return shot(ctx.textContent(node), node.attributes, fileURL);
      // A misspelled `::shot` would otherwise vanish from the page without a trace.
      throw new Error(`Unknown leaf directive "::${node.name}" in ${fileURLToPath(fileURL)}; use one of ${LEAVES.map((name) => `::${name}`).join(', ')}`);
    },
    containerDirective(node, ctx) {
      // A `:::name[label]` label arrives as a first paragraph flagged `directiveLabel`.
      const [first, ...rest] = node.children;
      const label = first?.type === 'paragraph' && first.data?.directiveLabel ? first : undefined;
      const body = label ? rest : node.children;
      const custom = label && label.children.length > 0 ? label : undefined;
      // The <aside> is named by its title, so a landmark list reads "Tip", "Caution: Save first", and so on.
      const aside = (className: string[], fallback: string) =>
        element('blockquote', 'aside', { className, ariaLabel: custom ? ctx.textContent(custom) : fallback }, [
          element('paragraph', 'p', { className: ['tutorial-callout-title'] }, custom ? custom.children : [text(fallback)]),
          ...body,
        ]);
      if (node.name === 'steps') return element('blockquote', 'div', { className: ['tutorial-steps'] }, body);
      if (node.name === 'checkpoint') return aside(['tutorial-checkpoint'], CHECKPOINT_TITLE);
      const calloutTitle = CALLOUTS[node.name];
      if (calloutTitle) return aside(['tutorial-callout', `tutorial-callout-${node.name}`], calloutTitle);
      // Starlight would restore an unknown container as a bare <div>, silently losing its meaning.
      throw new Error(`Unknown container directive ":::${node.name}" in ${fileURLToPath(fileURL)}; use one of ${CONTAINERS.map((name) => `:::${name}`).join(', ')}`);
    },
    html(node) {
      // Drop only the note, so HTML or text beside it on the same line survives.
      const kept = node.value.replace(VERIFY, '');
      if (kept !== node.value) return { raw: kept };
    },
    link(node, ctx) {
      // Starlight pages don't use the shell's client router; load them in full.
      if (node.url.startsWith('/framework/docs/')) {
        const hProperties = (node.data as { hProperties?: Record<string, unknown> } | undefined)?.hProperties;
        ctx.setProperty(node, 'data', { ...node.data, hProperties: { ...hProperties, dataAstroReload: '' } });
      }
    },
  };
}
