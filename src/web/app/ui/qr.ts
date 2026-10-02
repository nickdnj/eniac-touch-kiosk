// A tiny QR Code encoder (ISO/IEC 18004), byte mode, versions 1 to 10.
// The kiosk is offline, so the honor-roll QR codes (UX 14.6.1) are drawn
// here from the URL text, never fetched. Pure: no DOM. Written for this
// exhibit after the public algorithm (finder, timing and alignment
// patterns, Reed-Solomon over GF(256) with 0x11D, the 8 masks and the
// standard penalty rules). tests/web/qr.test.ts checks it against
// matrices from libqrencode, and the honor screenshots decode with zbarimg.

export type Ecc = "L" | "M" | "Q" | "H";

/** Highest version supported (57 x 57 modules; 213 bytes at level M). */
export const MAX_VERSION = 10;

// Tables for versions 1..10 (index 0 unused), per level.
const ECC_PER_BLOCK: Record<Ecc, number[]> = {
  L: [-1, 7, 10, 15, 20, 26, 18, 20, 24, 30, 18],
  M: [-1, 10, 16, 26, 18, 24, 16, 18, 22, 22, 26],
  Q: [-1, 13, 22, 18, 26, 18, 24, 18, 22, 20, 24],
  H: [-1, 17, 28, 22, 16, 22, 28, 26, 26, 24, 28],
};
const NUM_BLOCKS: Record<Ecc, number[]> = {
  L: [-1, 1, 1, 1, 1, 1, 2, 2, 2, 2, 4],
  M: [-1, 1, 1, 1, 2, 2, 4, 4, 4, 5, 5],
  Q: [-1, 1, 1, 2, 2, 4, 4, 6, 6, 8, 8],
  H: [-1, 1, 1, 2, 4, 4, 4, 5, 6, 8, 8],
};
const FORMAT_ECC_BITS: Record<Ecc, number> = { L: 1, M: 0, Q: 3, H: 2 };

export interface QrCode {
  version: number;
  size: number;
  mask: number;
  ecc: Ecc;
  /** modules[y][x], true = dark. */
  modules: boolean[][];
}

function rawDataModules(ver: number): number {
  let r = (16 * ver + 128) * ver + 64;
  if (ver >= 2) {
    const n = Math.floor(ver / 7) + 2;
    r -= (25 * n - 10) * n - 55;
    if (ver >= 7) r -= 36;
  }
  return r;
}

/** Data codewords (bytes) a version and level can carry. */
export function dataCodewords(ver: number, ecc: Ecc): number {
  return Math.floor(rawDataModules(ver) / 8) - ECC_PER_BLOCK[ecc][ver] * NUM_BLOCKS[ecc][ver];
}

function alignmentPositions(ver: number, size: number): number[] {
  if (ver === 1) return [];
  const n = Math.floor(ver / 7) + 2;
  const step = Math.ceil((ver * 4 + 4) / (n * 2 - 2)) * 2;
  const out = [6];
  for (let pos = size - 7; out.length < n; pos -= step) out.splice(1, 0, pos);
  return out;
}

// ---------------------------------------------------------------- Reed-Solomon

function gfMul(x: number, y: number): number {
  let z = 0;
  for (let i = 7; i >= 0; i--) {
    z = (z << 1) ^ ((z >>> 7) * 0x11d);
    z ^= ((y >>> i) & 1) * x;
  }
  return z & 0xff;
}

function rsDivisor(degree: number): number[] {
  const r = new Array<number>(degree).fill(0);
  r[degree - 1] = 1;
  let root = 1;
  for (let i = 0; i < degree; i++) {
    for (let j = 0; j < r.length; j++) {
      r[j] = gfMul(r[j], root);
      if (j + 1 < r.length) r[j] ^= r[j + 1];
    }
    root = gfMul(root, 0x02);
  }
  return r;
}

