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
        // A default title is a label drawn by CSS from `aria-label`, so it is no text of the page.
        return written
          ? `<aside class="callout callout-${name}"><p class="callout-title">${
            markdown.utils.escapeHtml(written)
          }</p>\n`
          : `<aside class="callout callout-${name}" aria-label="${
            calloutTitles[name]
          }">\n`;
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
      })
      : `<pre><code>${markdown.utils.escapeHtml(token.content)}</code></pre>`;
    return `<div class="code-block" data-lang="${language.name}" data-label="${language.label}">${body}</div>\n`;
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
      for (let i = 0; i < tokens.length; i++) {
        const token = tokens[i];
        if (token.type === "heading_open") {
          const headingText = visibleText(tokens[i + 1].children ?? []);
          const slug = headingText.toLowerCase().replace(
            /[^\p{L}\p{N}\p{M}_\s-]/gu,
            "",
          )
            .trim().replace(/\s+/g, "-");
          let id = slug;
          for (let suffix = 1; used.has(id); suffix++) id = `${slug}-${suffix}`;
          used.add(id);
          token.attrSet("id", id);
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
      return {
        tokens,
        headings,
        code,
        links,
        text: text.join(" ").replace(/\s+/g, " ").trim(),
      };
    },
    render: (tokens: Token[]) =>
      markdown.renderer.render(tokens, markdown.options, {}),
    dispose: () => highlighter.dispose(),
  };
}
