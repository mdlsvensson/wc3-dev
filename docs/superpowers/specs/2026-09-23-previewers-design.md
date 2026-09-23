# Previewers design

Date: 2026-09-23
Status: Approved design, awaiting spec review
Sub-project: 3 of 5 in the wc3.dev platform roadmap (see `2026-09-22-app-shell-design.md`; builds on `2026-09-22-resource-system-design.md`)

## Goal

Every hosted resource's detail page shows a live, interactive preview in its
reserved `#resource-preview` area: a 3D viewer for models, a zoomable image
viewer for icons and textures, a player for audio, and highlighted source for
scripts. Pages keep working, and keep showing the static preview image, when
JavaScript or WebGL is unavailable.

## Decisions

- **Fresh previewer per page, loaded on demand.** Each detail page imports only
  the previewer its type needs, when its preview area exists. Model pages
  create one WebGL viewer and dispose of it on navigation. No persisted canvas,
  no iframe.
- **Game textures are hosted (owner's choice).** Textures a model takes from
  the base game (team colour and glow, replaceable textures, standard game
  textures) are served from the asset store so models render as they do in
  game. Only textures actually needed are hosted: those referenced by catalog
  models plus the always-needed team colour and glow set. This redistributes
  Blizzard files; the owner accepts that, and removal requests are honoured as
  with any hosted resource (see `docs/hive-integration.md`).
- **Scripts show full source.** Reading the code is the preview. File names
  are shown in the script file switcher (an amendment to the resource-system
  rule that no file names appear in the UI; that rule still holds for every
  other type).

## Non-goals

- Map (`.w3x`) previews, M3 (StarCraft II) models, and event objects (footprint
  splats and animation sounds): the viewer does not load the game's SLK tables,
  so event objects are skipped.
- Model comparison, editing, screenshots/export, or any download path.
- Persisting a viewer across navigations.

## Shared structure

`#resource-preview` already carries `data-type` and `data-files` (JSON array of
`{ role, format, url }`). Model pages add `data-game-textures` (see Game
textures); the viewer reads the model version from the file itself. A static fallback stays in the HTML
(the preview image or type icon). A previewer replaces it only after it has
loaded successfully; on failure the fallback stays and a short inline message
explains why.

A single client entry, `src/scripts/previewers/index.ts`, runs on
`astro:page-load`: if `#resource-preview` exists, it dynamically imports the
previewer module for `data-type` and calls `mount(element, files)`, which
returns a `dispose()` function. On `astro:before-swap` it calls `dispose()`.
Types map to modules:

| `data-type` | Module | Loaded code |
| --- | --- | --- |
| `model` | `previewers/model.ts` | mdx-m3-viewer (viewer core + MDX, BLP, DDS, TGA handlers only) |
| `icon`, `texture` | `previewers/image.ts` | mdx-m3-viewer BLP, DDS and TGA parsers |
| `audio` | `previewers/audio.ts` | none (Web Audio + `<audio>`) |
| `script` | `previewers/script.ts` | Shiki core with the JavaScript regex engine, `lua`, `typescript`, and the site's JASS grammar |

Only the handler modules are imported, never `viewer/handlers/index`, which
pulls in the map viewer and its Lua runtime.

## Model viewer

- **Canvas** fills the preview area (16:9, full width), with device-pixel-ratio
  sizing and a `ResizeObserver`.
- **Camera**: orbit on drag, zoom on wheel/pinch, pan on right-drag or
  two-finger drag; initial framing from the model's bounds; "Reset view".
- **Animation**: a list of the model's sequences (names from the file), the
  first "Stand" sequence selected by default (otherwise the first); play/pause;
  speed 0.25×, 0.5×, 1×, 2×.
- **Player colour**: a picker for team colours (Red first), applied with
  `setTeamColor`: 0–15 for SD models, 0–27 for HD models. The viewer loads the
  team-colour set once, when it is created, so the previewer decides SD or HD
  before creating it.
- **Fullscreen** via the Fullscreen API on the preview element.
- **Badges**: "SD" or "HD" using the viewer's own rule: a model is HD when its
  version is above 800 and any material names a shader.
- **Missing textures**: textures that could not be resolved render with a
  neutral checker texture and are listed under the viewer ("2 textures not
  available").
- **Controls** are real buttons/selects with labels; the canvas has
  `role="img"` and an `aria-label` naming the model; keyboard: arrow keys
  orbit, `+`/`-` zoom, `0` resets, space toggles play when the preview has
  focus.
- **Lifecycle**: one `ModelViewer` per page; the render loop runs on
  `requestAnimationFrame` only while the canvas is on screen
  (`IntersectionObserver`) and the tab is visible; `dispose()` stops the loop,
  clears the viewer, and releases the WebGL context
  (`WEBGL_lose_context`).
- **Fallbacks**: no WebGL, a parse failure, or a missing model file keeps the
  static fallback and shows "3D preview unavailable: <reason>".
- **Load sequence** (verified in a browser probe): fetch the model file, parse
  it with the library's MDX/MDL parser, decide SD/HD, remove its event objects,
  then create the `ModelViewer`, add the MDX handler with the path solver and
  the HD flag, add the BLP/DDS/TGA handlers, register an `error` listener
  (without one the viewer's event emitter throws on the first failed fetch),
  and load the already-parsed model. The viewer's `EventEmitter` import needs
  the `events` browser package as a dependency.

### Texture resolution

The viewer's path solver resolves each requested path in order:

1. **The resource's own files**: a case-insensitive match of the requested
   path's base name against the base names of the resource's files (from the
   `url` in `data-files`).
2. **Hosted game textures**: the normalised path (lowercase, `/` separators)
   looked up in the game-texture manifest — the `hd:` entry first when the
   viewer asks for HD textures (its `hd` solver parameter), then `sd:`; SD
   requests use `sd:` only.
3. **Missing**: a generated 2×2 checker canvas (the viewer accepts canvases as
   textures, so nothing is fetched), and the path is recorded for the "not
   available" list.

Non-string sources (the parsed model itself) pass through unchanged.

Event objects are removed from the parsed model before loading, so the viewer
never requests the game's SLK tables.

## Image viewer (icons and textures)

- Fetches the original BLP/DDS/TGA file and decodes it in the browser at full
  size onto a canvas.
- **Zoom**: Fit, 1×, 2×, 4×, 8×; zoom ≥ 2× uses pixelated rendering; the view
  scrolls when larger than the area.
- **Background**: transparency checkerboard (default) or solid dark.
- **Channels**: RGBA (default) or alpha only (greyscale).
- **Mipmap**: level selector when the file has mipmaps.
- **Info line**: format, dimensions and mipmap count (e.g. "BLP1, 256×256,
  9 mipmaps"). Icon variants stay in the Details table.
- Decoding failure keeps the static preview PNG and says so.

## Audio player

- `<audio>` element with custom controls: play/pause, seek, current time /
  duration, volume.
- **Waveform**: the file is decoded with `AudioContext.decodeAudioData`,
  downsampled to one min/max pair per horizontal pixel, and drawn on a canvas;
  clicking or dragging on it seeks; a playhead follows playback.
- Space toggles play when the player has focus. Playback stops on navigation.
- If decoding fails, the player still plays via `<audio>` without a waveform.

## Script viewer

- Fetches each script file's text (UTF-8), highlights it with Shiki
  (`github-dark`, matching the docs' code blocks) and shows line numbers.
- Multiple files: a tab list of file names; the first file is shown first.
- Highlighting happens in the browser from the raw text; no HTML is fetched
  from the store.
- Long files render fully in a scrollable panel with a maximum height.

## Game textures

### Store layout and manifest

- Keys: `game/<sd|hd>/<first 12 hex of sha256>/<normalised path>`, immutable
  cache headers like resource files.
- Manifest: `src/data/game-textures.json`, an object mapping
  `"<sd|hd>:<normalised path>"` to its store key, committed to git. Each model
  page embeds only the entries its model can use (its own game paths plus the
  team colour sets), already turned into URLs, in a `data-game-textures`
  attribute on `#resource-preview`; the manifest itself never ships to the
  browser.

### `deno task game:sync --sd <dir> [--hd <dir>] [--dry-run] [--local]`

`<dir>` is a folder of files extracted from the game with an existing tool
(e.g. CascView): the SD root is `war3.w3mod`, the HD root `war3.w3mod/_hd.w3mod`.
The command:

1. Builds the **needed set**: every texture path in every model resource's
   `textures` list and `replaceables` list (see below), plus team colour and
   team glow — `00`–`15` as `.blp` in SD and `00`–`27` as `.dds` in HD,
   matching what the viewer requests.
2. For each needed path, finds the file in the SD and HD roots
   (case-insensitive) and reports paths found in neither.
3. Uploads new or changed files (same store abstraction and credentials as
   `resource:add`), and writes the manifest, keeping entries for paths still
   needed and dropping ones no model uses any more (their store objects are
   left in place and listed in the output).
4. `--dry-run` prints the plan; `--local` uses `.asset-store/`.

### Model metadata changes

- `readModelMeta` also returns `replaceables`: the game paths of textures the
  model uses through replaceable IDs (e.g. `ReplaceableTextures\Cliff\Cliff0`),
  using the viewer's own replaceable-ID table, without extension (resolved to
  `.blp`/`.dds` per set).
- The model resource schema gains `replaceables: string[]` (default `[]`),
  written by `resource:add`.
- `resource:add` warns for each game texture a new model needs that is not in
  the manifest: "Run deno task game:sync to host N game textures".
- `resource:check` reports model texture paths that are neither a resource
  file nor in the manifest, as warnings (not errors).

## Error handling

- Every previewer catches its own failures, keeps the static fallback, and
  shows a one-line reason. Nothing throws out of `mount()`.
- Any failure, including network errors fetching store files, shows
  "<Previewer> unavailable: <reason>" (e.g. "3D preview unavailable: the file
  returned HTTP 404") with a Retry button.
- While a model loads, the preview shows "Loading 3D preview…"; the viewer does
  not report a file total up front, so there is no loaded/total count.

## Testing

- **Unit** (`deno test`): path normalisation and the texture resolver order;
  manifest lookups; `game:sync` planning (needed set, found/missing, keep/drop)
  against a temp folder; replaceable-path extraction via the test-data MDX
  builder; zoom/fit maths; waveform downsampling; team-colour list; previewer
  module selection by type.
- **Build**: detail pages still render the static fallback; each type's page
  references only its own previewer chunk (no WebGL chunk on non-model pages);
  the manifest parses.
- **Browser** (browser pane, fixture build with a local store): a small test
  model with real geometry, a custom texture and a team-colour texture renders,
  switches animation and player colour, lists a deliberately missing texture,
  and survives navigating between two model pages repeatedly without leaking
  WebGL contexts; the image, audio and script previewers work on their
  fixtures; WebGL-disabled fallback verified.

## Risks

- **Bundling mdx-m3-viewer for the browser** — resolved by a probe during
  planning: importing only the viewer core and the MDX/BLP/DDS/TGA handlers
  bundles to about 292 KB once the `events` package is installed, and renders
  a textured test model correctly.
- **Reforged HD fidelity.** The library's HD shaders may not match the game
  exactly; acceptable for a preview.
- **Event objects** would request SLK tables during load; the previewer
  removes them from the parsed model first, so no tables are requested.
- **Game-texture redistribution** is a deliberate owner decision (see
  Decisions).
