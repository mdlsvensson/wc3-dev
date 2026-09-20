# wc3.dev

An independent Warcraft III developer portal, built with Deno, Astro, Starlight,
Astro Content Collections with Zod, lucide-astro, and Shiki.

## Local development

Install Deno 2.9 or newer (2.x), then run from this directory:

```sh
deno install --frozen
deno task dev
```

Open the local URL printed by Astro (normally http://127.0.0.1:4321).
No standalone Node.js installation or npm commands are required. Dependencies are
declared in `package.json` and locked in `deno.lock`; do not add npm lockfiles.
The package name `lucide-astro` is retained as requested; its publisher now marks
it deprecated in favor of `@lucide/astro`.

Astro 7 can run its development server in the background. Stop it with
`deno run -A npm:astro dev stop` before building or checking in the same checkout,
since these commands share generated content caches. Restart `deno task dev`
when finished.

## Validate and build

```sh
deno task check
deno task build
deno task test
deno task preview
```

The tests require a fresh build. They check required routes, all generated local
links and anchors, asset references, the search bundle, and syntax tokenization.
`dist/` is a static website, suitable for any static host. Serve the generated
`404.html` for missing pages. Production hosting and DNS are not configured.
`astro.config.ts` sets the canonical origin to `https://wc3.dev`.

## Structure

| Path | Purpose |
| --- | --- |
| `src/pages/index.astro` | Community and modding resource portal |
| `src/pages/framework/index.astro` | Framework landing page at `/framework/` |
| `src/content/docs/framework/docs/` | Starlight docs at `/framework/docs/` |
| `src/content/resources/*.json` | Resource cards, validated with Zod |
| `src/content.config.ts` | Content collection loaders and schemas |
| `src/syntax/jass.ts` | Project-owned JASS / basic vJASS TextMate grammar |
| `src/styles/` | Portal and Starlight themes |

Add a resource by adding JSON with `title`, `description`, `url`, `category`
(`Community`, `Tooling`, or `Scripting`), `label`, and numeric `order`.
Add documentation as Markdown with `title` and `description` frontmatter, then
add its slug to the sidebar in `astro.config.ts`.

TypeScript and Lua use Shiki's built-in grammars. JASS is registered in both
Astro's Markdown renderer and Starlight's Expressive Code renderer. Use fenced
code blocks labeled `typescript`, `lua`, or `jass`. JASS highlighting is lexical;
it is not a compiler or validator.

## Documentation migration

All eight Markdown pages from `w3ts-framework/docs` are now hosted here. The former
`docs/README.md` becomes `/framework/docs/`. Internal links use the website routes;
contributing and changelog links point to the framework source repository.
The framework's MIT license is retained in `LICENSE` for the migrated material.

This repository is independent and does not read from the framework at build time.
The original framework repository is untouched to respect the requested folder
boundary. Once this site is published, its documentation links can be redirected
to wc3.dev and the original copies retired in a separate framework change.

Warcraft III is a Blizzard Entertainment game. This is an independent community
project and is not affiliated with Blizzard Entertainment.
