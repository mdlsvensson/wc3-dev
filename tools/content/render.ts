// @deno-types="@types/markdown-it"
import MarkdownIt from "markdown-it";
import container from "markdown-it-container";
import { createHighlighterCore, type LanguageRegistration } from "shiki/core";
import { createJavaScriptRegexEngine } from "shiki/engine/javascript";
import json from "shiki/langs/json.mjs";
import lua from "shiki/langs/lua.mjs";
import pkl from "shiki/langs/pkl.mjs";
import powershell from "shiki/langs/powershell.mjs";
import shellscript from "shiki/langs/shellscript.mjs";
import toml from "shiki/langs/toml.mjs";
import githubDark from "shiki/themes/github-dark.mjs";
import yueGrammar from "./grammars/yuescript.tmLanguage.json" with {
  type: "json",
};
import {
  type CodeLanguage,
  codeLanguage,
  codeLanguages,
} from "../../shared/code-languages.ts";
import type { CodeBlock, Heading, SourceLink } from "../../shared/types.ts";
import {
  checkContainers,
  containerName,
  containerNames,
  containerTitle,
} from "./containers.ts";

/** What a note or a warning is called when its author wrote no title. */
const calloutTitles: Record<string, string> = {
  note: "Note",
  warning: "Warning",
};

/** The Shiki grammar of each language of the table. `text` has none. */
const grammars: Record<string, string> = {
  yue: "yue",
  lua: "lua",
  pkl: "pkl",
  toml: "toml",
  json: "json",
  sh: "shellscript",
  powershell: "powershell",
};

// The theme's comment colour (3.05 to 1) is under the site's contrast rule; it becomes the palette's `--text-secondary`.
export const themeCommentColour = "#6a737d";
export const commentColour = "#8fa8c8";

// The ids the page shell, the search and the page script give their own elements: a heading must not be a second one.
const reservedIds = new Set([
  "top",
  "main-content",
  "search-label",
  "search-results",
  "docs-search-input",
  "mobile-menu",
  "doc-mobile-sidebar",
  "doc-mobile-outline",
]);
// The page script names a grouped code block `code-<n>-<language>` and its tab the same with `-tab`.
const reservedIdPatterns = [
  /^search-result-\d+$/,
  new RegExp(
    `^code-\\d+-(?:${
      codeLanguages.map((language) => language.name).join("|")
    })(?:-tab)?$`,
  ),
];
const isReservedId = (id: string) =>
  reservedIds.has(id) || reservedIdPatterns.some((pattern) => pattern.test(id));

interface FenceMeta {
  language: CodeLanguage;
  skip: boolean;
}

export type Token = ReturnType<MarkdownIt["parse"]>[number];

function visibleText(tokens: readonly Token[]): string {
  return tokens.map((token) => {
    if (token.children) return visibleText(token.children);
    if (["text", "code_inline"].includes(token.type)) return token.content;
    return ["softbreak", "hardbreak"].includes(token.type) ? " " : "";
  }).join("");
}

/** A page's meta description: its first paragraph, cut at a word near 160 characters, or else its title. */
export function pageDescription(
  paragraph: string | undefined,
  title: string,
): string {
  const squeeze = (text: string) => text.replace(/\s+/g, " ").trim();
  const text = squeeze(paragraph ?? "") || squeeze(title);
  if (text.length <= 160) return text;
  const cut = text.slice(0, 160);
  const space = cut.lastIndexOf(" ");
  return `${cut.slice(0, space > 80 ? space : 160).replace(/[\s,;:.]+$/, "")}…`;
}

export function visitTokens(
  tokens: readonly Token[],
  visit: (token: Token) => void,
): void {
  for (const token of tokens) {
    visit(token);
    if (token.children) visitTokens(token.children, visit);
  }
}

