import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import test from "node:test";
import {
  getPatchVersions,
  sortPatchVersions,
  transformPatchNotesMarkdown,
} from "../src/patch-notes/versions.mjs";

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

test("home build emits standalone wc3.dev landing page, /moonwell page, and 404 page in dist/home without docs routes", () => {
  assert.equal(existsSync("dist/home/index.html"), true, "dist/home/index.html should exist");
  assert.equal(
    existsSync("dist/home/moonwell/index.html"),
    true,
    "dist/home/moonwell/index.html should exist",
  );
  assert.equal(existsSync("dist/home/404.html"), true, "dist/home/404.html should exist");
  assert.equal(existsSync("dist/home/mw.gif"), true, "dist/home/mw.gif should exist");
  assert.equal(
    existsSync("dist/home/wc3-dev-logo.svg"),
    true,
    "dist/home/wc3-dev-logo.svg should exist",
  );
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
    /href="https:\/\/wc3\.dev\/"\s+class="site-title[^"]*"[\s\S]*?src="\/wc3-dev-logo\.svg"/,
    "top-left site title on wc3.dev should link to https://wc3.dev/ and render /wc3-dev-logo.svg",
  );
  assert.doesNotMatch(
    homeHtml,
    /src="\/(?:mw\.gif|reforged\.png)"/,
    "wc3.dev hero should only render text and buttons without a hero image",
  );
  assert.match(
    homeHtml,
    /Warcraft III: Reforged Modding Portal/,
    "wc3.dev command header should render the portal heading",
  );
  assert.match(
    homeHtml,
    /class="mw-dashboard"/,
    "wc3.dev homepage should render the control center dashboard grid",
  );
  assert.match(
    homeHtml,
    /3\.0\.1/,
    "wc3.dev dashboard should display Warcraft III 3.0.1 telemetry/patch info",
  );
  assert.match(
    homeHtml,
    /dotnet new install Moonwell\.Templates/,
    "wc3.dev dashboard should render the CLI quickstart terminal commands",
  );
  assert.match(
    homeHtml,
    /War3Net/,
    "wc3.dev dashboard should link to War3Net in the C# toolchain panel",
  );
  assert.match(
    homeHtml,
    /CSharp\.lua/,
    "wc3.dev dashboard should link to CSharp.lua in the C# toolchain panel",
  );
  assert.match(
    homeHtml,
    /Hive Workshop/,
    "wc3.dev dashboard should link to Hive Workshop in the modding tools panel",
  );
  assert.match(
    homeHtml,
    /Blizzard Entertainment/,
    "wc3.dev footer should credit Blizzard Entertainment",
  );

  const homeCssFiles = readdirSync("dist/home/_astro").filter((file) => file.endsWith(".css"));
  const homeCss = homeCssFiles
    .map((file) => readFileSync(`dist/home/_astro/${file}`, "utf8"))
    .join("\n");
  assert.match(
    homeCss,
    /\.mw-dashboard-main\{[^}]*max-width:\s*none/i,
    "wc3.dev control center should span the full width of the display (max-width: none)",
  );
  assert.match(
    homeCss,
    /box-sizing:\s*border-box/i,
    "wc3.dev homepage should use border-box sizing to prevent horizontal overflow",
  );
  assert.match(
    homeCss,
    /100dvh/i,
    "wc3.dev control center should lock to 100dvh as a one-page app on desktop viewports",
  );
  assert.doesNotMatch(
    homeHtml,
    /data-palette-select/,
    "wc3.dev header should not render a theme selector",
  );
  assert.match(homeHtml, /class="lucide\b/, "wc3.dev homepage should render Lucide icons");
  assert.match(homeHtml, /href="\/moonwell\/"/, "wc3.dev header should link to /moonwell/");
  assert.match(homeHtml, /href="\/tutorials\/"/, "wc3.dev header should link to /tutorials/");
  assert.match(homeHtml, /href="\/patch-notes\/"/, "wc3.dev should link to /patch-notes/");
  assert.match(homeHtml, /World Editor Tutorials/, "wc3.dev homepage should highlight Tutorials");
  assert.match(homeHtml, /Defend the Village/, "wc3.dev homepage should describe the tutorial map");

  const moonwellHtml = readFileSync("dist/home/moonwell/index.html", "utf8");
  assert.doesNotMatch(
    moonwellHtml,
    /id="starlight__sidebar"/,
    "wc3.dev/moonwell should not render the Starlight docs sidebar",
  );
  assert.match(
    moonwellHtml,
    /href="https:\/\/wc3\.dev\/"\s+class="site-title[^"]*"[\s\S]*?src="\/mw-text-cropped\.png"/,
    "top-left site title on wc3.dev/moonwell should link to https://wc3.dev/ and render /mw-text-cropped.png",
  );
  assert.match(moonwellHtml, /src="\/mw\.gif"/, "wc3.dev/moonwell should render /mw.gif");
  assert.match(moonwellHtml, /class="lucide\b/, "wc3.dev/moonwell should render Lucide icons");
  assert.match(
    moonwellHtml,
    /All-in-one modding framework for Warcraft III: Reforged/,
    "wc3.dev/moonwell should render the tagline",
  );
  assert.match(
    moonwellHtml,
    /Moonwell Documentation/,
    "wc3.dev/moonwell should render the Moonwell Documentation section",
  );

  const docsLinkMatches = [...moonwellHtml.matchAll(/href="https:\/\/docs\.wc3\.dev(\/[^"#?]*)"/g)];
  assert.equal(
    docsLinkMatches.length >= 6,
    true,
    "wc3.dev/moonwell should link to docs.wc3.dev sections",
  );
  for (const match of docsLinkMatches) {
    const pathname = match[1];
    const targetPath = pathname.endsWith("/")
      ? `dist/docs${pathname}index.html`
      : `dist/docs${pathname}/index.html`;
    assert.equal(
      existsSync(targetPath),
      true,
      `docs.wc3.dev link ${pathname} on wc3.dev/moonwell should resolve to ${targetPath}`,
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
    /href="https:\/\/wc3\.dev\/"\s+class="site-title[^"]*"[\s\S]*?src="\/wc3-dev-logo\.svg"/,
    "top-left site title on tutorials should link to https://wc3.dev/ and render /wc3-dev-logo.svg",
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

test("patch-notes build renders latest patch at /patch-notes/ without an overview page and orders versions descending", () => {
  const expectedPatchNotesPages = [
    "dist/home/patch-notes/index.html",
    "dist/home/patch-notes/3.0.0/index.html",
    "dist/home/patch-notes/2.0.4/index.html",
    "dist/home/patch-notes/2.0.3/index.html",
  ];
  for (const page of expectedPatchNotesPages) {
    assert.equal(existsSync(page), true, `${page} should exist`);
  }
  assert.equal(
    existsSync("dist/home/patch-notes/pagefind/pagefind.js"),
    true,
    "dist/home/patch-notes/pagefind/pagefind.js should exist",
  );

  const indexHtml = readFileSync("dist/home/patch-notes/index.html", "utf8");
  assert.match(indexHtml, /id="starlight__sidebar"/);
  assert.match(
    indexHtml,
    /href="https:\/\/wc3\.dev\/"\s+class="site-title[^"]*"[\s\S]*?src="\/wc3-dev-logo\.svg"/,
    "top-left site title on patch-notes should link to https://wc3.dev/ and render /wc3-dev-logo.svg",
  );
  assert.doesNotMatch(
    indexHtml,
    /All Patch Notes/,
    "/patch-notes/ should not render a separate overview item in the sidebar",
  );
  assert.match(
    indexHtml,
    /BlzUnitHeal/,
    "/patch-notes/ root page should render the latest patch (3.0.1) directly",
  );
  assert.match(
    indexHtml,
    /Silverpine Sprint/,
    "/patch-notes/ root page should render Patch 3.0.1 content",
  );
  const pos301 = indexHtml.indexOf("Patch 3.0.1");
  const pos300 = indexHtml.indexOf("Patch 3.0.0");
  assert.equal(
    pos301 !== -1 && pos300 !== -1 && pos301 < pos300,
    true,
    "Patch 3.0.1 should appear before Patch 3.0.0",
  );

  const patch300Html = readFileSync("dist/home/patch-notes/3.0.0/index.html", "utf8");
  assert.match(patch300Html, /Forsaken Paladin/);
  assert.match(
    patch300Html,
    /<li>Added new UI Theme - Forsaken Kingdom<\/li>/,
    "3.0.0 patch notes should render tight list items without loose <p> wrappers caused by indented headings",
  );

  const patch203Html = readFileSync("dist/home/patch-notes/2.0.3/index.html", "utf8");
  assert.match(
    patch203Html,
    /class="mw-patch-badge mw-patch-buff"[\s\S]*?lucide-circle-arrow-up/,
    "2.0.3 patch notes should render Lucide buff icons",
  );
  assert.match(
    patch203Html,
    /class="mw-patch-badge mw-patch-nerf"[\s\S]*?lucide-circle-arrow-down/,
    "2.0.3 patch notes should render Lucide nerf icons",
  );
  assert.match(
    patch203Html,
    /class="mw-patch-badge mw-patch-neutral"[\s\S]*?lucide-circle-minus/,
    "2.0.3 patch notes should render Lucide neutral/adjustment icons",
  );
  assert.doesNotMatch(
    patch203Html,
    /AAAEm0lEQVR4|AAADX9CSS|AAAE4klEQVR4/,
    "2.0.3 patch notes should replace Liquipedia buff/nerf/neutral base64 PNGs with Lucide SVGs",
  );
  assert.match(
    patch203Html,
    /<li>Added a countdown timer to the UI for construction and training<\/li>/,
    "2.0.3 patch notes should render tight list items after normalizing indented headings",
  );

  const sampleMd =
    "- :buff: Archer\n- :nerf: Wisp\n- :neutral: Ward\n\n  ## **General**\n\n  ### **Human**\n\n-\n";
  const transformed = transformPatchNotesMarkdown(sampleMd);
  assert.match(transformed, /mw-patch-buff/);
  assert.match(transformed, /mw-patch-nerf/);
  assert.match(transformed, /mw-patch-neutral/);
  assert.match(transformed, /^## \*\*General\*\*$/m);
  assert.match(transformed, /^### \*\*Human\*\*$/m);
  assert.doesNotMatch(transformed, /^-\s*$/m);

  assert.deepEqual(
    sortPatchVersions(["2.0.3", "3.0.1", "3.0.10", "3.0.0", "2.0.4"]),
    ["3.0.10", "3.0.1", "3.0.0", "2.0.4", "2.0.3"],
    "sortPatchVersions should order versions newest-first using numeric segment comparison",
  );
  const versions = getPatchVersions();
  assert.equal(versions[0], "3.0.1");
  const homeHtml = readFileSync("dist/home/index.html", "utf8");
  assert.match(
    homeHtml,
    new RegExp(`WC3 ${versions[0].replace(/\./g, "\\.")}`),
    "homepage should dynamically render the latest patch version from src/patch-notes/content/docs",
  );
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

test("site uses Kanagawa Wave as the sole theme without any theme switcher", () => {
  const guideHtml = readFileSync("dist/docs/guides/getting-started/index.html", "utf8");
  assert.doesNotMatch(
    guideHtml,
    /data-palette-select|starlight-theme-select|vitesse-dark/i,
    "docs pages should not render any theme or palette selector",
  );
  assert.match(
    guideHtml,
    /<pre data-language="csharp">[\s\S]*--0:#DCD7BA/i,
    "code blocks should render Kanagawa Wave syntax token colors",
  );

  const astroAssets = readdirSync("dist/docs/_astro");
  const cssContent = astroAssets
    .filter((file) => file.endsWith(".css"))
    .map((file) => readFileSync(`dist/docs/_astro/${file}`, "utf8"))
    .join("\n");
  assert.match(cssContent, /#1f1f28/i, "built CSS should include Kanagawa Wave background #1f1f28");
  assert.match(cssContent, /#7e9cd8/i, "built CSS should include Kanagawa Wave primary #7e9cd8");
  assert.doesNotMatch(
    cssContent,
    /vitesse-dark|#4d9375/i,
    "built CSS should not include Vitesse Dark theme rules",
  );
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
