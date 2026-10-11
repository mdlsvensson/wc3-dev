import { assertEquals, assertStringIncludes } from "@std/assert";
import { fileURLToPath } from "node:url";

const script = new URL("../tools/cloudflare-build.sh", import.meta.url);

async function fixture() {
  const root = await Deno.makeTempDir();
  const bin = `${root}/bin`;
  await Deno.mkdir(bin);
  for (
    const [name, body] of Object.entries({
      uname: 'if [ "$1" = -s ]; then echo Linux; else echo x86_64; fi',
      curl:
        "touch curl-ran; mkdir -p .build-tools; printf wrong > .build-tools/deno.zip",
      unzip:
        'touch unzip-ran; printf "#!/bin/sh\\ntouch deno-ran\\n" > .build-tools/deno; chmod +x .build-tools/deno',
    })
  ) {
    await Deno.writeTextFile(`${bin}/${name}`, `#!/bin/sh\n${body}\n`);
    if (Deno.build.os !== "windows") await Deno.chmod(`${bin}/${name}`, 0o755);
  }
  return {
    root,
    run: (app: string) =>
      new Deno.Command("sh", {
        args: [fileURLToPath(script).replaceAll("\\", "/"), app],
        cwd: root,
        env: {
          PATH: `${bin}${Deno.build.os === "windows" ? ";" : ":"}${
            Deno.env.get("PATH")
          }`.replaceAll("\\", "/"),
        },
      }).output(),
  };
}

Deno.test("bootstrap rejects unknown app before downloading or executing tools", async () => {
  const { root, run } = await fixture();
  try {
    assertEquals((await run("wrong")).code, 2);
    for (const marker of ["curl-ran", "unzip-ran", "deno-ran"]) {
      await assertMissing(`${root}/${marker}`);
    }
  } finally {
    await Deno.remove(root, { recursive: true });
  }
});

Deno.test("bootstrap rejects wrong checksum before unzip or Deno", async () => {
  const { root, run } = await fixture();
  try {
    const output = await run("docs");
    assertEquals(output.success, false);
    assertStringIncludes(new TextDecoder().decode(output.stdout), "FAILED");
    assertEquals((await Deno.stat(`${root}/curl-ran`)).isFile, true);
    for (const marker of ["unzip-ran", "deno-ran"]) {
      await assertMissing(`${root}/${marker}`);
    }
  } finally {
    await Deno.remove(root, { recursive: true });
  }
});

async function assertMissing(path: string) {
  let exists = true;
  try {
    await Deno.stat(path);
  } catch (error) {
    if (!(error instanceof Deno.errors.NotFound)) throw error;
    exists = false;
  }
  assertEquals(exists, false, path);
}
