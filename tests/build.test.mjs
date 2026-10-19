import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import test from "node:test";

const expectedPages = [
  "dist/index.html",
  "dist/guides/getting-started/index.html",
  "dist/guides/project-and-editor/index.html",
  "dist/guides/objects/index.html",
  "dist/guides/components-and-reactions/index.html",
  "dist/guides/abilities-buffs-and-timers/index.html",
  "dist/guides/multiplayer/index.html",
  "dist/reference/cli-and-build/index.html",
  "dist/reference/runtime-api/index.html",
  "dist/reference/objects-and-natives/index.html",
  "dist/reference/diagnostics/index.html",
];

test("astro build emits all 11 documentation pages, 404 page, pagefind bundle, and valid internal links", () => {
  for (const page of expectedPages) {
    assert.equal(existsSync(page), true, `${page} should exist`);
  }
  assert.equal(existsSync("dist/404.html"), true, "dist/404.html should exist");
  assert.equal(
    existsSync("dist/pagefind/pagefind.js"),
    true,
    "dist/pagefind/pagefind.js should exist",
  );

  const indexHtml = readFileSync("dist/index.html", "utf8");
  assert.match(indexHtml, /Moonwell/);
  assert.match(indexHtml, /\/guides\/getting-started\//);
  assert.match(
    indexHtml,
    /id="starlight__sidebar"/,
    "root docs page should render the full Mintlify-style sidebar layout",
  );

  const gettingStartedHtml = readFileSync("dist/guides/getting-started/index.html", "utf8");
  assert.match(gettingStartedHtml, /Moonwell\.Templates/);

  const objectsNativesHtml = readFileSync("dist/reference/objects-and-natives/index.html", "utf8");
  assert.doesNotMatch(
    objectsNativesHtml,
    /namespace Moonwell\.Natives/,
    "objects-and-natives should not claim handle types live in 'namespace Moonwell.Natives'",
  );
  assert.match(objectsNativesHtml, /ObjectList(?:&lt;|&#x3C;)Buff/);

  const cliBuildHtml = readFileSync("dist/reference/cli-and-build/index.html", "utf8");
  assert.match(cliBuildHtml, /ObjectRegistry\.g\.cs/);
  assert.match(cliBuildHtml, /Aasl/);

  for (const page of expectedPages) {
    const html = readFileSync(page, "utf8");
    const hrefMatches = html.matchAll(/href="(\/[^"#?]*)"/g);
    for (const match of hrefMatches) {
      const href = match[1];
      if (href.startsWith("/_astro/") || href.startsWith("/pagefind/")) {
        continue;
      }
      const targetPath = href.endsWith("/")
        ? `dist${href}index.html`
        : existsSync(`dist${href}`)
          ? `dist${href}`
          : `dist${href}/index.html`;
      assert.equal(
        existsSync(targetPath),
        true,
        `internal link ${href} in ${page} should resolve to ${targetPath}`,
      );
    }
  }
});

test("biome.json is configured and biome check passes cleanly", () => {
  assert.equal(existsSync("biome.json"), true, "biome.json should exist");
  const biomeConfig = JSON.parse(readFileSync("biome.json", "utf8"));
  assert.equal(
    biomeConfig.css?.parser?.tailwindDirectives,
    true,
    "biome.json should enable css.parser.tailwindDirectives for Tailwind v4",
  );

  const pkg = JSON.parse(readFileSync("package.json", "utf8"));
  assert.equal(typeof pkg.scripts?.lint, "string", "package.json should define a lint script");
  assert.equal(typeof pkg.scripts?.format, "string", "package.json should define a format script");

  execFileSync(process.execPath, ["./node_modules/@biomejs/biome/bin/biome", "check", "."], {
    encoding: "utf8",
  });
});

test("site is locked to dark mode with Mintlify layout styling and Vitesse Dark palette", () => {
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
  assert.match(
    cssContent,
    /backdrop-filter:\s*blur\(12px\)/i,
    "built CSS should include Mintlify translucent blurred header",
  );
  assert.match(
    cssContent,
    /site-search[\s\S]*9999px/i,
    "built CSS should style the search trigger as a Mintlify pill",
  );
  assert.match(
    cssContent,
    /aria-current=["']?page["']?[\s\S]*#80a665/i,
    "built CSS should style active sidebar links as a Vitesse green Mintlify pill",
  );
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
