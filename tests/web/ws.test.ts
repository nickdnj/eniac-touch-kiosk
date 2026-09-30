import { test, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { Link, BACKOFF_MAX_MS, LINK_DOWN_MS, PING_MS } from "../../src/web/app/net/ws.ts";
import { FakeClock, FakeSocket } from "./fakes.ts";

beforeEach(() => {
  FakeSocket.all = [];
});

function mk(opts: { build?: string } = {}) {
  const clock = new FakeClock();
  const events: string[] = [];
  const msgs: unknown[] = [];
  const link = new Link({
    url: "ws://x/ws",
    clock,
    build: opts.build,
    makeSocket: (u) => new FakeSocket(u),
    onMessage: (m) => msgs.push(m),
    onTransport: (up) => events.push(up ? "up" : "down"),
    onLinkDown: (d) => events.push(d ? "E-LINK" : "link-ok"),
    onReload: () => events.push("reload"),
  });
  return { clock, events, msgs, link };
}

test("reconnect backoff doubles from 250 ms and caps at 2 s", () => {
  const { clock, link } = mk();
  link.start();
  const gaps: number[] = [];
  let last = 0;
  for (let i = 0; i < 7; i++) {
    const n = FakeSocket.all.length;
    FakeSocket.all[n - 1].fail();
    const before = clock.t;
    while (FakeSocket.all.length === n) clock.advance(10);
    gaps.push(Math.round((clock.t - before) / 10) * 10);
    last = clock.t;
  }
  assert.deepEqual(gaps, [250, 500, 1000, 2000, 2000, 2000, 2000]);
  assert.ok(last > 0 && BACKOFF_MAX_MS === 2000);
});

test("E-LINK fires only after 5 s disconnected, and clears on reconnect", () => {
  const { clock, events, link } = mk();
  link.start();
  FakeSocket.all[0].open();
  FakeSocket.all[0].fail();
  clock.advance(LINK_DOWN_MS - 10);
  for (const s of FakeSocket.all) if (s.readyState === 0) s.fail();
  assert.ok(!events.includes("E-LINK"));
  clock.advance(20);
  assert.ok(events.includes("E-LINK"));
  clock.advance(2000);
  FakeSocket.all[FakeSocket.all.length - 1].open();
  assert.equal(events[events.length - 2], "link-ok");
});

test("a short drop never raises E-LINK", () => {
  const { clock, events, link } = mk();
  link.start();
  FakeSocket.all[0].open();
  FakeSocket.all[0].fail();
  clock.advance(300);
  FakeSocket.all[1].open();
  clock.advance(10_000);
  assert.ok(!events.includes("E-LINK"));
});

test("pings on open and every 5 s", () => {
  const { clock, link } = mk();
  link.start();
  const s = FakeSocket.all[0];
  s.open();
  assert.equal(JSON.parse(s.sent[0]).t, "ping");
  clock.advance(PING_MS * 3);
  assert.equal(s.sent.filter((x) => JSON.parse(x).t === "ping").length, 4);
});

test("hello protocol or build mismatch reloads; match passes through", () => {
  const a = mk({ build: "0.1.0" });
  a.link.start();
  FakeSocket.all[0].open();
  FakeSocket.all[0].receive({ t: "hello", protocol: 1, build: "0.1.0", config: {}, health: { core: "up" } });
  assert.equal(a.msgs.length, 1);
  FakeSocket.all[0].receive({ t: "hello", protocol: 1, build: "0.2.0", config: {}, health: { core: "up" } });
  assert.ok(a.events.includes("reload"));
  const b = mk();
  b.link.start();
  const s = FakeSocket.all[FakeSocket.all.length - 1];
  s.open();
  s.receive({ t: "hello", protocol: 2, build: "x", config: {}, health: { core: "up" } });
  assert.ok(b.events.includes("reload"));
});

test("send returns null when not open, and numbers messages", () => {
  const { link } = mk();
  link.start();
  assert.equal(link.send({ t: "ping" }), null);
  FakeSocket.all[0].open();
  const id = link.send({ t: "button", b: "init" });
  assert.equal(typeof id, "number");
  const sent = JSON.parse(FakeSocket.all[0].sent.at(-1)!);
  assert.deepEqual(sent, { t: "button", b: "init", id });
});
