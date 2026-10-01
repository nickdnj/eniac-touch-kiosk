// Test doubles shared by the node --test suites (not shipped).

import type { MachineState } from "../../src/web/app/protocol.ts";

/** The units a Squares test doesn't care about, at their engine.go defaults. */
export function otherUnits(): Pick<MachineState, "mp" | "ft" | "mult" | "div"> {
  const ft = { arg: "0", ring: -3, add: 0, sub: 0, argff: 0 };
  return {
    mp: { stage: "0000000000", dec: "00000000000000000000", inff: "0000000000" },
    ft: { "1": { ...ft }, "2": { ...ft }, "3": { ...ft } },
    mult: { stage: 0, ff: "0".repeat(24), r1: 0, r3: 0 },
    div: { place: 0, prog: 0, progff: "00000000", flags: "000000001000000000000000000000" },
  };
}

export class FakeClock {
  t = 0;
  private seq = 0;
  private timers = new Map<number, { at: number; fn: () => void; every?: number }>();

  now = () => this.t;
  setTimeout = (fn: () => void, ms: number): unknown => {
    const id = ++this.seq;
    this.timers.set(id, { at: this.t + ms, fn });
    return id;
  };
  clearTimeout = (h: unknown): void => {
    this.timers.delete(h as number);
  };
  setInterval = (fn: () => void, ms: number): unknown => {
    const id = ++this.seq;
    this.timers.set(id, { at: this.t + ms, fn, every: ms });
    return id;
  };
  clearInterval = (h: unknown): void => {
    this.timers.delete(h as number);
  };

  /** Advance time, firing due timers in order. */
  advance(ms: number): void {
    const end = this.t + ms;
    for (;;) {
      let next: [number, { at: number; fn: () => void; every?: number }] | null = null;
      for (const e of this.timers) if (e[1].at <= end && (!next || e[1].at < next[1].at)) next = e;
      if (!next) break;
      const [id, tm] = next;
      this.t = tm.at;
      if (tm.every) tm.at += tm.every;
      else this.timers.delete(id);
      tm.fn();
    }
    this.t = end;
  }
  get pending(): number {
    return this.timers.size;
  }
}

export class FakeSocket {
  static all: FakeSocket[] = [];
  readyState = 0;
  sent: string[] = [];
  onopen: ((ev: unknown) => void) | null = null;
  onclose: ((ev: unknown) => void) | null = null;
  onerror: ((ev: unknown) => void) | null = null;
  onmessage: ((ev: { data: unknown }) => void) | null = null;
  url: string;
  constructor(url: string) {
    this.url = url;
    FakeSocket.all.push(this);
  }
  send(d: string) {
    this.sent.push(d);
  }
  close() {
    if (this.readyState === 3) return;
    this.readyState = 3;
    this.onclose?.({});
  }
  open() {
    this.readyState = 1;
    this.onopen?.({});
  }
  receive(m: unknown) {
    this.onmessage?.({ data: JSON.stringify(m) });
  }
  fail() {
    this.readyState = 3;
    this.onclose?.({});
  }
}
