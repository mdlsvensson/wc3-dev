export interface CodeLanguage {
  /** The name a fence is stored and drawn under. */
  name: string;
  /** Other names a fence may use for it. */
  aliases: readonly string[];
  /** What a reader sees on the block and on its tab. */
  label: string;
}

// A language is added by a row here and its grammar in tools/content/render.ts.
export const codeLanguages: readonly CodeLanguage[] = [
  { name: "yue", aliases: ["yuescript"], label: "YueScript" },
  { name: "lua", aliases: [], label: "Lua" },
  { name: "pkl", aliases: [], label: "Pkl" },
  { name: "toml", aliases: [], label: "TOML" },
  { name: "json", aliases: [], label: "JSON" },
  { name: "sh", aliases: ["bash", "shell"], label: "Shell" },
  { name: "powershell", aliases: ["ps1"], label: "PowerShell" },
  { name: "text", aliases: [], label: "Text" },
];

export function codeLanguage(name: string): CodeLanguage | undefined {
  return codeLanguages.find((language) =>
    language.name === name || language.aliases.includes(name)
  );
}
