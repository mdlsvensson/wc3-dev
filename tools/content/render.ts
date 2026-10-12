// @deno-types="@types/markdown-it"
import MarkdownIt from "markdown-it";
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
      const headings: Heading[] = [];
      const code: CodeBlock[] = [];
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
          code.push({
            language: language.name,
            code: token.content,
            line,
            skip,
            group: null,
          });
          text.push(token.content);
        }
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
