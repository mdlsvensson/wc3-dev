import "../shared/styles/site.css";
import "./search/search.css";
import { enhancePage } from "./behaviour/page.ts";

if (typeof document !== "undefined") {
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", enhancePage);
  } else enhancePage();
}
