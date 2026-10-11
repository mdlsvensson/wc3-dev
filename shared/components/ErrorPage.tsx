import type { VNode } from "preact";
import { Document } from "./Document.tsx";

export function ErrorPage({ status }: { status: 404 | 500 }): VNode {
  const title = status === 404 ? "Page not found" : "Something went wrong";
  return (
    <Document title={`${title} | wc3.dev`}>
      <main id="main-content" class="error-page">
        <p class="error-code pixel-heading">{status}</p>
        <h1 class="pixel-heading">{title}</h1>
        <p>
          {status === 404
            ? "This address does not have a page."
            : "Please try again later."}
        </p>
        <a href="/">Return home</a>
      </main>
    </Document>
  );
}
