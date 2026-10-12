import type { HotPayload, Plugin } from "vite";
import { fileURLToPath } from "node:url";
import { prepareDocumentation } from "./prepare.ts";

interface PreparationState {
  tail: Promise<void>;
}

export function enqueuePreparation(
  state: PreparationState,
  prepare: () => Promise<void>,
): Promise<void> {
  const next = state.tail.then(prepare);
  state.tail = next.catch(() => {});
  return next;
}

export function createPreparationQueue(
  prepare: () => Promise<void>,
): () => Promise<void> {
  const state = { tail: Promise.resolve() };
  return () => enqueuePreparation(state, prepare);
}

const queueRegistry = Symbol.for("wc3.dev.documentationPreparation");
const processQueues = globalThis as typeof globalThis & {
  [queueRegistry]?: Map<string, PreparationState>;
};

type ContentWatcher = AsyncIterable<Deno.FsEvent> & { close(): void };

/** Own generated-file publication instead of allowing Vite to observe partial writes. */
export function documentationPreparation(
  prepareContent: () => Promise<void> = prepareDocumentation,
  watchContent: (path: string) => ContentWatcher = (path) =>
    Deno.watchFs(path, { recursive: true }),
  content: string = fileURLToPath(
    new URL("../../docs/content/", import.meta.url),
  ),
): Plugin {
  const generated = fileURLToPath(
    new URL("../../docs/generated/", import.meta.url),
  );
  // Vite constructs the replacement config before closing the old server. Share
  // only the tail across those instances, never the old navigation/prepare callback.
  const canonicalRoot = Deno.realPathSync(
    fileURLToPath(new URL("../../", import.meta.url)),
  );
  const registry = processQueues[queueRegistry] ??= new Map();
  const state = registry.get(canonicalRoot) ?? { tail: Promise.resolve() };
  registry.set(canonicalRoot, state);
  const prepare = () => enqueuePreparation(state, prepareContent);
  let pending = Promise.resolve();
  let watcher: ContentWatcher | undefined;
  let closed = false;
  let retiring = false;
  let stop = () => {};
  return {
    name: "documentation-preparation",
    enforce: "pre",
    async config() {
      const initial = prepare();
      pending = initial.catch(() => {});
      await initial;
      return {
        server: {
          // A separate watcher handles authored Markdown. Generated pairs must never
          // trigger Vite's automatic invalidation or reload between their writes.
          watch: {
            ignored: [content, generated].map((path) =>
              `${path.replaceAll("\\", "/").replace(/\/$/, "")}/**`
            ),
          },
        },
      };
    },
    configureServer(server) {
      const viteWatcher = server.watcher;
      const ws = server.ws;
      const originalSend = ws.send;
      const send = originalSend.bind(ws);
      const normalize = (path: string) => path.replaceAll("\\", "/");
      const configPaths = new Set(
        server.config.configFileDependencies.map(normalize),
      );
      if (server.config.configFile) {
        configPaths.add(normalize(server.config.configFile));
      }
      let configEvent = false;
      const beginEvent = (_event: string, path: string) => {
        configEvent = configPaths.has(normalize(path));
        if (configEvent) {
          retiring = true;
          watcher?.close();
          watcher = undefined;
        }
      };
      const endEvent = () => configEvent = false;
      const gatedSend: typeof ws.send = (
        payload: HotPayload | string,
        data?: unknown,
      ) => {
        const freshReload = payload === "fresh:reload" ||
          (typeof payload === "object" && payload.type === "custom" &&
            payload.event === "fresh:reload");
        if (configEvent && freshReload) return;
        if (typeof payload === "string") send(payload, data);
        else send(payload);
      };
      // Fresh 1.1.2 synchronously emits fresh:reload in its watcher "all" callback,
      // even for config dependencies. Let Vite restart/reconnect before reloading
      // those pages. Suppression lasts only through that synchronous event dispatch.
      viteWatcher.prependListener("all", beginEvent);
      ws.send = gatedSend;
      server.middlewares.use((_request, _response, next) => {
        // On failure keep serving the previous valid generation, without poisoning
        // subsequent requests or the preparation queue.
        void (async () => {
          let generation: Promise<void>;
          do {
            generation = pending;
            await generation;
          } while (generation !== pending);
          next();
        })();
      });
      watcher = watchContent(content);
      stop = () => {
        closed = true;
        viteWatcher.off("all", beginEvent);
        viteWatcher.off("all", endEvent);
        if (ws.send === gatedSend) ws.send = originalSend;
        watcher?.close();
        watcher = undefined;
      };
      server.httpServer?.once("close", stop);
      void (async () => {
        try {
          for await (const event of watcher!) {
            if (
              retiring ||
              !["create", "modify", "remove"].includes(event.kind)
            ) continue;
            // Recursive directory moves/removals can report only the directory path
            // on Windows. Revalidate all relevant events in this dedicated tree.
            pending = prepare().then(() => {
              if (closed || retiring) return;
              for (const environment of Object.values(server.environments)) {
                // Invalidate the generated records and their importers, preserving
                // Fresh's class identities and unrelated dependency modules.
                for (const name of ["pages.ts", "search.json"]) {
                  environment.moduleGraph.onFileChange(
                    `${
                      generated.replaceAll("\\", "/").replace(/\/$/, "")
                    }/${name}`,
                  );
                }
              }
              server.ws.send({ type: "full-reload" });
            }).catch((error: unknown) => {
              server.config.logger.error(
                `Documentation preparation failed: ${error}`,
              );
            });
          }
        } catch (error) {
          if (!closed && !retiring) {
            server.config.logger.error(`Content watcher failed: ${error}`);
          }
        }
      })();
      // Vite runs post-configure hooks after Fresh registers its watcher callback.
      return () => {
        if (!closed) viteWatcher.on("all", endEvent);
      };
    },
    async closeBundle() {
      stop();
      await pending;
    },
  };
}
