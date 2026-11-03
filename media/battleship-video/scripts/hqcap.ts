// High-quality capture for the video clips (not part of CI). Replaces Playwright's recordVideo (about 0.5 Mbps VP8).
// CDP Page.startScreencast at JPEG quality 100 (or png), every frame piped to ffmpeg with wall-clock timestamps and
// stream-copied into a Matroska intermediate (no encoding load on the machine while a flight is timed);
// finish() then re-encodes it offline to constant-30-fps H.264 at crf 12.
import type { Page, CDPSession } from "@playwright/test";
import { spawn, type ChildProcess } from "node:child_process";
import { mkdirSync, statSync } from "node:fs";
import { dirname } from "node:path";

export class HQCapture {
  private cdp!: CDPSession;
  private ff!: ChildProcess;
  private last: Buffer | null = null;
  frames = 0;
  /** Date.now() when the first frame was captured; beats are measured from here (video t = beat ms). */
  t0 = 0;
  private startedAt = 0;
  private raw = "";
  private format: "jpeg" | "png";
  private page: Page;
  private out: string;
  constructor(page: Page, out: string, opts: { format?: "jpeg" | "png" } = {}) {
    this.page = page;
    this.out = out;
    this.format = opts.format ?? "jpeg";
    this.raw = out.replace(/\.mp4$/, ".mkv");
  }
  /** Start before page.goto so the first frame is the page itself. */
  async start() {
    mkdirSync(dirname(this.out), { recursive: true });
    const codec = this.format === "jpeg" ? "mjpeg" : "png";
    this.ff = spawn("ffmpeg", ["-y", "-loglevel", "error", "-f", "image2pipe", "-use_wallclock_as_timestamps", "1", "-c:v", codec, "-i", "-", "-c:v", "copy", "-f", "matroska", this.raw], { stdio: ["pipe", "inherit", "inherit"] });
    this.ff.stdin!.on("error", () => {});
    this.cdp = await this.page.context().newCDPSession(this.page);
    this.cdp.on("Page.screencastFrame", (e: any) => {
      // ack first so Chrome keeps producing frames; then hand the bytes to ffmpeg
      this.cdp.send("Page.screencastFrameAck", { sessionId: e.sessionId }).catch(() => {});
      const buf = Buffer.from(e.data, "base64");
      if (!this.t0) this.t0 = Date.now();
      this.last = buf;
      this.frames++;
      this.ff.stdin!.write(buf);
    });
    this.startedAt = Date.now();
    const q = this.format === "jpeg" ? { quality: 100 } : {};
    await this.cdp.send("Page.startScreencast", { format: this.format, ...q, maxWidth: 1920, maxHeight: 1080, everyNthFrame: 2 });
  }
  /** Stop, close the intermediate, and encode the final mp4. Returns video info. */
  async finish(crf = 12) {
    await this.cdp.send("Page.stopScreencast").catch(() => {});
    if (this.last) this.ff.stdin!.write(this.last); // one more copy of the last frame so its duration ends now
    const endAt = Date.now();
    this.ff.stdin!.end();
    await new Promise((r) => this.ff.on("close", r));
    await new Promise<void>((res, rej) => {
      const e = spawn("ffmpeg", ["-y", "-loglevel", "error", "-i", this.raw, "-vf", "fps=30:round=near,scale=1920:1080:flags=lanczos,format=yuv420p", "-c:v", "libx264", "-preset", "slow", "-crf", String(crf), "-r", "30", "-vsync", "cfr", "-movflags", "+faststart", this.out], { stdio: "inherit" });
      e.on("close", (c) => (c === 0 ? res() : rej(new Error("ffmpeg encode failed " + c))));
    });
    return { frames: this.frames, bytes: statSync(this.out).size, wallMs: endAt - this.t0 };
  }
}
