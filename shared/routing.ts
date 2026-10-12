export function homeRedirect(url: URL): Response | null {
  const match = /^\/(moonwell|wrappers|systems)(?=\/|$)/.exec(url.pathname);
  if (!match) return null;
  const path = url.pathname === `/${match[1]}`
    ? `${url.pathname}/`
    : url.pathname;
  return Response.redirect(`https://docs.wc3.dev${path}${url.search}`, 301);
}

export function findDocsPage<T extends { url: string }>(
  pathname: string,
  pages: readonly T[],
): T | undefined {
  return pages.find((page) => {
    const aliases = page.url.endsWith("/")
      ? [page.url.slice(0, -1), `${page.url}index`, `${page.url}index.html`]
      : [`${page.url}.html`, `${page.url}/`];
    return page.url === pathname || aliases.includes(pathname);
  });
}

export function docsRedirect(
  url: URL,
  pages: readonly { url: string }[],
): Response | null {
  const page = findDocsPage(url.pathname, pages);
  return page && page.url !== url.pathname
    ? Response.redirect(`https://docs.wc3.dev${page.url}${url.search}`, 301)
    : null;
}
