import { assertEquals, assertMatch } from "@std/assert";
import { createHomeApp } from "../home/app.tsx";
import { createDocsApp } from "../docs/app.tsx";

Deno.test("both apps render without filesystem content", async () => {
  for (const app of [createHomeApp(), createDocsApp([])]) {
    const response = await app.handler()(new Request("https://wc3.dev/"));
    assertEquals(response.status, 200);
    assertMatch(response.headers.get("content-type") ?? "", /text\/html/);
    assertMatch(await response.text(), /Moonwell/);
  }
});