function rsRemainder(data: number[], div: number[]): number[] {
  const r = new Array<number>(div.length).fill(0);
  for (const b of data) {
    const f = b ^ (r.shift() as number);
    r.push(0);
    div.forEach((c, i) => (r[i] ^= gfMul(c, f)));
  }
  return r;
}

// ---------------------------------------------------------------- encoder

function utf8(text: string): number[] {
  return Array.from(new TextEncoder().encode(text));
}

/** Byte-mode codewords for the smallest version that fits at `ecc`. */
function encodeData(bytes: number[], ecc: Ecc, minVersion: number): { version: number; data: number[] } {
  for (let ver = Math.max(1, minVersion); ver <= MAX_VERSION; ver++) {
    const ccBits = ver <= 9 ? 8 : 16;
    const capBits = dataCodewords(ver, ecc) * 8;
    if (4 + ccBits + bytes.length * 8 > capBits) continue;
    const bits: number[] = [];
    const put = (v: number, n: number) => {
      for (let i = n - 1; i >= 0; i--) bits.push((v >>> i) & 1);
    };
    put(0b0100, 4);
    put(bytes.length, ccBits);
    for (const b of bytes) put(b, 8);
    put(0, Math.min(4, capBits - bits.length));
    put(0, (8 - (bits.length % 8)) % 8);
    for (let pad = 0xec; bits.length < capBits; pad ^= 0xec ^ 0x11) put(pad, 8);
    const data: number[] = [];
    for (let i = 0; i < bits.length; i += 8) data.push(bits.slice(i, i + 8).reduce((a, b) => (a << 1) | b, 0));
    return { version: ver, data };
  }
  throw new RangeError(`QR: ${bytes.length} bytes do not fit in version ${MAX_VERSION} at level ${ecc}`);
}

function addEcc(data: number[], ver: number, ecc: Ecc): number[] {
  const nb = NUM_BLOCKS[ecc][ver];
  const eLen = ECC_PER_BLOCK[ecc][ver];
  const raw = Math.floor(rawDataModules(ver) / 8);
  const nShort = nb - (raw % nb);
  const shortLen = Math.floor(raw / nb);
  const div = rsDivisor(eLen);
  const blocks: number[][] = [];
  for (let i = 0, k = 0; i < nb; i++) {
    const dat = data.slice(k, k + shortLen - eLen + (i < nShort ? 0 : 1));
    k += dat.length;
    const e = rsRemainder(dat, div);
    if (i < nShort) dat.push(0);
    blocks.push(dat.concat(e));
  }
  const out: number[] = [];
  for (let i = 0; i < blocks[0].length; i++)
    blocks.forEach((b, j) => {
      if (i !== shortLen - eLen || j >= nShort) out.push(b[i]);
    });
  return out;
}

class Grid {
  readonly size: number;
  readonly m: boolean[][];
  readonly fn: boolean[][];
  readonly version: number;
  constructor(version: number) {
    this.version = version;
    this.size = version * 4 + 17;
    this.m = Array.from({ length: this.size }, () => new Array<boolean>(this.size).fill(false));
    this.fn = Array.from({ length: this.size }, () => new Array<boolean>(this.size).fill(false));
  }
  set(x: number, y: number, dark: boolean): void {
    this.m[y][x] = dark;
    this.fn[y][x] = true;
  }

