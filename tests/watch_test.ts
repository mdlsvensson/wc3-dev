import { assertEquals, assertRejects, assertStringIncludes } from "@std/assert";
import { EventEmitter } from "node:events";
import type { ViteDevServer } from "vite";
import {
  createPreparationQueue,
  documentationPreparation,
  enqueuePreparation,
} from "../tools/content/watch.ts";

Deno.test("preparation queue serializes failure and recovery without stale writes", async () => {
  let release!: () => void;
  const held = new Promise<void>((resolve) => release = resolve);
  const started: number[] = [];
  const written: number[] = [];
  const queue = createPreparationQueue(async () => {
    const generation = started.length + 1;
    started.push(generation);
    if (generation === 1) {
      await held;
      throw new Error("invalid first generation");
    }
    written.push(generation);
  });
  const first = queue();
  const rejected = assertRejects(
    () => first,
    Error,
    "invalid first generation",
  );
  const second = queue();
  await Promise.resolve();
  assertEquals(started, [1]);
  assertEquals(written, []);
  release();
  await rejected;
  await second;
  assertEquals(started, [1, 2]);
  assertEquals(written, [2]);
});

Deno.test("replacement preparation clients share ordering without retaining old callbacks", async () => {
  const state = { tail: Promise.resolve() };
  const started: string[] = [];
  const written: string[] = [];
  let release!: () => void;
  const held = new Promise<void>((resolve) => release = resolve);
  const oldClient = () =>
    enqueuePreparation(state, async () => {
      started.push("old");
      await held;
      throw new Error("old generation rejected");
    });
  const newClient = () =>
    enqueuePreparation(state, () => {
      started.push("new");
      written.push("new navigation");
      return Promise.resolve();
    });
  const first = oldClient();
  const rejected = assertRejects(() => first, Error, "old generation rejected");
  const second = newClient();
  await Promise.resolve();
  assertEquals(started, ["old"]);
  assertEquals(written, []);
  release();
  await rejected;
  await second;
  assertEquals(started, ["old", "new"]);
  assertEquals(written, ["new navigation"]);
});

Deno.test("config reload gate suppresses only synchronous Fresh reload and restores websocket on close", async () => {
  const watcher = new EventEmitter();
  const httpServer = new EventEmitter();
  const sent: unknown[] = [];
  const ws = {
    send(payload: unknown, data?: unknown) {
      assertEquals(this, ws);
      sent.push([payload, data]);
    },
  };
  const originalSend = ws.send;
  const server = {
    watcher,
    httpServer,
    ws,
    config: {
      configFileDependencies: ["C:/project/docs/navigation.ts"],
      logger: { info() {}, error() {} },
    },
    middlewares: { use() {} },
  } as unknown as ViteDevServer;
  const plugin = documentationPreparation();
  if (typeof plugin.configureServer !== "function") {
    throw new Error("Missing server hook");
  }
  const afterConfiguration = await plugin.configureServer.call(
    {} as never,
    server,
  );
  // Model Fresh's synchronous all-event listener, registered after our pre-hook.
  watcher.on("all", () => {
    ws.send("fresh:reload");
    ws.send({ type: "custom", event: "fresh:reload" });
    ws.send({ type: "full-reload" });
  });
  afterConfiguration?.();
  try {
    watcher.emit("all", "change", "C:\\project\\docs\\navigation.ts");
    assertEquals(sent, [[{ type: "full-reload" }, undefined]]);
    sent.length = 0;
    ws.send("fresh:reload");
    ws.send("other-event", { value: 1 });
    watcher.emit("all", "change", "C:/project/shared/styles/site.css");
    assertEquals(sent, [
      ["fresh:reload", undefined],
      ["other-event", { value: 1 }],
      ["fresh:reload", undefined],
      [{ type: "custom", event: "fresh:reload" }, undefined],
      [{ type: "full-reload" }, undefined],
    ]);
  } finally {
    httpServer.emit("close");
    await new Promise((resolve) => setTimeout(resolve, 0));
  }
  assertEquals(ws.send, originalSend);
  assertEquals(watcher.listenerCount("all"), 1);
});

