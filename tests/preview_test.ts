import { assertEquals, assertMatch, assertStringIncludes } from "@std/assert";

// Opt in with test:preview after building and starting both independent Workers.
const [docsOrigin, homeOrigin] = Deno.args;
const enabled = Boolean(docsOrigin && homeOrigin);
const sections = ["moonwell", "wrappers", "systems"];
const docsPaths = [
  "/",
  ...sections.flatMap((section) => [
    `/${section}/`,
    `/${section}/getting-started`,
  ]),
];

async function request(
  origin: string,
  path: string,
  method = "GET",
  host?: string,
) {
  return await fetch(`${origin}${path}`, {
    method,
    redirect: "manual",
    headers: host ? { host } : undefined,
  });
}

Deno.test({
  name: "built Workers serve canonical pages and empty HEAD bodies",
  ignore: !enabled,
  async fn() {
    for (
      const [origin, paths] of [[docsOrigin, docsPaths], [homeOrigin, [
        "/",
      ]]] as const
    ) {
      for (const path of paths) {
        const get = await request(origin, path);
        const head = await request(origin, path, "HEAD");
        assertEquals(get.status, 200, `${origin}${path}`);
        assertEquals(head.status, get.status);
        assertEquals(
          head.headers.get("content-type"),
          get.headers.get("content-type"),
        );
        assertStringIncludes(await get.text(), 'id="main-content"');
        assertEquals(await head.text(), "");
      }
      for (
        const path of [
          "/unknown",
          "/unknown.html",
          "/missing.woff2",
          "/moonwells",
        ]
      ) {
        for (const method of ["GET", "HEAD"]) {
          const response = await request(origin, path, method);
          assertEquals(response.status, 404, `${method} ${origin}${path}`);
          const body = await response.text();
          if (method === "HEAD") assertEquals(body, "");
          else assertStringIncludes(body, "Page not found");
        }
      }
    }
  },
});

Deno.test({
  name: "built docs aliases and both home hosts preserve redirect queries",
  ignore: !enabled,
  async fn() {
    for (const section of sections) {
      const aliases = [
        [`/${section}`, `/${section}/`],
        [`/${section}/index`, `/${section}/`],
        [`/${section}/index.html`, `/${section}/`],
        [`/${section}/getting-started.html`, `/${section}/getting-started`],
      ];
      for (const [path, target] of aliases) {
        for (const method of ["GET", "HEAD"]) {
          const response = await request(docsOrigin, `${path}?q=x%2Fy`, method);
          assertEquals(response.status, 301);
          assertEquals(
            response.headers.get("location"),
            `https://docs.wc3.dev${target}?q=x%2Fy`,
          );
          if (method === "HEAD") assertEquals(await response.text(), "");
          else await response.body?.cancel();
        }
      }
      for (const host of ["wc3.dev", "www.wc3.dev"]) {
        for (
          const path of [
            `/${section}`,
            `/${section}/`,
            `/${section}/getting-started.html`,
          ]
        ) {
          for (const method of ["GET", "HEAD"]) {
            const response = await request(
              homeOrigin,
              `${path}?q=x%2Fy`,
              method,
              host,
            );
            assertEquals(response.status, 301);
            assertEquals(
              response.headers.get("location"),
              `https://docs.wc3.dev${
                path === `/${section}` ? `${path}/` : path
              }?q=x%2Fy`,
            );
            assertEquals(await response.text(), "");
          }
        }
      }
    }
  },
});

async function assetPaths(root: URL, prefix = ""): Promise<string[]> {
  const paths: string[] = [];
  for await (const entry of Deno.readDir(root)) {
    if (entry.isDirectory) {
      paths.push(
        ...await assetPaths(
          new URL(`${entry.name}/`, root),
          `${prefix}${entry.name}/`,
        ),
      );
    } else if (entry.isFile) paths.push(`${prefix}${entry.name}`);
  }
  return paths.sort();
}

Deno.test({
  name:
    "both built Workers serve every artwork font licence and provenance byte",
  ignore: !enabled,
  async fn() {
    const root = new URL("../shared/static/", import.meta.url);
    const paths = await assetPaths(root);
    assertEquals(paths.length, 19);
    for (const origin of [docsOrigin, homeOrigin]) {
      for (const path of paths) {
        const expected = await Deno.readFile(new URL(path, root));
        const response = await request(origin, `/${path}`);
        assertEquals(response.status, 200, path);
        const type = path.endsWith(".woff2")
          ? /^font\/woff2/
          : path.endsWith(".png")
          ? /^image\/png/
          : path.endsWith(".gif")
          ? /^image\/gif/
          : /^text\/(?:plain|markdown)/;
        assertMatch(response.headers.get("content-type") ?? "", type, path);
        assertEquals(
          new Uint8Array(await response.arrayBuffer()),
          expected,
          path,
        );
        const head = await request(origin, `/${path}`, "HEAD");
        assertEquals(head.status, 200, path);
        assertMatch(head.headers.get("content-type") ?? "", type, path);
        assertEquals(await head.text(), "");
      }
    }
  },
});
