import { assertEquals, assertStringIncludes } from "@std/assert";
import { createDocsApp } from "../docs/app.tsx";
import { buildSidebars } from "../docs/sidebar.ts";
import { compileDocumentation } from "../tools/content/compile.ts";
import { pageDescription } from "../tools/content/render.ts";
import { flatSection, loadSampleSite } from "./support/site.ts";

Deno.test("a description is the first paragraph, cut at a word near 160 characters", () => {
  assertEquals(pageDescription("Short one.", "Title"), "Short one.");
  assertEquals(pageDescription(undefined, "Title"), "Title");
  assertEquals(pageDescription("   ", "Title"), "Title");
  assertEquals(pageDescription("  two\n lines ", "Title"), "two lines");
  const long = pageDescription(`${"word ".repeat(40)}end.`, "Title");
  assertEquals(long.length <= 161, true);
  assertEquals(long.endsWith("word…"), true);
});

Deno.test("a page's description comes from its first top-level paragraph, or else its title", async () => {
  const nav = [flatSection("moonwell", ["moonwell/index.md", "moonwell/b.md"])];
  const pages = await compileDocumentation(
    new Map([
      [
        "moonwell/index.md",
        '# One\n\n- A list item first.\n\nThe *first* paragraph & "more".\n\nSecond.\n',
      ],
      ["moonwell/b.md", "# Only a title\n\n```lua\nprint(1)\n```\n"],
    ]),
    nav,
    new Set(),
  );
  assertEquals(pages[0].description, 'The first paragraph & "more".');
  assertEquals(pages[1].description, "Only a title");
  const html = await (await createDocsApp(pages, buildSidebars(pages, nav))
    .handler()(new Request("https://docs.wc3.dev/moonwell/"))).text();
  assertStringIncludes(
    html,
    '<meta name="description" content="The first paragraph &amp; &quot;more&quot;."',
  );
});

Deno.test("the top bar marks the current section and no other", async () => {
  const { pages, sidebars } = await loadSampleSite();
  const handler = createDocsApp(pages, sidebars).handler();
  const html =
    await (await handler(new Request("https://docs.wc3.dev/wrappers/handles")))
      .text();
  const nav = html.match(/<nav class="desktop-nav"[^>]*>([\s\S]*?)<\/nav>/)![1];
  assertStringIncludes(nav, 'href="/wrappers/" aria-current="true"');
  assertEquals((nav.match(/aria-current/g) ?? []).length, 1);
  const menu = html.match(/<nav id="mobile-menu"[^>]*>([\s\S]*?)<\/nav>/)![1];
  assertStringIncludes(menu, 'href="/wrappers/" aria-current="true"');
  assertEquals((menu.match(/aria-current/g) ?? []).length, 1);
  const landing = await (await handler(new Request("https://docs.wc3.dev/")))
    .text();
  assertEquals(
    landing.match(/<nav class="desktop-nav"[^>]*>([\s\S]*?)<\/nav>/)![1]
      .includes("aria-current"),
    false,
  );
  assertEquals(
    landing.match(/<nav id="mobile-menu"[^>]*>([\s\S]*?)<\/nav>/)![1]
      .includes("aria-current"),
    false,
  );
});
