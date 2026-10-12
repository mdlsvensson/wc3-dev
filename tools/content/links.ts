import type { CompiledPage } from "../../shared/types.ts";
import { findDocsPage } from "../../shared/routing.ts";

const docsOrigin = "https://docs.wc3.dev";
const homeOrigins = new Set(["https://wc3.dev", "https://www.wc3.dev"]);
const sections = new Set(["moonwell", "wrappers", "systems"]);

export function sourceUrl(source: string): string {
  if (
    !source.endsWith(".md") || source.startsWith("/") ||
    source.includes("\\") ||
    source.split("/").some((part) => !part || part === "." || part === "..")
  ) {
    throw new Error(`${source}: invalid Markdown source path ${source}`);
  }
  return source === "index.md"
    ? "/"
    : source.endsWith("/index.md")
    ? `/${source.slice(0, -8)}`
    : `/${source.slice(0, -3)}`;
}

export function resolveContentLink(
  source: string,
  target: string,
  pages: readonly CompiledPage[],
  assets: ReadonlySet<string>,
): string {
  const fail = (reason: string): never => {
    throw new Error(`${source}: ${reason}: ${target}`);
  };
  const scheme = target.match(/^([a-z][a-z\d+.-]*):/i)?.[1]?.toLowerCase();
  if (scheme && !["https", "http", "mailto", "tel"].includes(scheme)) {
    fail("unsafe link");
  }
  if (scheme === "mailto" || scheme === "tel") return target;
  let absolute: URL | undefined;
  if (scheme || target.startsWith("//")) {
    try {
      absolute = new URL(target, docsOrigin);
    } catch {
      return fail("invalid URL");
    }
    if (absolute.origin !== docsOrigin && !homeOrigins.has(absolute.origin)) {
      return target;
    }
  }
  const homeTarget = absolute && homeOrigins.has(absolute.origin) &&
    !sections.has(absolute.pathname.split("/")[1]);
  const hashAt = target.indexOf("#");
  const beforeHash = hashAt < 0 ? target : target.slice(0, hashAt);
  const fragment = hashAt < 0 ? "" : target.slice(hashAt);
  const queryAt = beforeHash.indexOf("?");
  const path = queryAt < 0 ? beforeHash : beforeHash.slice(0, queryAt);
  const query = queryAt < 0 ? "" : beforeHash.slice(queryAt);
  let pathname: string;
  try {
    const base = source === "landing" ? "/" : sourceUrl(source);
    pathname = decodeURI(
      absolute?.pathname ??
        new URL(path || base, `${docsOrigin}/${source}`).pathname,
    );
  } catch {
    return fail("invalid path encoding");
  }
  const pageSource = pathname.endsWith(".md") ? pathname.slice(1) : undefined;
  let page = homeTarget
    ? undefined
    : pageSource
    ? pages.find((p) => p.source === pageSource)
    : findDocsPage(pathname, pages);
  if (
    !page && !pageSource && !absolute && path && !path.startsWith("/") &&
    !assets.has(pathname)
  ) {
    const siteRoute = new URL(path, `${docsOrigin}/`).pathname;
    page = findDocsPage(siteRoute, pages);
  }
  const resolvedQuery = absolute?.search ?? query;
  const resolvedFragment = absolute?.hash ?? fragment;
  if (!page && !assets.has(pathname) && pathname !== "/") {
    fail("missing page or asset");
  }
  if (resolvedFragment && (page || pathname === "/")) {
    let id: string;
    try {
      id = decodeURIComponent(resolvedFragment.slice(1));
    } catch {
      return fail("invalid fragment encoding");
    }
    if (page && !page.headings.some((heading) => heading.id === id)) {
      fail("missing heading fragment");
    } else if (!page && id !== "main-content") {
      fail("missing landing heading fragment");
    }
  }
  // Fragment-only links keep their concise authored form; other links become canonical paths.
  return !absolute && !path
    ? `${resolvedQuery}${resolvedFragment}`
    : `${homeTarget ? absolute?.origin : ""}${
      page?.url ?? pathname
    }${resolvedQuery}${resolvedFragment}`;
}