Deno.test("retiring preparation drains before replacement and never reloads the old server", async () => {
  let releaseOld!: () => void;
  let oldStarted!: () => void;
  const heldOld = new Promise<void>((resolve) => releaseOld = resolve);
  const startedOld = new Promise<void>((resolve) => oldStarted = resolve);
  let releaseNew!: () => void;
  let newStarted!: () => void;
  const heldNew = new Promise<void>((resolve) => releaseNew = resolve);
  const startedNew = new Promise<void>((resolve) => newStarted = resolve);
  const written: string[] = [];
  const sent: unknown[] = [];
  const invalidated: string[] = [];
  let emit!: (event: Deno.FsEvent | null) => void;
  let watcherClosed = false;
  const contentWatcher = {
    async *[Symbol.asyncIterator]() {
      while (true) {
        const event = await new Promise<Deno.FsEvent | null>((resolve) =>
          emit = resolve
        );
        if (!event) return;
        yield event;
      }
    },
    close() {
      watcherClosed = true;
      emit(null);
    },
  };
  const watcher = new EventEmitter();
  const httpServer = new EventEmitter();
  const server = {
    watcher,
    httpServer,
    ws: {
      send(payload: unknown) {
        sent.push(payload);
      },
    },
    config: {
      configFileDependencies: ["C:/project/docs/navigation.ts"],
      logger: {
        error(error: string) {
          throw new Error(error);
        },
      },
    },
    environments: {
      ssr: {
        moduleGraph: {
          onFileChange(path: string) {
            invalidated.push(path);
          },
        },
      },
    },
    middlewares: { use() {} },
  } as unknown as ViteDevServer;
  const oldPlugin = documentationPreparation(async () => {
    oldStarted();
    await heldOld;
    written.push("old");
  }, () => contentWatcher);
  if (typeof oldPlugin.configureServer !== "function") {
    throw new Error("Missing server hook");
  }
  const afterConfiguration = await oldPlugin.configureServer.call(
    {} as never,
    server,
  );
  afterConfiguration?.();
  emit({ kind: "modify", paths: ["content.md"] });
  await startedOld;
  watcher.emit("all", "change", "C:/project/docs/navigation.ts");
  assertEquals(watcherClosed, true);
  const newPlugin = documentationPreparation(async () => {
    newStarted();
    await heldNew;
    written.push("new navigation");
  });
  if (typeof newPlugin.config !== "function") {
    throw new Error("Missing config hook");
  }
  const replacement = newPlugin.config.call({} as never, {}, {
    command: "serve",
    mode: "development",
  });
  await Promise.resolve();
  assertEquals(written, []);
  releaseOld();
  await startedNew;
  assertEquals(written, ["old"]);
  assertEquals(sent, []);
  assertEquals(invalidated, []);
  if (typeof newPlugin.closeBundle !== "function") {
    throw new Error("Missing close hook");
  }
  let drained = false;
  const closeNew = Promise.resolve(newPlugin.closeBundle.call({} as never))
    .then(() => drained = true);
  await Promise.resolve();
  assertEquals(drained, false);
  releaseNew();
  await replacement;
  await closeNew;
  assertEquals(written, ["old", "new navigation"]);
  httpServer.emit("close");
});

Deno.test("directory-only content events report failed revalidation and reload on recovery", async () => {
  let emit!: (event: Deno.FsEvent | null) => void;
  let consumed!: () => void;
  const contentWatcher = {
    async *[Symbol.asyncIterator]() {
      while (true) {
        const event = await new Promise<Deno.FsEvent | null>((resolve) =>
          emit = resolve
        );
        if (!event) return;
        yield event;
        consumed();
      }
    },
    close() {
      emit(null);
    },
  };
  let request!: (next: () => void) => void;
  const errors: string[] = [];
  const sent: unknown[] = [];
  const invalidated: string[] = [];
  let attempts = 0;
  const server = {
    watcher: new EventEmitter(),
    ws: { send: (payload: unknown) => sent.push(payload) },
    config: {
      configFileDependencies: [],
      logger: { error: (error: string) => errors.push(error) },
    },
    environments: {
      ssr: {
        moduleGraph: {
          onFileChange: (path: string) => invalidated.push(path),
        },
      },
    },
    middlewares: {
      use(
        handler: (
          _request: unknown,
          _response: unknown,
          next: () => void,
        ) => void,
      ) {
        request = (next) => handler(undefined, undefined, next);
      },
    },
  } as unknown as ViteDevServer;
  const plugin = documentationPreparation(() => {
    attempts++;
    return attempts === 1
      ? Promise.reject(
        new Error("moonwell/index.md: missing navigation source"),
      )
      : Promise.resolve();
  }, () => contentWatcher);
  if (
    typeof plugin.configureServer !== "function" ||
    typeof plugin.closeBundle !== "function"
  ) throw new Error("Missing lifecycle hooks");
  const afterConfiguration = await plugin.configureServer.call(
    {} as never,
    server,
  );
  afterConfiguration?.();
  async function event(kind: Deno.FsEvent["kind"]) {
    const processed = new Promise<void>((resolve) => consumed = resolve);
    emit({ kind, paths: ["C:/project/docs/content/moonwell"] });
    await processed;
    await new Promise<void>((resolve) => request(resolve));
  }
  try {
    await event("remove");
    assertEquals(attempts, 1);
    assertEquals(errors.length, 1);
    assertStringIncludes(errors[0], "missing navigation source");
    assertEquals(invalidated, []);
    assertEquals(sent, []);
    await event("create");
    assertEquals(attempts, 2);
    assertEquals(errors.length, 1);
    assertEquals(invalidated.map((path) => path.split("/").at(-1)), [
      "pages.ts",
      "search.json",
    ]);
    assertEquals(sent, [{ type: "full-reload" }]);
    await event("modify");
    assertEquals(attempts, 3);
    assertEquals(sent.length, 2);
  } finally {
    await plugin.closeBundle.call({} as never);
  }
});
