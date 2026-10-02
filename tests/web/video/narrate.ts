// Narration for the walkthrough videos (not part of CI). Lines come from
// docs/video/narration.md, rendered to WAV by narration-gen.py into
// build/video/narration/. During a recording each line is "spoken" by waiting
// out its length while the caption is up, so the action never runs ahead of
// the voice; the start time of every line is logged, and narration-mux.py lays
// the clips onto the recorded video at exactly those offsets.
// Enabled with NARRATE=1; without it the videos record silently as before.
import type { Page } from "@playwright/test";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";

const DIR = join(__dirname, "..", "..", "..", "build", "video", "narration");
type Row = { video: string; idx: number; beat: string; text: string; file: string | null; dur: number };
type Said = { idx: number; file: string; at: number; dur: number };

let rows: Row[] = [];
let video = "";
let t0 = 0; // epoch ms of the page's creation, which is when the video starts
let busyUntil = 0;
let said: Said[] = [];
const used = new Set<number>();
let credit = 0; // ms already spent speaking, counted against the next pause(s)

export const narrating = () => process.env.NARRATE === "1";

/** Call first in a test, before any navigation. */
export async function narration(page: Page, name: string): Promise<void> {
  if (!narrating()) return;
  video = name;
  rows = (JSON.parse(readFileSync(join(DIR, "manifest.json"), "utf8")) as Row[]).filter((r) => r.video === name);
  t0 = await page.evaluate(() => performance.timeOrigin);
  busyUntil = 0;
  credit = 0;
  said = [];
  used.clear();
}

function queue(r: Row): number {
  used.add(r.idx);
  if (r.file) {
    const start = Math.max(Date.now(), busyUntil);
    said.push({ idx: r.idx, file: r.file, at: start - t0, dur: r.dur });
    busyUntil = start + r.dur * 1000 + 350;
  } else {
    busyUntil = Math.max(Date.now(), busyUntil) + 3000; // a scripted "[pause: …]" row
  }
  // Lines marked "(same beat, a little later)" follow straight on.
  const next = rows.find((x) => x.idx === r.idx + 1 && /^\(same beat, a little later\)/.test(x.beat));
  if (next) queue(next);
  return busyUntil;
}

/** Speak the line keyed by this beat (exact caption, "title card", "end card",
 *  "(caption cleared)") and wait until it has been said. */
export async function speak(page: Page, beat: string): Promise<void> {
  if (!narrating()) return;
  const r = rows.find((x) => !used.has(x.idx) && x.beat === beat);
  if (!r) return;
  credit = 0; // a new line starts a new beat
  queue(r);
  await settle(page);
}

/** Speak the next unused "(same beat, during …)" line and wait for it. */
export async function speakDuring(page: Page): Promise<void> {
  if (!narrating()) return;
  const r = rows.find((x) => !used.has(x.idx) && /^\(same beat, during/.test(x.beat));
  if (!r) return;
  credit = 0; // a new line starts a new beat
  queue(r);
  await settle(page);
}

/** Length of the line for a beat, in ms (0 when silent), for card timing. */
export function lineMs(beat: string): number {
  if (!narrating()) return 0;
  const r = rows.find((x) => !used.has(x.idx) && x.beat === beat);
  return r && r.file ? r.dur * 1000 + 600 : 0;
}

export async function settle(page: Page): Promise<void> {
  const wait = busyUntil - Date.now();
  if (wait > 0) {
    await page.waitForTimeout(wait);
    credit += wait;
  }
}

/** The part of a scripted pause still left after the narration that was just
 *  spoken: a beat lasts max(pause, line), not pause + line. */
export function afterSpeech(ms: number): number {
  if (!narrating()) return ms;
  const use = Math.min(credit, ms);
  credit -= use;
  return ms - use;
}

/** Call last: waits out the final line and writes the timeline. */
export async function finishNarration(page: Page): Promise<void> {
  if (!narrating()) return;
  await settle(page);
  mkdirSync(DIR, { recursive: true });
  writeFileSync(join(DIR, `${video}-timeline.json`), JSON.stringify({ video, said }, null, 1));
}
