// The offline QR encoder (src/web/app/ui/qr.ts) against libqrencode.
// tests/fixtures/qr/qrencode.json holds matrices made once with
// `qrencode -8 -m 0 -t ASCII -l <ecc>`. libqrencode scores the eight masks
// slightly differently from the standard, so for each fixture we encode with
// the mask its format bits name and require every module to match: that
// checks the data layout, Reed-Solomon codes, block interleave, format and
// version bits independently of the mask choice.

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { MAX_VERSION, dataCodewords, encodeQr, qrSvg, qrText, type Ecc } from "../../src/web/app/ui/qr.ts";

const fx = JSON.parse(readFileSync(join(import.meta.dirname, "..", "fixtures", "qr", "qrencode.json"), "utf8")) as {
  cases: { text: string; ecc: Ecc; version: number; matrix: string[] }[];
};

/** The mask number from the first copy of the format bits (around the top-left finder). */
function maskOf(m: string[]): number {
  const bit = (x: number, y: number) => (m[y][x] === "#" ? 1 : 0);
  const pos: [number, number][] = [];
  for (let i = 0; i <= 5; i++) pos.push([8, i]);
  pos.push([8, 7], [8, 8], [7, 8]);
  for (let i = 9; i < 15; i++) pos.push([14 - i, 8]);
  let bits = 0;
  pos.forEach(([x, y], i) => (bits |= bit(x, y) << i));
  bits ^= 0x5412;
  return (bits >>> 10) & 7;
}

for (const c of fx.cases) {
  const label = `${c.ecc} v${c.version} "${c.text.length > 30 ? c.text.slice(0, 27) + "..." : c.text}"`;
  if (c.version > MAX_VERSION) {
    test(`${label}: beyond version ${MAX_VERSION} is refused, not truncated`, () => {
      assert.throws(() => encodeQr(c.text, c.ecc), RangeError);
    });
    continue;
  }
  test(`${label}: matches libqrencode module for module`, () => {
    const q = encodeQr(c.text, c.ecc, { mask: maskOf(c.matrix) });
    assert.equal(q.version, c.version);
    assert.equal(q.size, c.matrix.length);
    assert.equal(qrText(q), c.matrix.join("\n"));
  });
}

test("the honor-roll URLs pick a mask and fit small versions at level M", () => {
  for (const url of ["https://www.cs.drexel.edu/~bls96/eniac/simulator.html", "https://github.com/blstuart/eniac-simulator", "https://doi.org/10.1109/JPROC.2018.2813678", "https://vcfed.org/"]) {
    const q = encodeQr(url);
    assert.ok(q.version <= 4, `${url} v${q.version}`);
    assert.ok(q.mask >= 0 && q.mask <= 7);
    // The automatic choice is one of the eight valid symbols for this text.
    assert.equal(qrText(q), qrText(encodeQr(url, "M", { mask: q.mask })));
  }
});

test("capacity table: level M byte capacity per version (ISO 18004 table 7)", () => {
  // data codewords minus the mode and count overhead (2 bytes for v1-9, 3 for v10)
  const bytes = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((v) => dataCodewords(v, "M") - (v <= 9 ? 2 : 3));
  assert.deepEqual(bytes, [14, 26, 42, 62, 84, 106, 122, 152, 180, 213]);
});

test("SVG: crisp path, 4-module quiet zone, escaped label, requested size", () => {
  const svg = qrSvg("HELLO", { px: 200, label: 'a "b" <c>' });
  assert.match(svg, /viewBox="0 0 29 29"/); // 21 modules + 2 x 4 quiet zone
  assert.match(svg, /width="200" height="200"/);
  assert.match(svg, /shape-rendering="crispEdges"/);
  assert.match(svg, /aria-label="a &#34;b&#34; &#60;c&#62;"/);
  assert.doesNotMatch(svg, /<image|href=/); // drawn, never fetched
});