  drawFunctionPatterns(): void {
    const n = this.size;
    for (let i = 0; i < n; i++) {
      this.set(6, i, i % 2 === 0);
      this.set(i, 6, i % 2 === 0);
    }
    for (const [cx, cy] of [[3, 3], [n - 4, 3], [3, n - 4]]) {
      for (let dy = -4; dy <= 4; dy++)
        for (let dx = -4; dx <= 4; dx++) {
          const d = Math.max(Math.abs(dx), Math.abs(dy));
          const x = cx + dx, y = cy + dy;
          if (x >= 0 && x < n && y >= 0 && y < n) this.set(x, y, d !== 2 && d !== 4);
        }
    }
    const pos = alignmentPositions(this.version, n);
    const last = pos.length - 1;
    pos.forEach((px, i) =>
      pos.forEach((py, j) => {
        if ((i === 0 && j === 0) || (i === 0 && j === last) || (i === last && j === 0)) return;
        for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) this.set(px + dx, py + dy, Math.max(Math.abs(dx), Math.abs(dy)) !== 1);
      }),
    );
    this.drawFormat("M", 0); // reserved; redrawn with the real mask
    if (this.version >= 7) {
      let rem = this.version;
      for (let i = 0; i < 12; i++) rem = (rem << 1) ^ ((rem >>> 11) * 0x1f25);
      const bits = (this.version << 12) | rem;
      for (let i = 0; i < 18; i++) {
        const dark = ((bits >>> i) & 1) !== 0;
        const a = n - 11 + (i % 3), b = Math.floor(i / 3);
        this.set(a, b, dark);
        this.set(b, a, dark);
      }
    }
  }

  drawFormat(ecc: Ecc, mask: number): void {
    const data = (FORMAT_ECC_BITS[ecc] << 3) | mask;
    let rem = data;
    for (let i = 0; i < 10; i++) rem = (rem << 1) ^ ((rem >>> 9) * 0x537);
    const bits = ((data << 10) | rem) ^ 0x5412;
    const bit = (i: number) => ((bits >>> i) & 1) !== 0;
    const n = this.size;
    for (let i = 0; i <= 5; i++) this.set(8, i, bit(i));
    this.set(8, 7, bit(6));
    this.set(8, 8, bit(7));
    this.set(7, 8, bit(8));
    for (let i = 9; i < 15; i++) this.set(14 - i, 8, bit(i));
    for (let i = 0; i < 8; i++) this.set(n - 1 - i, 8, bit(i));
    for (let i = 8; i < 15; i++) this.set(8, n - 15 + i, bit(i));
    this.set(8, n - 8, true);
  }

  drawCodewords(cw: number[]): void {
    const n = this.size;
    let i = 0;
    for (let right = n - 1; right >= 1; right -= 2) {
      if (right === 6) right = 5;
      for (let v = 0; v < n; v++)
        for (let j = 0; j < 2; j++) {
          const x = right - j;
          const up = ((right + 1) & 2) === 0;
          const y = up ? n - 1 - v : v;
          if (!this.fn[y][x] && i < cw.length * 8) {
            this.m[y][x] = ((cw[i >>> 3] >>> (7 - (i & 7))) & 1) !== 0;
            i++;
          }
        }
    }
  }

  applyMask(mask: number): void {
    const n = this.size;
    for (let y = 0; y < n; y++)
      for (let x = 0; x < n; x++) {
        if (this.fn[y][x]) continue;
        let inv: boolean;
        switch (mask) {
          case 0: inv = (x + y) % 2 === 0; break;
          case 1: inv = y % 2 === 0; break;
          case 2: inv = x % 3 === 0; break;
          case 3: inv = (x + y) % 3 === 0; break;
          case 4: inv = (Math.floor(x / 3) + Math.floor(y / 2)) % 2 === 0; break;
          case 5: inv = ((x * y) % 2) + ((x * y) % 3) === 0; break;
          case 6: inv = (((x * y) % 2) + ((x * y) % 3)) % 2 === 0; break;
          default: inv = (((x + y) % 2) + ((x * y) % 3)) % 2 === 0;
        }
        if (inv) this.m[y][x] = !this.m[y][x];
      }
  }

  /** The standard penalty score (rules N1 to N4). */
  penalty(): number {
    const n = this.size;
    let score = 0;
    const addHistory = (len: number, h: number[]) => {
      if (h[0] === 0) len += n; // the light border before the first run
      h.pop();
      h.unshift(len);
    };
    const countPatterns = (h: number[]) => {
      const k = h[1];
      const core = k > 0 && h[2] === k && h[3] === k * 3 && h[4] === k && h[5] === k;
      return (core && h[0] >= k * 4 && h[6] >= k ? 1 : 0) + (core && h[6] >= k * 4 && h[0] >= k ? 1 : 0);
    };
    const line = (get: (i: number) => boolean) => {
      let color = false, run = 0;
      const h = [0, 0, 0, 0, 0, 0, 0];
      for (let i = 0; i < n; i++) {
        if (get(i) === color) {
          run++;
          if (run === 5) score += 3;
          else if (run > 5) score++;
        } else {
          addHistory(run, h);
          if (!color) score += countPatterns(h) * 40;
          color = get(i);
          run = 1;
        }
      }
      if (color) {
        addHistory(run, h);
        run = 0;
      }
      run += n;
      addHistory(run, h);
      score += countPatterns(h) * 40;
    };
    for (let y = 0; y < n; y++) line((x) => this.m[y][x]);
    for (let x = 0; x < n; x++) line((y) => this.m[y][x]);
    for (let y = 0; y < n - 1; y++)
      for (let x = 0; x < n - 1; x++) {
        const c = this.m[y][x];
        if (c === this.m[y][x + 1] && c === this.m[y + 1][x] && c === this.m[y + 1][x + 1]) score += 3;
      }
    let dark = 0;
    for (const row of this.m) for (const c of row) if (c) dark++;
    const total = n * n;
    score += (Math.ceil(Math.abs(dark * 20 - total * 10) / total) - 1) * 10;
    return score;
  }
}

