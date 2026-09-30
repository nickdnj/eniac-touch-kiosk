// Websocket link to the bridge (architecture 9.2, 5.3, 5.8).
// - reconnect with backoff 250 ms doubling to 2 s
// - ping every 5 s
// - "link down" (E-LINK) once disconnected for more than 5 s
// - hello.protocol / hello.build mismatch -> reload
// Timers and the socket constructor are injectable so the logic is
// testable under node --test with fake timers.

import { PROTOCOL_VERSION, type ClientMsg, type Hello, type ServerMsg } from "../protocol.ts";

export interface SocketLike {
  readyState: number;
  send(data: string): void;
  close(): void;
  onopen: ((ev: unknown) => void) | null;
  onclose: ((ev: unknown) => void) | null;
  onerror: ((ev: unknown) => void) | null;
  onmessage: ((ev: { data: unknown }) => void) | null;
}

export interface Clock {
  now(): number;
  setTimeout(fn: () => void, ms: number): unknown;
  clearTimeout(h: unknown): void;
  setInterval(fn: () => void, ms: number): unknown;
  clearInterval(h: unknown): void;
}

export const realClock: Clock = {
  now: () => Date.now(),
  setTimeout: (fn, ms) => setTimeout(fn, ms),
  clearTimeout: (h) => clearTimeout(h as ReturnType<typeof setTimeout>),
  setInterval: (fn, ms) => setInterval(fn, ms),
  clearInterval: (h) => clearInterval(h as ReturnType<typeof setInterval>),
};

export const BACKOFF_MIN_MS = 250;
export const BACKOFF_MAX_MS = 2000;
export const PING_MS = 5000;
export const LINK_DOWN_MS = 5000;

export interface LinkOptions {
  url: string;
  makeSocket: (url: string) => SocketLike;
  clock?: Clock;
  /** Page build id; undefined means "don't compare builds" (bridge devweb). */
  build?: string;
  onMessage: (m: ServerMsg) => void;
  /** Transport state: "up" once open; "down" as soon as the socket drops. */
  onTransport?: (up: boolean) => void;
  /** Fired once when disconnected > LINK_DOWN_MS (E-LINK), and again with false on reconnect. */
  onLinkDown?: (down: boolean) => void;
  onReload?: () => void;
}

export class Link {
  private sock: SocketLike | null = null;
  private backoff = BACKOFF_MIN_MS;
  private reconnectTimer: unknown = null;
  private downTimer: unknown = null;
  private pingTimer: unknown = null;
  private linkDown = false;
  private stopped = false;
  private nextId = 1;
  private readonly clock: Clock;
  private readonly o: LinkOptions;

  constructor(o: LinkOptions) {
    this.o = o;
    this.clock = o.clock ?? realClock;
  }

  get isOpen(): boolean {
    return this.sock !== null && this.sock.readyState === 1;
  }

  get isLinkDown(): boolean {
    return this.linkDown;
  }

  start(): void {
    this.stopped = false;
    this.armDownTimer();
    this.connect();
  }

  stop(): void {
    this.stopped = true;
    this.clearTimers();
    this.sock?.close();
    this.sock = null;
  }

  /** Sends a whitelisted message. Returns the id used, or null if not open. */
  send(msg: ClientMsg): number | null {
    if (!this.isOpen) return null;
    const id = msg.id ?? this.nextId++;
    this.sock!.send(JSON.stringify({ ...msg, id }));
    return id;
  }

  private connect(): void {
    if (this.stopped) return;
    let s: SocketLike;
    try {
      s = this.o.makeSocket(this.o.url);
    } catch {
      this.scheduleReconnect();
      return;
    }
    this.sock = s;
    s.onopen = () => {
      this.backoff = BACKOFF_MIN_MS;
      this.clock.clearTimeout(this.downTimer);
      this.downTimer = null;
      if (this.linkDown) {
        this.linkDown = false;
        this.o.onLinkDown?.(false);
      }
      this.o.onTransport?.(true);
      this.pingTimer = this.clock.setInterval(() => this.send({ t: "ping" }), PING_MS);
      this.send({ t: "ping" });
    };
    s.onmessage = (ev) => {
      let m: ServerMsg;
      try {
        m = JSON.parse(String(ev.data)) as ServerMsg;
      } catch {
        return;
      }
      if (m.t === "hello" && this.mismatch(m)) {
        this.o.onReload?.();
        return;
      }
      this.o.onMessage(m);
    };
    s.onerror = () => {};
    s.onclose = () => {
      if (this.sock !== s) return;
      this.sock = null;
      this.clock.clearInterval(this.pingTimer);
      this.pingTimer = null;
      this.o.onTransport?.(false);
      this.armDownTimer();
      this.scheduleReconnect();
    };
  }

  private mismatch(h: Hello): boolean {
    if (h.protocol !== PROTOCOL_VERSION) return true;
    if (this.o.build !== undefined && h.build !== this.o.build) return true;
    return false;
  }

  private armDownTimer(): void {
    if (this.downTimer !== null || this.linkDown) return;
    this.downTimer = this.clock.setTimeout(() => {
      this.downTimer = null;
      if (!this.isOpen && !this.linkDown) {
        this.linkDown = true;
        this.o.onLinkDown?.(true);
      }
    }, LINK_DOWN_MS);
  }

  private scheduleReconnect(): void {
    if (this.stopped || this.reconnectTimer !== null) return;
    const wait = this.backoff;
    this.backoff = Math.min(this.backoff * 2, BACKOFF_MAX_MS);
    this.reconnectTimer = this.clock.setTimeout(() => {
      this.reconnectTimer = null;
      this.connect();
    }, wait);
  }

  private clearTimers(): void {
    this.clock.clearTimeout(this.reconnectTimer);
    this.clock.clearTimeout(this.downTimer);
    this.clock.clearInterval(this.pingTimer);
    this.reconnectTimer = this.downTimer = this.pingTimer = null;
  }
}
