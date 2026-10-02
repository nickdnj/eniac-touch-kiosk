// Live attract: client state (PRD FR-30, FR-34 to FR-36; UX 14.2). Pure,
// no DOM: the attract screen (drawn on the shared panorama component)
// reads this store; tests/web/attract.test.ts drives it with messages.
//
// What the bridge sends (architecture 5.4, attract additions):
//   attract  {phase, mission, session, flight, landed, total, cards,
//             holdMs (landed), landing (landed, recycling), code (error)}
//            on every phase change; also inside `state` and as the reply
//            (re) to attract_start / attract_stop.
//   The flight itself is an ordinary session with mode "attract": its
//   session, state, frame, punch, run and checkpoint messages are the live
//   machine. App.mirror already applies state/frame (lamps); this store
//   keeps the flight's cards (CardLog: the plot dots, apex, landing) and
//   derives the caption and the live/held/lost indicator.
//
// Between flights (`dimmed`, phase recycling) the next flight's session
// already exists and App.mirror switches to its (dark) snapshot: a screen
// that holds "the last real frame, dimmed" (UX 14.2.4) keeps the lamps it
// drew last and ignores the mirror until the phase is reading again.
//
// Honesty (no demo fallback): every card and dot comes from a `punch` of
// the current attract session; nothing is kept across a hand-off; between
// flights the last real flight is kept only to be shown dimmed.

import type { AttractInfo, AttractLanding, AttractPhase, ClientMsg, CompiledMission, PunchCard, ServerMsg } from "../protocol.ts";
import { CardLog, cardValue, type CardPaneSpec, type PlotSpec } from "../run/cards.ts";
import { COPY } from "../copy.ts";

/** UX 14.2.1: the LIVE chip reads WAITING after 3 s without a status frame... */
export const LIVE_WAITING_MS = 3000;
/** ...and the screen is S10 after 5 s (FR-36), also if a new flight is not live in 5 s. */
export const LIVE_LOST_MS = 5000;

/**
 * - off: attract is not running (nothing to draw).
 * - waking: a fresh core is booting for the first flight (dark lamps, "Waking ENIAC...").
 * - live: frames are arriving.
 * - waiting: a running flight sent no frame for LIVE_WAITING_MS.
 * - held: on purpose no frames: frozen on the landing card, or between flights
 *   (draw the last real frame, dimmed when `dimmed`).
 * - lost: no frame for LIVE_LOST_MS while one was due: show S10 (FR-36).
 * - error: the bridge reports a core fault; recovery runs (S10 via health).
 */
export type Liveness = "off" | "waking" | "live" | "waiting" | "held" | "lost" | "error";

const OFF: AttractInfo = { phase: "off", mission: "", flight: 0, landed: 0, total: 0, cards: 0 };

export class AttractStore {
  status: AttractInfo = { ...OFF };
  /** The attract session whose messages are live now (null between flights and when off). */
  session: string | null = null;
  /** The flight the cards belong to (kept through recycling for the dimmed hold). */
  cardsSession: string | null = null;
  cards: CardLog = new CardLog(null);
  coreUp = true;
  private spec: { cards: CardPaneSpec | null; plot: PlotSpec | null } | null = null;
  private phaseAt = 0;
  private lastFrameAt = 0;
  private listeners = new Set<() => void>();

  get phase(): AttractPhase {
    return this.status.phase;
  }
  get flight(): number {
    return this.status.flight;
  }
  get landing(): AttractLanding | null {
    return this.status.landing ?? null;
  }
  /** Recycling: hold the last real frame dimmed (UX 14.2.4 "Between flights"). */
  get dimmed(): boolean {
    return this.status.phase === "recycling";
  }

  /** The compiled attract mission (run.cards, run.plot): enables plot dots. */
  setMission(m: Pick<CompiledMission, "run"> | null): void {
    this.spec = m ? { cards: (m.run.cards as CardPaneSpec | undefined) ?? null, plot: (m.run.plot as PlotSpec | undefined) ?? null } : null;
    const kept = this.cards.cards;
    this.cards = this.newLog();
    for (const c of kept) this.cards.add(c);
    this.emit();
  }

  get hasMission(): boolean {
    return this.spec !== null;
  }

  /** Subscribe to changes; returns the unsubscribe function. */
  subscribe(fn: () => void): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  /** Feed every server message (the app does). Returns true if anything changed. */
  onMessage(m: ServerMsg, now: number): boolean {
    let changed = false;
    switch (m.t) {
      case "attract": {
        const { t: _t, re: _re, ...a } = m;
        changed = this.applyStatus(a, now);
        break;
      }
      case "state": {
        if (m.attract) changed = this.applyStatus(m.attract, now) || changed;
        const s = m.session;
        if (s && s.mode === "attract" && s.state !== "none" && s.state !== "failed") {
          this.session = s.id;
          if (m.machine) this.lastFrameAt = now;
          // A late joiner (or resync) mid-flight: adopt this flight and its
          // last 20 cards (never older ones invented). While recycling the
          // new core's snapshot is not adopted: the old flight is held.
          const p = this.status.phase;
          if (p === "reading" || p === "flying" || p === "landed") {
            if (this.cardsSession !== s.id) {
              this.cardsSession = s.id;
              this.cards = this.newLog();
            }
            if (m.cards?.length && m.cards[m.cards.length - 1].n > this.cards.count) this.cards.fromState(m.cards);
          }
        } else this.session = null;
        changed = true;
        break;
      }
      case "session": {
        if (m.mode !== "attract") {
          if (m.state !== "none" && this.session) {
            this.session = null; // a visitor has the machine
            changed = true;
          }
          break;
        }
        if (m.state === "none" || m.state === "failed") {
          if (this.session === m.id) {
            this.session = null;
            changed = true;
          }
          break;
        }
        // A new flight's session: its cards start with the `reading` status
        // (until then the previous flight is held, dimmed).
        if (this.session !== m.id) {
          this.session = m.id;
          changed = true;
        }
        break;
      }
      case "punch":
        // Cards belong to the live attract flight only.
        if (this.session && this.session === this.cardsSession) {
          changed = this.cards.add({ n: m.n, text: m.text, fields: m.fields });
        }
        break;
      case "frame":
        if (this.session) this.lastFrameAt = now;
        break;
      case "health":
        if ((m.core === "up") !== this.coreUp) {
          this.coreUp = m.core === "up";
          changed = true;
        }
        break;
    }
    if (changed) this.emit();
    return changed;
  }

