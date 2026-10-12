import { createDocsApp } from "./app.tsx";
import { pages } from "./generated/pages.ts";
import { navigation } from "./navigation.ts";
import { buildSidebars } from "./sidebar.ts";

export const app = createDocsApp(pages, buildSidebars(pages, navigation));
export default app;
