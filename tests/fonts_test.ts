import { assertEquals } from "@std/assert";

const shared = new URL("../shared/", import.meta.url);
const fontsCss = await Deno.readTextFile(new URL("styles/fonts.css", shared));
const siteCss = await Deno.readTextFile(new URL("styles/site.css", shared));

/** The faces a stylesheet declares: family, style, weight and the file each names. */
function faces(css: string) {
  return [...css.matchAll(/@font-face\s*\{([^}]*)\}/g)].map(([, body]) => ({
    family: /font-family:\s*'([^']+)'/.exec(body)?.[1] ?? "",
    style: /font-style:\s*(\w+)/.exec(body)?.[1] ?? "",
    weight: /font-weight:\s*(\d+)/.exec(body)?.[1] ?? "",
    file: /url\('\/fonts\/([^']+)'\)/.exec(body)?.[1] ?? "",
  }));
}

Deno.test("every font file the stylesheet names is there, and every font file there is named", async () => {
  const named = faces(fontsCss).map((face) => face.file).sort();
  const there: string[] = [];
  for await (const entry of Deno.readDir(new URL("static/fonts/", shared))) {
    if (entry.name.endsWith(".woff2")) there.push(entry.name);
  }
  assertEquals(named, there.sort());
});

Deno.test("the code font is JetBrains Mono, declared upright, italic and bold", () => {
  const family = /--font-mono:\s*"([^"]+)"/.exec(siteCss)?.[1];
  assertEquals(family, "JetBrains Mono");
  const cuts = faces(fontsCss).filter((face) => face.family === family)
    .map((face) => `${face.style} ${face.weight}`).sort();
  assertEquals(cuts, ["italic 400", "normal 400", "normal 700"]);
});

Deno.test("code is drawn without ligatures, so that a reader sees the characters to type", () => {
  const rule = /pre,\s*code\s*\{([^}]*)\}/.exec(siteCss)?.[1] ?? "";
  assertEquals(/font-family:\s*var\(--font-mono\)/.test(rule), true);
  assertEquals(/font-variant-ligatures:\s*none/.test(rule), true);
});
