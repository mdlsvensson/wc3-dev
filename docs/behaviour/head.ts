import { codeLanguages } from "../../shared/code-languages.ts";
import { storageKey } from "./languages.ts";

/**
 * Runs in the document's head, before the first paint: marks the page as scripted and copies the stored language
 * list to the root element, where the rules below read it. The value is set as an attribute, never as markup.
 */
export const languageScript =
  `(function(){var d=document.documentElement;d.classList.add("js");try{var v=localStorage.getItem(${
    JSON.stringify(storageKey)
  });if(v&&/^[a-z0-9 ]+$/.test(v))d.setAttribute("data-code-languages",v)}catch(e){}})()`;

/**
 * Which block of a group shows between the first paint and the moment the page script takes over (it marks each
 * group with data-ready). One rule pair per language: hide the group's blocks, show the chosen one.
 */
export function languageCss(): string {
  const group = ".code-group:not([data-ready])";
  return codeLanguages.map(({ name }) => {
    const root = `html.js[data-code-languages~="${name}"]`;
    const block = `.code-block[data-lang="${name}"]`;
    return `${root} ${group}:has(> ${block}) > .code-block{display:none}` +
      `${root} ${group} > ${block}{display:block !important}`;
  }).join("");
}
