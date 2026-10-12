import { assertEquals, assertStringIncludes } from "@std/assert";
import { createDocsApp } from "../docs/app.tsx";
import { navigation } from "../docs/navigation.ts";
import { buildSidebars } from "../docs/sidebar.ts";
import { compileDocumentation } from "../tools/content/compile.ts";
import { readSources } from "../tools/content/prepare.ts";
import { staticAssets, titleElement } from "./support/site.ts";

// Contracts that hold for whatever pages are authored. No test names an authored page or its text.
const sources = await readSources(new URL("../docs/content/", import.meta.url));
const pages = await compileDocumentation(
  sources,
  navigation,
  await staticAssets(),
);
const handler = createDocsApp(pages, buildSidebars(pages, navigation))
  .handler();

Deno.test("every authored page is served with one h1, its title and its own place in the sidebar", async () => {
  assertEquals(pages.length, sources.size);
  for (const page of pages) {
    const response = await handler(
      new Request(`https://docs.wc3.dev${page.url}`),
    );
    assertEquals(response.status, 200, page.url);
    const html = await response.text();
    assertEquals((html.match(/<h1\b/g) ?? []).length, 1, page.url);
    assertStringIncludes(html, titleElement(page.title));
    assertStringIncludes(html, `href="${page.url}" aria-current="page"`);
    assertStringIncludes(html, 'id="main-content"');
  }
});

Deno.test("every section's overview is its first page", () => {
  for (const section of navigation) {
    const first = pages.find((page) => page.section === section.id);
    assertEquals(first?.url, `/${section.id}/`);
  }
});
