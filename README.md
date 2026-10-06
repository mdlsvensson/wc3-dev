# wc3.dev

The source of two sites, both built with [VitePress](https://vitepress.dev):

- [wc3.dev](https://wc3.dev), the home page, in `home/`.
- [docs.wc3.dev](https://docs.wc3.dev), the documentation of
  [Moonwell](https://github.com/mdlsvensson/moonwell),
  [Moonwell Wrappers](https://github.com/mdlsvensson/moonwell-wrappers) and
  [Moonwell Systems](https://github.com/mdlsvensson/moonwell-systems), in `docs/`.

The home page uses the theme, the fonts and the images of the docs (`docs/.vitepress/theme/` and `docs/public/`), so
the two look the same.

Each site is a Cloudflare Worker that serves its build as static files: `wrangler.jsonc` is the home page and
`wrangler.docs.jsonc` is the docs. Cloudflare builds and deploys both on every push to `main`.

## Commands

Needs Node 20.19 or newer.

```sh
npm ci              # install the pinned dependencies
npm run dev         # the docs, at http://localhost:5173
npm run dev:home    # the home page, at http://localhost:5174
npm run build       # both production builds; fails on a dead link
```

The pages are Markdown files. The navigation of each site is in its `.vitepress/config.ts`.
