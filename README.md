# wc3.dev

The source of [wc3.dev](https://wc3.dev): the documentation of
[Moonwell](https://github.com/mdlsvensson/moonwell),
[Moonwell Wrappers](https://github.com/mdlsvensson/moonwell-wrappers) and
[Moonwell Systems](https://github.com/mdlsvensson/moonwell-systems). It is built with
[VitePress](https://vitepress.dev) and deployed on GitHub Pages.

## Commands

The deployment builds with Node 24.

```sh
npm ci            # install the pinned dependencies
npm run dev       # development server at http://localhost:5173
npm run build     # production build in docs/.vitepress/dist; fails on a dead link
npm run preview   # serve the production build
```

The pages are Markdown files under `docs/`. The navigation is in `docs/.vitepress/config.ts`.
