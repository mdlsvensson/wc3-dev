import { createDocsApp } from "./app.tsx";
import { pages } from "./generated/pages.ts";

export const app = createDocsApp(pages);
export default app;
