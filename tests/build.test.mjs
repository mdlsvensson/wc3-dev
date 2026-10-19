import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";

test("astro build emits landing page, getting-started guide, 404 page, and pagefind bundle", () => {
  assert.equal(existsSync("dist/index.html"), true, "dist/index.html should exist");
  assert.equal(
    existsSync("dist/guides/getting-started/index.html"),
    true,
    "dist/guides/getting-started/index.html should exist",
  );
  assert.equal(existsSync("dist/404.html"), true, "dist/404.html should exist");
  assert.equal(
    existsSync("dist/pagefind/pagefind.js"),
    true,
    "dist/pagefind/pagefind.js should exist",
  );

  const indexHtml = readFileSync("dist/index.html", "utf8");
  assert.match(indexHtml, /Moonwell/);
  assert.match(indexHtml, /\/guides\/getting-started\//);
});

test("site is locked to dark mode with Vitesse Dark palette and vitesse-dark code highlighting", () => {
  const guideHtml = readFileSync("dist/guides/getting-started/index.html", "utf8");
  assert.doesNotMatch(
    guideHtml,
    /<starlight-theme-select/,
    "theme switcher should not be rendered in dark-only mode",
  );
  assert.match(
    guideHtml,
    /<pre data-language="csharp">[\s\S]*#DBD7CAEE[\s\S]*#C98A7D/i,
    "code blocks should render with vitesse-dark syntax token colors",
  );

  const astroAssets = readdirSync("dist/_astro");
  const cssContent = astroAssets
    .filter((file) => file.endsWith(".css"))
    .map((file) => readFileSync(`dist/_astro/${file}`, "utf8"))
    .join("\n");
  assert.match(cssContent, /#121212/i, "built CSS should include Vitesse Dark background #121212");
  assert.match(cssContent, /#4d9375/i, "built CSS should include Vitesse Dark primary #4d9375");
});

test("wrangler.jsonc configures static assets with 404-page handling for wc3-dev", () => {
  const raw = readFileSync("wrangler.jsonc", "utf8");
  const config = JSON.parse(raw);
  assert.equal(config.name, "wc3-dev");
  assert.equal(config.assets?.directory, "./dist");
  assert.equal(config.assets?.not_found_handling, "404-page");
});

test("README.md is untouched in git", () => {
  const diff = execFileSync("git", ["diff", "HEAD", "--", "README.md"], {
    encoding: "utf8",
  });
  assert.equal(diff, "");
});