/**
 * Encodes `text` (UTF-8, byte mode) at level `ecc` in the smallest version
 * from `minVersion` up that fits. The mask is the one with the lowest
 * penalty unless `mask` (0 to 7) is given.
 */
export function encodeQr(text: string, ecc: Ecc = "M", opts: { minVersion?: number; mask?: number } = {}): QrCode {
  const { version, data } = encodeData(utf8(text), ecc, opts.minVersion ?? 1);
  const g = new Grid(version);
  g.drawFunctionPatterns();
  g.drawCodewords(addEcc(data, version, ecc));
  let mask = opts.mask ?? -1;
  if (mask < 0) {
    let best = Infinity;
    for (let k = 0; k < 8; k++) {
      g.applyMask(k);
      g.drawFormat(ecc, k);
      const p = g.penalty();
      if (p < best) {
        best = p;
        mask = k;
      }
      g.applyMask(k); // undo (XOR)
    }
  }
  g.applyMask(mask);
  g.drawFormat(ecc, mask);
  return { version, size: g.size, mask, ecc, modules: g.m };
}

/**
 * SVG markup of a QR code: dark modules as one path on a light square,
 * with the 4-module quiet zone the standard requires. Crisp at any size.
 */
export function qrSvg(text: string, opts: { px?: number; ecc?: Ecc; dark?: string; light?: string; label?: string } = {}): string {
  const q = encodeQr(text, opts.ecc ?? "M");
  const quiet = 4;
  const dim = q.size + quiet * 2;
  let d = "";
  q.modules.forEach((row, y) =>
    row.forEach((c, x) => {
      if (c) d += `M${x + quiet} ${y + quiet}h1v1h-1z`;
    }),
  );
  const px = opts.px ?? 280;
  const label = (opts.label ?? text).replace(/[&<>"]/g, (c) => `&#${c.charCodeAt(0)};`);
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" class="qr" viewBox="0 0 ${dim} ${dim}" width="${px}" height="${px}" shape-rendering="crispEdges" role="img" aria-label="${label}">` +
    `<rect width="${dim}" height="${dim}" fill="${opts.light ?? "#FFFFFF"}"/><path d="${d}" fill="${opts.dark ?? "#000000"}"/></svg>`
  );
}

/** A text rendering ("#" dark, "." light), for tests and debugging. */
export function qrText(q: QrCode): string {
  return q.modules.map((r) => r.map((c) => (c ? "#" : ".")).join("")).join("\n");
}
