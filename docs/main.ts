import { createDocsApp } from "./app.tsx";
import { pages, sidebars } from "./generated/pages.ts";

export const app = createDocsApp(pages, sidebars);
export default app;
