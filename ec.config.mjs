import { defineEcConfig } from "astro-expressive-code";

export default defineEcConfig({
  themes: ["kanagawa-wave", "vitesse-dark"],
  useStarlightDarkModeSwitch: false,
  themeCssSelector: (theme) => `[data-palette='${theme.name}']`,
  styleOverrides: {
    borderRadius: "0.75rem",
    borderColor: "var(--mw-border)",
    codeBackground: "var(--mw-surface)",
    codeFontFamily: "var(--font-mono)",
    frames: {
      editorActiveTabBackground: "var(--mw-surface)",
      editorTabBarBackground: "var(--mw-bg)",
      frameBoxShadowCssValue: "none",
    },
  },
});