export async function createRenderer() {
  // All grammars and the theme are bundled imports. No request-time grammar downloads or WASM reads.
  const highlighter = await createHighlighterCore({
    themes: [githubDark],
    langs: [
      lua,
      pkl,
      toml,
      json,
      shellscript,
      powershell,
      { ...yueGrammar, name: "yue" } as unknown as LanguageRegistration,
    ],
    engine: createJavaScriptRegexEngine(),
  });
  const markdown = new MarkdownIt({ html: false });
  // Parse unsafe targets too, so validation reports their source and target instead of silently hiding them.
  markdown.validateLink = () => true;
  for (const name of containerNames) {
    // The checks read a block's name with `containerName` too, so that the plugin and they agree on what a block is.
    const validate = (params: string) => containerName(params) === name;
    if (name === "code-group") {
      markdown.use(container, name, {
        validate,
        render(tokens: Token[], index: number) {
          const token = tokens[index];
          if (token.nesting !== 1) return "</div>\n";
          const tabs = (token.meta as { languages: CodeLanguage[] }).languages
            .map(
              ({ name, label }) =>
                `<button type="button" role="tab" class="code-tab" data-lang="${name}" ` +
                `aria-label="${label}"></button>`,
            ).join("\n");
          return '<div class="code-group">\n' +
            '<div class="code-tabs" role="tablist" aria-label="Code language">\n' +
            `${tabs}\n</div>\n`;
        },
      });
      continue;
    }
    markdown.use(container, name, {
      validate,
      render(tokens: Token[], index: number) {
        const token = tokens[index];
        if (token.nesting !== 1) return "</aside>\n";
        const written = containerTitle(token.info);
        const kind = calloutTitles[name];
        // `aria-label` tells every callout's kind. A default title is drawn by CSS from `data-title`, so it is no text
        // of the page.
        const open =
          `<aside class="callout callout-${name}" role="note" aria-label="${kind}"`;
        return written
          ? `${open}><p class="callout-title">${
            markdown.utils.escapeHtml(written)
          }</p>\n`
          : `${open} data-title="${kind}">\n`;
      },
    });
  }
  markdown.renderer.rules.fence = (tokens, index) => {
    const token = tokens[index];
    const { language } = token.meta as FenceMeta;
    const grammar = grammars[language.name];
    const body = grammar
      ? highlighter.codeToHtml(token.content, {
        lang: grammar,
        theme: "github-dark",
        colorReplacements: { [themeCommentColour]: commentColour },
      })
      : `<pre><code>${markdown.utils.escapeHtml(token.content)}</code></pre>`;
    return `<div class="code-block" data-lang="${language.name}" data-label="${language.label}">${body}</div>\n`;
  };
  // A heading is always the three tokens `heading_open`, `inline`, `heading_close`.
  markdown.renderer.rules.heading_close = (tokens, index) => {
    const open = tokens[index - 2];
    const level = Number(open.tag.slice(1));
    if (level < 2 || level > 4) return `</${open.tag}>\n`;
    const escape = markdown.utils.escapeHtml;
    const text = (open.meta as { text: string }).text;
    return `<a class="heading-anchor" href="#${
      escape(open.attrGet("id")!)
    }" aria-label="${escape(`Link to ${text}`)}"></a></${open.tag}>\n`;
  };
  return {
    parse(source: string, content: string) {
      const tokens = markdown.parse(content, {});
      checkContainers(source, tokens, content.split(/\r?\n/));
      const headings: Heading[] = [];
      const code: CodeBlock[] = [];
      const blockOf = new Map<Token, CodeBlock>();
      const used = new Set<string>();
      const links: SourceLink[] = [];
      const text: string[] = [];
      // Hand-written ids are all known before a made id is checked against them.
      const written = new Map<Token, string>();
      const writtenIds = new Set<string>();
      for (let i = 0; i < tokens.length; i++) {
        if (tokens[i].type !== "heading_open") continue;
        const line = (tokens[i].map?.[0] ?? 0) + 1;
        const last = tokens[i + 1].children?.at(-1);
        const marker = last?.type === "text"
          ? /\s*\{#([^}]*)\}\s*$/.exec(last.content)
          : null;
        if (marker && last) {
          const id = marker[1];
          if (!id) {
            throw new Error(
              `${source}:${line}: heading id is empty: write one as {#id}`,
            );
          }
          if (!/^[a-z0-9][a-z0-9._-]*$/.test(id)) {
            throw new Error(
              `${source}:${line}: heading id may hold a-z, 0-9, '.', '_' and '-': ${id}`,
            );
          }
          if (writtenIds.has(id)) {
            throw new Error(
              `${source}:${line}: heading id ${id} is written twice`,
            );
          }
          last.content = last.content.slice(0, marker.index);
          writtenIds.add(id);
          written.set(tokens[i], id);
        }
        // What is left of the heading must not show a marker (a code span may).
        visitTokens(tokens[i + 1].children ?? [], (child) => {
          const shown = child.type === "text"
            ? /\{#[^}]*\}?/.exec(child.content)
            : null;
          if (shown) {
            throw new Error(
              `${source}:${line}: heading id marker must end the heading: ${
                shown[0]
              }`,
            );
          }
        });
      }
      for (let i = 0; i < tokens.length; i++) {
        const token = tokens[i];
        if (token.type === "heading_open") {
          const line = (token.map?.[0] ?? 0) + 1;
          const headingText = visibleText(tokens[i + 1].children ?? []).trim();
          if (!headingText) {
            throw new Error(`${source}:${line}: heading has no text`);
          }
          let id = written.get(token);
          if (id === undefined) {
            // A dot stays only between two letters or digits: `unit.create`, `moonwell.toml`, `0.32.1`.
            const slug = headingText.toLowerCase()
              .replace(/(?<![\p{L}\p{N}])\.|\.(?![\p{L}\p{N}])/gu, "")
              .replace(/[^\p{L}\p{N}\p{M}_\s.-]/gu, "")
              .trim().replace(/\s+/g, "-");
            if (!slug) {
              throw new Error(
                `${source}:${line}: heading has no id: write one as {#id}`,
              );
            }
            // A made id steps over other made ids only: a hand-written id is never taken or stepped over.
            for (let suffix = 0;; suffix++) {
              id = suffix ? `${slug}-${suffix}` : slug;
              if (writtenIds.has(id)) {
                throw new Error(
                  `${source}:${line}: heading id ${id} is also written by hand`,
                );
              }
              if (!used.has(id)) break;
            }
          }
          if (isReservedId(id)) {
            throw new Error(
              `${source}:${line}: heading id ${id} is used by the page itself: write another as {#id}`,
            );
          }
          // `used` holds made ids only, so that a made id steps over made ids alone.
          if (!written.has(token)) used.add(id);
          token.attrSet("id", id);
          token.meta = { text: headingText };
          headings.push({
            id,
            text: headingText,
            level: Number(token.tag.slice(1)),
          });
        }
        if (token.type === "inline") {
          text.push(visibleText(token.children ?? []));
        }
        if (/^container_(note|warning)_open$/.test(token.type)) {
          // A written title is the author's prose and searchable; a default title is a label and is not.
          const written = containerTitle(token.info);
          if (written) text.push(written);
        }
        if (token.type === "fence" || token.type === "code_block") {
          const line = (token.map?.[0] ?? 0) + 1;
          const [name = "", ...words] = token.type === "fence"
            ? token.info.trim().split(/\s+/).filter(Boolean)
            : [];
          const language = codeLanguage(name);
          if (!language) {
            throw new Error(
              `${source}:${line}: ${
                name
                  ? `unknown code language ${name}`
                  : "code block without a language"
              }`,
            );
          }
          const other = words.find((word) => word !== "skip");
          if (other) {
            throw new Error(
              `${source}:${line}: unknown word after the code language: ${other}`,
            );
          }
          const skip = words.includes("skip");
          token.meta = { language, skip } satisfies FenceMeta;
          const block: CodeBlock = {
            language: language.name,
            code: token.content,
            line,
            skip,
            group: null,
          };
          code.push(block);
          blockOf.set(token, block);
          text.push(token.content);
        }
      }
      let groups = 0;
      for (let i = 0; i < tokens.length; i++) {
        if (tokens[i].type !== "container_code-group_open") continue;
        const line = (tokens[i].map?.[0] ?? 0) + 1;
        const languages: CodeLanguage[] = [];
        let end = i + 1;
        for (; tokens[end].type !== "container_code-group_close"; end++) {
          const inner = tokens[end];
          if (inner.type !== "fence") {
            throw new Error(
              `${source}:${
                (inner.map?.[0] ?? 0) + 1
              }: a code group holds code blocks only`,
            );
          }
          const { language } = inner.meta as FenceMeta;
          if (languages.includes(language)) {
            throw new Error(
              `${source}:${
                (inner.map?.[0] ?? 0) + 1
              }: ${language.name} is twice in one code group`,
            );
          }
          languages.push(language);
          blockOf.get(inner)!.group = groups;
        }
        if (languages.length < 2) {
          throw new Error(
            `${source}:${line}: a code group needs at least two code blocks`,
          );
        }
        tokens[i].meta = { languages };
        groups++;
        i = end;
      }
      if (headings.filter((heading) => heading.level === 1).length !== 1) {
        throw new Error(`${source}: expected exactly one h1 heading`);
      }
      visitTokens(tokens, (token) => {
        const attribute = token.type === "image"
          ? "src"
          : token.type === "link_open"
          ? "href"
          : null;
        if (attribute) {
          links.push({
            target: token.attrGet(attribute)!,
            image: token.type === "image",
          });
        }
      });
      // The first paragraph that is not inside a list, a quote or a block.
      const first = tokens.findIndex((token) =>
        token.type === "paragraph_open" && token.level === 0
      );
      const paragraph = first < 0
        ? undefined
        : visibleText(tokens[first + 1].children ?? []);
      return {
        tokens,
        headings,
        code,
        links,
        paragraph,
        text: text.join(" ").replace(/\s+/g, " ").trim(),
      };
    },
    render: (tokens: Token[]) =>
      markdown.renderer.render(tokens, markdown.options, {}),
    dispose: () => highlighter.dispose(),
  };
}
