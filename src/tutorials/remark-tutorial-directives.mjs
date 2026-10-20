import { statSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { toString as mdastToString } from "mdast-util-to-string";
import { visit } from "unist-util-visit";

const VERIFY_COMMENT = /<!--\s*verify:[\s\S]*?-->/g;

function h(tagName, properties = {}, children = []) {
  return {
    type: "paragraph",
    data: { hName: tagName, hProperties: properties },
    children,
  };
}

function span(tagName, properties = {}, children = []) {
  return {
    type: "emphasis",
    data: { hName: tagName, hProperties: properties },
    children,
  };
}

function text(value) {
  return { type: "text", value };
}

function isFile(filePath) {
  try {
    return statSync(filePath).isFile();
  } catch {
    return false;
  }
}

export function remarkTutorialDirectives() {
  return (tree, file) => {
    visit(tree, (node, index, parent) => {
      if (!parent || index === undefined) return;

      if (node.type === "html" && typeof node.value === "string") {
        const cleaned = node.value.replace(VERIFY_COMMENT, "").trim();
        if (!cleaned) {
          parent.children.splice(index, 1);
          return index;
        }
        node.value = cleaned;
        return;
      }

      if (node.type === "textDirective") {
        if (node.name === "kbd") {
          const combination = mdastToString(node).trim();
          const names = combination.split(/(?<=\S)\s*\+\s*(?=\S)/).filter(Boolean);
          const children = [];
          names.forEach((key, idx) => {
            if (idx > 0) children.push(text("+"));
            children.push(span("kbd", { className: ["mw-key"] }, [text(key)]));
          });
          parent.children[index] = span("kbd", { className: ["mw-keys"] }, children);
          return;
        }

        if (node.name === "menu") {
          const rawPath = mdastToString(node);
          const items = rawPath
            .split(">")
            .map((item) => item.trim())
            .filter(Boolean);
          const children = [];
          items.forEach((item, idx) => {
            if (idx > 0) {
              children.push(
                span("span", { className: ["mw-menu-sep"], "aria-hidden": "true" }, [text("›")]),
              );
              children.push(span("span", { className: ["sr-only"] }, [text(" > ")]));
            }
            children.push(span("span", {}, [text(item)]));
          });
          parent.children[index] = span("span", { className: ["mw-menu-path"] }, children);
          return;
        }
      }

      if (node.type === "leafDirective" && node.name === "shot") {
        const alt = mdastToString(node);
        const src = node.attributes?.src ?? "";
        const caption = node.attributes?.caption;
        const figcaption = caption ? [h("figcaption", {}, [text(caption)])] : [];
        const fileDir = file.path ? dirname(file.path) : "";
        const resolved = fileDir && src ? resolve(fileDir, src) : "";

        if (resolved && isFile(resolved)) {
          parent.children[index] = h("figure", { className: ["mw-shot"] }, [
            { type: "image", url: src, alt },
            ...figcaption,
          ]);
          return;
        }

        parent.children[index] = h("figure", { className: ["mw-shot", "mw-shot-missing"] }, [
          h("div", { className: ["mw-shot-placeholder"], "data-pagefind-ignore": "" }, [
            span("span", { className: ["mw-shot-flag"] }, [text("Screenshot")]),
            span("span", { className: ["mw-shot-note"] }, [text(alt)]),
          ]),
          ...figcaption,
        ]);
        return;
      }

      if (node.type === "containerDirective") {
        if (node.name === "steps") {
          for (const child of node.children) {
            if (child.type === "list") {
              child.data = { ...child.data, hProperties: { className: ["mw-steps-list"] } };
              for (const item of child.children ?? []) {
                if (item.type === "listItem") {
                  item.data = { ...item.data, hProperties: { className: ["mw-step-item"] } };
                }
              }
            }
          }
          parent.children[index] = h("div", { className: ["mw-steps"] }, node.children);
          return;
        }

        if (node.name === "checkpoint") {
          parent.children[index] = h(
            "aside",
            {
              "aria-label": "Checkpoint",
              className: ["starlight-aside", "starlight-aside--tip", "mw-checkpoint"],
            },
            [
              h("p", { className: ["starlight-aside__title"], "aria-hidden": "true" }, [
                text("Checkpoint: your map now…"),
              ]),
              h("div", { className: ["starlight-aside__content"] }, node.children),
            ],
          );
          return;
        }
      }
    });
  };
}

export function starlightTutorialDirectivesPlugin() {
  return {
    name: "starlight-tutorial-directives",
    hooks: {
      "config:setup"({ addIntegration }) {
        addIntegration({
          name: "starlight-tutorial-directives-integration",
          hooks: {
            "astro:config:setup"({ updateConfig }) {
              updateConfig({
                markdown: {
                  remarkPlugins: [remarkTutorialDirectives],
                },
              });
            },
          },
        });
      },
    },
  };
}
