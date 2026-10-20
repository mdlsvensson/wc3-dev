import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import test from "node:test";

const expectedDocsPages = [
  "dist/docs/index.html",
  "dist/docs/guides/getting-started/index.html",
  "dist/docs/guides/project-and-editor/index.html",
  "dist/docs/guides/objects/index.html",
  "dist/docs/guides/components-and-reactions/index.html",
  "dist/docs/guides/abilities-buffs-and-timers/index.html",
  "dist/docs/guides/multiplayer/index.html",
  "dist/docs/reference/cli-and-build/index.html",
  "dist/docs/reference/runtime-api/index.html",
  "dist/docs/reference/objects-and-natives/index.html",
  "dist/docs/reference/diagnostics/index.html",
];

const expectedTutorialsPages = [
  "dist/home/tutorials/index.html",
  "dist/home/tutorials/editor-basics/install-and-open/index.html",
  "dist/home/tutorials/editor-basics/editor-tour/index.html",
  "dist/home/tutorials/editor-basics/create-your-map/index.html",
  "dist/home/tutorials/terrain/painting-tiles/index.html",
  "dist/home/tutorials/terrain/height-and-cliffs/index.html",
  "dist/home/tutorials/terrain/water/index.html",
  "dist/home/tutorials/terrain/finishing-touches/index.html",
  "dist/home/tutorials/placement/doodads/index.html",
  "dist/home/tutorials/placement/units-and-buildings/index.html",
  "dist/home/tutorials/placement/creep-camps/index.html",
  "dist/home/tutorials/placement/regions/index.html",
  "dist/home/tutorials/map-setup/map-options/index.html",
  "dist/home/tutorials/map-setup/players-and-forces/index.html",
  "dist/home/tutorials/object-editor/object-editor-tour/index.html",
  "dist/home/tutorials/object-editor/custom-hero/index.html",
  "dist/home/tutorials/object-editor/custom-ability/index.html",
  "dist/home/tutorials/object-editor/village-tower/index.html",
  "dist/home/tutorials/triggers/trigger-basics/index.html",
  "dist/home/tutorials/triggers/wave-timer/index.html",
  "dist/home/tutorials/triggers/spawning-waves/index.html",
  "dist/home/tutorials/triggers/win-and-lose/index.html",
  "dist/home/tutorials/next/index.html",
];

