import { createHighlighterCore, type HighlighterCore } from 'shiki/core';
import { createJavaScriptRegexEngine } from 'shiki/engine/javascript';
import lua from 'shiki/langs/lua.mjs';
import typescript from 'shiki/langs/typescript.mjs';
import githubDark from 'shiki/themes/github-dark.mjs';
import { jass } from '../../syntax/jass.ts';
import { type PreviewFile, scriptLanguage } from './files.ts';
import { fetchBytes, goLive, h, toolbar } from './ui.ts';

let highlighter: Promise<HighlighterCore> | undefined;
// Only three grammars and the JavaScript regex engine (no WebAssembly), to keep this chunk small.
const getHighlighter = () =>
  highlighter ??= createHighlighterCore({
    themes: [githubDark],
    langs: [lua, typescript, jass],
    engine: createJavaScriptRegexEngine({ forgiving: true }),
  }).catch((error) => {
    // A failed creation must not be cached, so Retry can try again.
    highlighter = undefined;
    throw error;
  });

export async function mount(preview: HTMLElement, files: PreviewFile[]): Promise<() => void> {
  const scripts = files.filter((file) => file.role === 'script');
  if (!scripts.length) throw new Error('this resource has no script files');
  const [shiki, sources] = await Promise.all([
    getHighlighter(),
    Promise.all(scripts.map(async (file) => new TextDecoder().decode(await fetchBytes(file.url)))),
  ]);

  // With one file there is no tablist, so the code is labelled by its file name instead of being a tab panel.
  const tabbed = scripts.length > 1;
  const code = h('div', { class: 'script-code', tabindex: '0', ...(tabbed ? { role: 'tabpanel' } : { 'aria-label': `${scripts[0].name} source` }) });
  const info = h('span', { class: 'preview-info' });
  const tabs = scripts.map((file, index) =>
    h('button', { type: 'button', role: 'tab', class: 'script-tab', id: `script-tab-${index}`, 'aria-selected': 'false', tabindex: '-1' }, file.name)
  );

  // A final newline would otherwise show as an extra, empty numbered line.
  const trimmed = (index: number) => sources[index].replace(/\r?\n$/, '');
  // Shiki escapes the source text; the HTML it returns is generated here, never fetched.
  const highlight = (index: number) => shiki.codeToHtml(trimmed(index), { lang: scriptLanguage(scripts[index].format), theme: 'github-dark' });
  // Unhighlighted source as text nodes, keeping the numbered-line layout.
  const plain = (index: number) => {
    const lines = trimmed(index).split(/\r?\n/);
    const body = lines.flatMap((line, lineIndex) => [...(lineIndex ? ['\n'] : []), h('span', { class: 'line' }, line)]);
    return h('pre', { class: 'shiki' }, h('code', {}, ...body));
  };
  const render = (index: number, html: string | HTMLElement) => {
    if (typeof html === 'string') code.innerHTML = html;
    else code.replaceChildren(html);
    if (tabbed) code.setAttribute('aria-labelledby', `script-tab-${index}`);
    const lines = trimmed(index).split('\n').length;
    info.textContent = `${scripts[index].name} · ${lines} ${lines === 1 ? 'line' : 'lines'}`;
    tabs.forEach((tab, tabIndex) => {
      tab.setAttribute('aria-selected', String(tabIndex === index));
      tab.tabIndex = tabIndex === index ? 0 : -1;
    });
  };
  // After going live, a highlighting failure falls back to plain text rather than throwing from an event handler.
  const show = (index: number) => {
    let html: string | HTMLElement;
    try {
      html = highlight(index);
    } catch {
      html = plain(index);
    }
    render(index, html);
  };
  tabs.forEach((tab, index) => {
    tab.addEventListener('click', () => show(index));
    tab.addEventListener('keydown', (event) => {
      const step = event.key === 'ArrowRight' ? 1 : event.key === 'ArrowLeft' ? -1 : 0;
      if (!step) return;
      event.preventDefault();
      const next = (index + step + tabs.length) % tabs.length;
      show(next);
      tabs[next].focus();
    });
  });

  // The first highlight runs before going live, so a Shiki failure keeps the static fallback.
  render(0, highlight(0));
  const tabList = tabbed ? [h('div', { class: 'script-tabs', role: 'tablist', 'aria-label': 'Script files' }, ...tabs)] : [];
  goLive(preview, h('div', { class: 'preview-stage preview-script' }, ...tabList, code, toolbar(info)));
  return () => {};
}
