import type { ComponentChildren, VNode } from "preact";

export function Document(
  {
    title,
    children,
    head,
    description =
      "Moonwell, a multilingual modding framework for Warcraft III: Reforged.",
  }: {
    title: string;
    children: ComponentChildren;
    head?: ComponentChildren;
    description?: string;
  },
): VNode {
  return (
    <html lang="en-US">
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>{title}</title>
        <meta
          name="description"
          content={description}
        />
        <link rel="icon" type="image/png" href="/mw-moonwell.png" />
        {head}
      </head>
      <body>{children}</body>
    </html>
  );
}
