// Button feedback sound (app/ui/sound.ts): plays once per press, never throws.

import { test, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { playClick, setAudioFactory, setMuted, MIN_GAP_MS } from "../../src/web/app/ui/sound.ts";

function fakeCtx(state = "running") {
  const log = { oscillators: 0, resumed: 0 };
  const param = { setValueAtTime() {}, exponentialRampToValueAtTime() {} };
  const ctx = {
    currentTime: 0,
    state,
    destination: {},
    resume() {
      log.resumed++;
    },
    createOscillator() {
      log.oscillators++;
      return { type: "", frequency: param, connect() {}, start() {}, stop() {} };
    },
    createGain() {
      return { gain: param, connect() {} };
    },
  };
  return { ctx, log };
}

beforeEach(() => {
  setMuted(false);
  setAudioFactory(null);
});

test("a press plays one tick", () => {
  const { ctx, log } = fakeCtx();
  setAudioFactory(() => ctx);
  assert.equal(playClick(1000), true);
  assert.equal(log.oscillators, 1);
});

test("presses closer than the minimum gap share one sound", () => {
  const { ctx, log } = fakeCtx();
  setAudioFactory(() => ctx);
  playClick(1000);
  assert.equal(playClick(1000 + MIN_GAP_MS - 1), false);
  assert.equal(playClick(1000 + MIN_GAP_MS), true);
  assert.equal(log.oscillators, 2);
});

test("a suspended context is resumed", () => {
  const { ctx, log } = fakeCtx("suspended");
  setAudioFactory(() => ctx);
  playClick(1000);
  assert.equal(log.resumed, 1);
});

test("muted is silent", () => {
  const { ctx, log } = fakeCtx();
  setAudioFactory(() => ctx);
  setMuted(true);
  assert.equal(playClick(1000), false);
  assert.equal(log.oscillators, 0);
});

test("no audio support, or a throwing context, stays silent and never throws", () => {
  setAudioFactory(() => {
    throw new Error("no audio device");
  });
  assert.equal(playClick(1000), false);
  setAudioFactory(null); // node has no AudioContext
  assert.equal(playClick(2000), false);
});
