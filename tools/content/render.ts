// @deno-types="@types/markdown-it"
import MarkdownIt from "markdown-it";
import { createHighlighterCore } from "shiki/core";
import { createJavaScriptRegexEngine } from "shiki/engine/javascript";
import lua from "shiki/langs/lua.mjs";
import githubDark from "shiki/themes/github-dark.mjs";
import type { Heading, SourceLink } from "../../shared/types.ts";

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
    langs: [lua],
    engine: createJavaScriptRegexEngine(),
  });
  const markdown = new MarkdownIt({ html: false });
  // Parse unsafe targets too, so validation reports their source and target instead of silently hiding them.
  markdown.validateLink = () => true;
  markdown.renderer.rules.fence = (tokens, index) => {
    const token = tokens[index];
    const language = token.info.trim().split(/\s+/)[0];
    if (highlighter.getLoadedLanguages().includes(language)) {
      return `${
        highlighter.codeToHtml(token.content, {
          lang: language,
          theme: "github-dark",
        })
      }\n`;
    }
    return `<pre><code>${
      markdown.utils.escapeHtml(token.content)
    }</code></pre>\n`;
  };
  return {
    parse(source: string, content: string) {
      const tokens = markdown.parse(content, {});
      const headings: Heading[] = [];
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
        if (["fence", "code_block"].includes(token.type)) {
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
        links,
        text: text.join(" ").replace(/\s+/g, " ").trim(),
      };
    },
    render: (tokens: Token[]) =>
      markdown.renderer.render(tokens, markdown.options, {}),
    dispose: () => highlighter.dispose(),
  };
}