  private applyStatus(a: AttractInfo, now: number): boolean {
    const prev = this.status;
    this.status = { ...a };
    if (a.phase !== prev.phase) this.phaseAt = now;
    if (a.phase === "off") {
      this.session = null;
      this.cardsSession = null;
      this.cards = this.newLog();
    } else if (a.phase === "starting" || a.phase === "error") {
      // A fresh start (first flight, or after a fault): nothing to hold.
      this.cardsSession = null;
      this.cards = this.newLog();
    } else if (a.session && a.session !== this.cardsSession && (a.phase === "reading" || a.phase === "flying")) {
      this.cardsSession = a.session;
      this.session = a.session;
      this.cards = this.newLog();
    }
    return true;
  }

  private newLog(): CardLog {
    return new CardLog(this.spec?.cards ?? null, this.spec?.plot ?? null);
  }

  private emit(): void {
    for (const fn of this.listeners) fn();
  }

  /** The hop of the latest real card (run.cards.hop), else the card count. */
  get hop(): number {
    const last: PunchCard | null = this.cards.last;
    if (!last) return 0;
    const hop = this.spec?.cards?.hop;
    const v = hop?.length ? cardValue(last, hop) : null;
    return v ?? this.cards.count;
  }

  /** The live caption (UX 14.2.1); empty when attract is off or in error (S10 shows). */
  caption(): string {
    const c = COPY.attract;
    switch (this.status.phase) {
      case "starting":
        return c.waking;
      case "reading":
        return c.reading;
      case "flying":
        return this.cards.count ? c.flying(this.hop) : c.reading;
      case "landed":
        return c.landed;
      case "recycling":
        return c.between;
      default:
        return "";
    }
  }

  /** Live indicator and FR-36 timing, at `now` (same clock as onMessage). */
  liveness(now: number): Liveness {
    const p = this.status.phase;
    if (p === "off") return "off";
    if (p === "error" || !this.coreUp) return "error";
    const inPhase = now - this.phaseAt;
    if (p === "starting") return inPhase > LIVE_LOST_MS ? "lost" : "waking";
    if (p === "landed") return "held"; // frozen on purpose: the core sends nothing
    if (p === "recycling") return inPhase > LIVE_LOST_MS ? "lost" : "held";
    // reading / flying: frames are due.
    const since = now - Math.max(this.lastFrameAt, this.phaseAt);
    if (since > LIVE_LOST_MS) return "lost";
    if (since > LIVE_WAITING_MS) return "waiting";
    return "live";
  }
}

export interface AttractControllerOptions {
  send: (m: ClientMsg) => number | null;
  store: AttractStore;
  /** Loads the compiled attract mission once (run.cards / run.plot for the dots). */
  fetchMission?: (id: string) => Promise<CompiledMission>;
}

/**
 * Asks the bridge for attract while the kiosk is home (S1) and hands off
 * on the visitor's touch (FR-31). Every request is idempotent on the
 * bridge; `onHello` re-asks after a reconnect.
 */
export class AttractController {
  wanted = false;
  private o: AttractControllerOptions;
  private loading: string | null = null;
  private retryAt = 0;

  constructor(o: AttractControllerOptions) {
    this.o = o;
  }

  /** Home: run attract (a no-op on the bridge if it already runs). */
  enter(): void {
    this.wanted = true;
    this.o.send({ t: "attract_start" });
  }

  /** The hand-off: the bridge kills the attract core and replies phase off. */
  leave(reason: "touch" | "menu" = "touch"): void {
    if (!this.wanted) return;
    this.wanted = false;
    this.o.send({ t: "attract_stop", reason });
  }

  onHello(): void {
    if (this.wanted) this.o.send({ t: "attract_start" });
  }

  onMessage(m: ServerMsg, now: number): void {
    this.o.store.onMessage(m, now);
    const id = this.o.store.status.mission;
    if (id && !this.o.store.hasMission && this.loading !== id && now >= this.retryAt && this.o.fetchMission) {
      this.loading = id;
      this.o.fetchMission(id).then(
        (mi) => this.o.store.setMission(mi),
        () => {
          // Retried 5 s later; the plot stays empty meanwhile (never guessed).
          this.loading = null;
          this.retryAt = now + 5000;
        },
      );
    }
  }
}
