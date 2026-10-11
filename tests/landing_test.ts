import { assertEquals, assertMatch, assertStringIncludes } from "@std/assert";
import { createHomeApp } from "../home/app.tsx";
import { createDocsApp } from "../docs/app.tsx";

Deno.test("landing links retain their domain-specific targets", async () => {
  for (
    const [app, origin] of [[createHomeApp(), "https://docs.wc3.dev"], [
      createDocsApp([]),
      "",
    ]] as const
  ) {
    const response = await app.handler()(new Request("https://wc3.dev/"));
    assertEquals(response.status, 200);
    const html = await response.text();
    for (const path of ["/moonwell/", "/wrappers/", "/systems/"]) {
      assertStringIncludes(html, `href="${origin}${path}"`);
    }
  }
});

Deno.test("both landings preserve copy, accessible structure and metadata", async () => {
  for (const app of [createHomeApp(), createDocsApp([])]) {
    const html = await (await app.handler()(new Request("https://wc3.dev/")))
      .text();
    for (
      const text of [
        "Multilingual modding framework for Warcraft III: Reforged",
        "Moonwell framework docs.",
        "Lua wrappers for Warcraft III natives.",
        "Full gameplay systems suite including damage engine, physics, save/load, and more.",
        'alt="A moonwell"',
        'src="/mw.gif',
        'alt="Moonwell"',
        'href="/mw-moonwell.png"',
        'href="https://github.com/mdlsvensson/moonwell"',
        'href="#main-content"',
        'lang="en-US"',
      ]
    ) assertStringIncludes(html, text);
    assertEquals((html.match(/<h1\b/g) ?? []).length, 1);
    assertEquals((html.match(/<h2\b/g) ?? []).length, 3);
    assertMatch(html, /<title>[^<]+<\/title>/);
    assertMatch(html, /<meta name="description" content="Moonwell[^\"]+"/);
  }
});

Deno.test("home landing has no documentation search trigger", async () => {
  const html =
    await (await createHomeApp().handler()(new Request("https://wc3.dev/")))
      .text();
  assertEquals(/<button[^>]*[^a-z]search/i.test(html), false);
});

Deno.test("documentation landing retains its documentation description", async () => {
  const html = await (await createDocsApp([]).handler()(
    new Request("https://docs.wc3.dev/"),
  )).text();
  assertStringIncludes(
    html,
    'content="Moonwell docs, a multilingual modding framework for Warcraft III: Reforged."',
  );
});
