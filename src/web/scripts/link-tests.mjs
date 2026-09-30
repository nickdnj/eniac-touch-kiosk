// Dev-only: let tests/web (mock server, Playwright specs) resolve packages
// from src/web/node_modules. Creates tests/web/node_modules as a symlink;
// node_modules/ is gitignored.
import { existsSync, lstatSync, symlinkSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const nm = join(here, "..", "node_modules");
const link = join(here, "..", "..", "..", "tests", "web", "node_modules");
let present = false;
try {
  lstatSync(link);
  present = true;
} catch {}
if (!present && existsSync(nm)) {
  symlinkSync(relative(dirname(link), nm), link, "dir");
  console.log("linked tests/web/node_modules -> src/web/node_modules");
}