test("home build emits standalone wc3.dev landing page and 404 page in dist/home without docs routes", () => {
  assert.equal(existsSync("dist/home/index.html"), true, "dist/home/index.html should exist");
  assert.equal(existsSync("dist/home/404.html"), true, "dist/home/404.html should exist");
  assert.equal(existsSync("dist/home/mw.gif"), true, "dist/home/mw.gif should exist");
  assert.equal(
    existsSync("dist/home/mw-text-cropped.png"),
    true,
    "dist/home/mw-text-cropped.png should exist",
  );
  assert.equal(
    existsSync("dist/home/guides"),
    false,
    "dist/home should not contain Starlight guides routes",
  );
  assert.equal(
    existsSync("dist/home/reference"),
    false,
    "dist/home should not contain Starlight reference routes",
  );

  const homeHtml = readFileSync("dist/home/index.html", "utf8");
  assert.doesNotMatch(
    homeHtml,
    /id="starlight__sidebar"/,
    "wc3.dev homepage should not render the Starlight docs sidebar",
  );
  assert.match(
    homeHtml,
    /href="https:\/\/wc3\.dev\/"\s+class="site-title[^"]*"[\s\S]*?src="\/mw-text-cropped\.png"/,
    "top-left site title on wc3.dev should link to https://wc3.dev/ and render /mw-text-cropped.png",
  );
  assert.match(homeHtml, /src="\/mw\.gif"/, "wc3.dev hero should render /mw.gif");
  assert.match(
    homeHtml,
    /All-in-one modding framework for Warcraft III: Reforged/,
    "wc3.dev hero should render the tagline",
  );
  assert.match(
    homeHtml,
    /data-palette-select[\s\S]*value="kanagawa-wave"[\s\S]*value="vitesse-dark"/,
    "wc3.dev header should render the palette selector",
  );
  assert.match(homeHtml, /href="\/tutorials\/"/, "wc3.dev header should link to /tutorials/");

  const docsLinkMatches = [...homeHtml.matchAll(/href="https:\/\/docs\.wc3\.dev(\/[^"#?]*)"/g)];
  assert.equal(
    docsLinkMatches.length >= 6,
    true,
    "wc3.dev homepage should link to docs.wc3.dev sections",
  );
  for (const match of docsLinkMatches) {
    const pathname = match[1];
    const targetPath = pathname.endsWith("/")
      ? `dist/docs${pathname}index.html`
      : `dist/docs${pathname}/index.html`;
    assert.equal(
      existsSync(targetPath),
      true,
      `docs.wc3.dev link ${pathname} on wc3.dev should resolve to ${targetPath}`,
    );
  }
});

test("tutorials build emits Starlight tutorials track under dist/home/tutorials with custom directives and valid internal links", () => {
  for (const page of expectedTutorialsPages) {
    assert.equal(existsSync(page), true, `${page} should exist`);
  }
  assert.equal(
    existsSync("dist/home/tutorials/pagefind/pagefind.js"),
    true,
    "dist/home/tutorials/pagefind/pagefind.js should exist",
  );

  const indexHtml = readFileSync("dist/home/tutorials/index.html", "utf8");
  assert.match(indexHtml, /Defend the Village/);
  assert.match(indexHtml, /id="starlight__sidebar"/);
  assert.match(
    indexHtml,
    /href="https:\/\/wc3\.dev\/"\s+class="site-title[^"]*"[\s\S]*?src="\/mw-text-cropped\.png"/,
    "top-left site title on tutorials should link to https://wc3.dev/ and render /mw-text-cropped.png",
  );

  const createMapHtml = readFileSync(
    "dist/home/tutorials/editor-basics/create-your-map/index.html",
    "utf8",
  );
  assert.match(createMapHtml, /class="mw-tutorial-summary"/);
  assert.match(createMapHtml, /class="mw-tutorial-goals"/);
  assert.match(createMapHtml, /class="mw-menu-path"/);
  assert.match(createMapHtml, /class="mw-keys"/);
  assert.match(createMapHtml, /class="mw-steps"/);
  assert.match(createMapHtml, /class="starlight-aside starlight-aside--tip mw-checkpoint"/);

  for (const page of expectedTutorialsPages) {
    const html = readFileSync(page, "utf8");
    assert.doesNotMatch(
      html,
      /:::steps|:::checkpoint|::shot\[|:kbd\[|:menu\[/,
      `${page} should not leak raw tutorial directives`,
    );
    const hrefMatches = html.matchAll(/href="(\/[^"#?]*)"/g);
    for (const match of hrefMatches) {
      const href = match[1];
      if (href.startsWith("/tutorials/_astro/") || href.startsWith("/tutorials/pagefind/")) {
        continue;
      }
      const targetPath = href.endsWith("/")
        ? `dist/home${href}index.html`
        : existsSync(`dist/home${href}`)
          ? `dist/home${href}`
          : `dist/home${href}/index.html`;
      assert.equal(
        existsSync(targetPath),
        true,
        `internal link ${href} in ${page} should resolve to ${targetPath}`,
      );
    }
  }
});

test("docs build emits all 11 documentation pages, 404 page, pagefind bundle, and valid internal links in dist/docs", () => {
  for (const page of expectedDocsPages) {
    assert.equal(existsSync(page), true, `${page} should exist`);
  }
  assert.equal(existsSync("dist/docs/404.html"), true, "dist/docs/404.html should exist");
  assert.equal(
    existsSync("dist/docs/pagefind/pagefind.js"),
    true,
    "dist/docs/pagefind/pagefind.js should exist",
  );

  const indexHtml = readFileSync("dist/docs/index.html", "utf8");
  assert.match(indexHtml, /Moonwell/);
  assert.match(
    indexHtml,
    /href="https:\/\/wc3\.dev\/"\s+class="site-title[^"]*"[\s\S]*?src="\/mw-text-cropped\.png"/,
    "top-left site title on docs should link to https://wc3.dev/ and render /mw-text-cropped.png",
  );
  assert.match(indexHtml, /\/guides\/getting-started\//);
  assert.match(
    indexHtml,
    /id="starlight__sidebar"/,
    "root docs page should render the full Mintlify-style sidebar layout",
  );

  const gettingStartedHtml = readFileSync("dist/docs/guides/getting-started/index.html", "utf8");
  assert.match(gettingStartedHtml, /Moonwell\.Templates/);

  const objectsNativesHtml = readFileSync(
    "dist/docs/reference/objects-and-natives/index.html",
    "utf8",
  );
  assert.doesNotMatch(
    objectsNativesHtml,
    /namespace Moonwell\.Natives/,
    "objects-and-natives should not claim handle types live in 'namespace Moonwell.Natives'",
  );
  assert.match(objectsNativesHtml, /ObjectList(?:&lt;|&#x3C;)Buff/);

  const cliBuildHtml = readFileSync("dist/docs/reference/cli-and-build/index.html", "utf8");
  assert.match(cliBuildHtml, /ObjectRegistry\.g\.cs/);
  assert.match(cliBuildHtml, /Aasl/);

  for (const page of expectedDocsPages) {
    const html = readFileSync(page, "utf8");
    const hrefMatches = html.matchAll(/href="(\/[^"#?]*)"/g);
    for (const match of hrefMatches) {
      const href = match[1];
      if (href.startsWith("/_astro/") || href.startsWith("/pagefind/")) {
        continue;
      }
      const targetPath = href.endsWith("/")
        ? `dist/docs${href}index.html`
        : existsSync(`dist/docs${href}`)
          ? `dist/docs${href}`
          : `dist/docs${href}/index.html`;
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

test("site defaults to Kanagawa Wave and offers Vitesse Dark as a theme option", () => {
  const guideHtml = readFileSync("dist/docs/guides/getting-started/index.html", "utf8");
  assert.match(
    guideHtml,
    /data-palette-select[\s\S]*value="kanagawa-wave"[\s\S]*value="vitesse-dark"/,
    "header should render a palette selector with Kanagawa Wave and Vitesse Dark options",
  );
  assert.match(
    guideHtml,
    /<pre data-language="csharp">[\s\S]*--0:#DCD7BA[\s\S]*--1:#DBD7CAEE/i,
    "code blocks should render dual syntax token colors for kanagawa-wave (--0) and vitesse-dark (--1)",
  );

  const astroAssets = readdirSync("dist/docs/_astro");
  const cssContent = astroAssets
    .filter((file) => file.endsWith(".css"))
    .map((file) => readFileSync(`dist/docs/_astro/${file}`, "utf8"))
    .join("\n");
  assert.match(cssContent, /#1f1f28/i, "built CSS should include Kanagawa Wave background #1f1f28");
  assert.match(cssContent, /#7e9cd8/i, "built CSS should include Kanagawa Wave primary #7e9cd8");
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
    /aria-current=["']?page["']?/i,
    "built CSS should style active sidebar links as a Mintlify pill",
  );
  assert.match(
    cssContent,
    /Space Grotesk Variable/i,
    "built CSS should configure Space Grotesk for headings",
  );
  assert.doesNotMatch(
    cssContent,
    /Pixelify Sans|Jersey 15/i,
    "built CSS should not include pixel fonts",
  );
  assert.match(
    cssContent,
    /IBM Plex Sans Variable/i,
    "built CSS should configure IBM Plex Sans for body text",
  );
  assert.match(
    cssContent,
    /JetBrains Mono Variable/i,
    "built CSS should configure JetBrains Mono for code",
  );
});

test("wrangler.jsonc and wrangler.docs.jsonc configure static assets for wc3-dev and wc3-docs", () => {
  const homeRaw = readFileSync("wrangler.jsonc", "utf8");
  const homeConfig = JSON.parse(homeRaw);
  assert.equal(homeConfig.name, "wc3-dev");
  assert.equal(homeConfig.assets?.directory, "./dist/home");
  assert.equal(homeConfig.assets?.not_found_handling, "404-page");

  assert.equal(existsSync("wrangler.docs.jsonc"), true, "wrangler.docs.jsonc should exist");
  const docsRaw = readFileSync("wrangler.docs.jsonc", "utf8");
  const docsConfig = JSON.parse(docsRaw);
  assert.equal(docsConfig.name, "wc3-docs");
  assert.equal(docsConfig.assets?.directory, "./dist/docs");
  assert.equal(docsConfig.assets?.not_found_handling, "404-page");
});

test("README.md is untouched in git", () => {
  const diff = execFileSync("git", ["diff", "HEAD", "--", "README.md"], {
    encoding: "utf8",
  });
  assert.equal(diff, "");
});
