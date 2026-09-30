// Production web build (dev-machine only; the Pi never runs Node).
//   npm run build   ->  src/web/dist/{index.html, app.js, styles/, fonts/}
// __DEV__ is false, so the ?mission= shortcut is compiled out. __BUILD__ is
// defined only when ENIAC_BUILD is set (to the bridge's hello.build string);
// otherwise the page does not compare builds, which avoids reload loops.
// The mock bridge (tests/web/mock) is never imported by app/ and so can't be
// in the bundle; tests/web/bundle.test.ts also greps for fixture markers.
//
// Note for the release pipeline (#25): `make web` should ship styles/ and
// fonts/ alongside app.js and index.html (panels are compiled into app.js).

import { cp, mkdir, rm, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import * as esbuild from "esbuild";

const web = join(dirname(fileURLToPath(import.meta.url)), "..");
const out = process.env.OUT_DIR || join(web, "dist");

export async function build(outDir = out) {
  await rm(outDir, { recursive: true, force: true });
  await mkdir(outDir, { recursive: true });
  const define = { __DEV__: "false" };
  if (process.env.ENIAC_BUILD) define.__BUILD__ = JSON.stringify(process.env.ENIAC_BUILD);
  const r = await esbuild.build({
    entryPoints: [join(web, "app", "main.ts")],
    bundle: true,
    format: "esm",
    target: "es2022",
    minify: true,
    legalComments: "none",
    define,
    outfile: join(outDir, "app.js"),
    metafile: true,
    logLevel: "warning",
  });
  await cp(join(web, "index.html"), join(outDir, "index.html"));
  await cp(join(web, "styles"), join(outDir, "styles"), { recursive: true });
  await cp(join(web, "fonts"), join(outDir, "fonts"), { recursive: true });
  await writeFile(join(outDir, "inputs.json"), JSON.stringify(Object.keys(r.metafile.inputs), null, 1));
  return outDir;
}

const isMain = process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];
if (isMain) {
  const d = await build();
  console.log(`built ${d}`);
}
