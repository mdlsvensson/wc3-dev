import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import type { MdastNode, MdastPluginDefinition, PluginFactoryContext } from 'satteri';

/** Tutorial directives apply only to lessons; Starlight docs and all other Markdown are left alone. */
const TUTORIALS_DIR = '/src/content/tutorials/';

const CALLOUTS: Record<string, string> = { tip: 'Tip', note: 'Note', caution: 'Caution' };
const CHECKPOINT_TITLE = 'Checkpoint: your map now…';

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

/** `Ctrl+F9` → `<kbd class="keys"><kbd>Ctrl</kbd>+<kbd>F9</kbd></kbd>`. */
function keys(combination: string): MdastNode {
  const children: Child[] = [];
  combination.split('+').map((key) => key.trim()).filter(Boolean).forEach((key, index) => {
    if (index > 0) children.push(text('+'));
    children.push(element('emphasis', 'kbd', {}, [text(key)]));
  });
  return element('emphasis', 'kbd', { className: ['keys'] }, children);
}

/** `Scenario > Map Options` → a menu path with a separator between items. */
function menuPath(path: string): MdastNode {
  const children: Child[] = [];
  path.split('>').map((item) => item.trim()).filter(Boolean).forEach((item, index) => {
    if (index > 0) children.push(element('emphasis', 'span', { className: ['menu-sep'], ariaHidden: 'true' }, [text('›')]));
    children.push(element('emphasis', 'span', {}, [text(item)]));
  });
  return element('emphasis', 'span', { className: ['menu-path'] }, children);
}

/** A screenshot: the image when its file exists next to the lesson, otherwise a placeholder showing the capture note. */
function shot(alt: string, attributes: Record<string, string | null | undefined> | null | undefined, fileURL: URL): MdastNode {
  const src = attributes?.src ?? '';
  if (!src.startsWith('./')) {
    throw new Error(`::shot needs a src relative to the lesson, starting with "./" (${fileURLToPath(fileURL)}: "${alt}")`);
  }
  const caption = attributes?.caption;
  const figcaption = caption ? [element('paragraph', 'figcaption', {}, [text(caption)])] : [];
  if (existsSync(fileURLToPath(new URL(src, fileURL)))) {
    return element('blockquote', 'figure', { className: ['shot'] }, [{ type: 'image', url: src, alt }, ...figcaption]);
  }
  return element('blockquote', 'figure', { className: ['shot', 'shot-missing'] }, [
    element('paragraph', 'div', { className: ['shot-placeholder'] }, [
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
      if (node.name === 'kbd') return keys(ctx.textContent(node));
      if (node.name === 'menu') return menuPath(ctx.textContent(node));
    },
    leafDirective(node, ctx) {
      if (node.name === 'shot') return shot(ctx.textContent(node), node.attributes, fileURL);
    },
    containerDirective(node) {
      // A `:::name[label]` label arrives as a first paragraph flagged `directiveLabel`.
      const [first, ...rest] = node.children;
      const label = first?.type === 'paragraph' && first.data?.directiveLabel ? first : undefined;
      const body = label ? rest : node.children;
      const title = (fallback: string) => element('paragraph', 'p', { className: ['tutorial-callout-title'] }, label ? label.children : [text(fallback)]);
      if (node.name === 'steps') return element('blockquote', 'div', { className: ['tutorial-steps'] }, body);
      if (node.name === 'checkpoint') return element('blockquote', 'aside', { className: ['tutorial-checkpoint'] }, [title(CHECKPOINT_TITLE), ...body]);
      const calloutTitle = CALLOUTS[node.name];
      if (calloutTitle) {
        return element('blockquote', 'aside', { className: ['tutorial-callout', `tutorial-callout-${node.name}`] }, [title(calloutTitle), ...body]);
      }
    },
    html(node) {
      // Author notes marking editor facts to confirm; `tutorial:check` lists them.
      if (/^<!--\s*verify:/.test(node.value)) return { raw: '' };
    },
    link(node, ctx) {
      // Starlight pages don't use the shell's client router; load them in full.
      if (node.url.startsWith('/framework/docs/')) ctx.setProperty(node, 'data', { ...node.data, hProperties: { dataAstroReload: '' } });
    },
  };
}
