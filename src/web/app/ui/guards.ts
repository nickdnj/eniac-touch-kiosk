// Browser guards (UX-05, UX-06, test plan M1-17).
// CSS does most of the work (touch-action: none, user-select: none,
// overscroll-behavior: none, -webkit-touch-callout: none; see styles/app.css).
// These listeners block what CSS can't: context menu, selection, native
// drag, Safari gesture events, ctrl+wheel zoom, multi-finger touchmove,
// link navigation and keyboard zoom/navigation shortcuts.

export interface GuardEvent {
  type: string;
  preventDefault(): void;
  stopPropagation?(): void;
  ctrlKey?: boolean;
  metaKey?: boolean;
  altKey?: boolean;
  key?: string;
  touches?: { length: number };
  target?: unknown;
}

export interface GuardTarget {
  addEventListener(type: string, fn: (e: GuardEvent) => void, opts?: AddEventListenerOptions): void;
}

/** Events that are always cancelled. */
export const ALWAYS_BLOCK = [
  "contextmenu",
  "selectstart",
  "dragstart",
  "drop",
  "gesturestart",
  "gesturechange",
  "gestureend",
  "dblclick",
] as const;

const BLOCKED_KEYS = new Set(["+", "-", "=", "0", "r", "R", "[", "]", "ArrowLeft", "ArrowRight", "F5"]);

/** Returns true if the event was blocked. Exported for unit tests. */
export function guard(e: GuardEvent): boolean {
  switch (e.type) {
    case "wheel":
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        return true;
      }
      return false;
    case "touchstart":
    case "touchmove":
      // Second finger (pinch, two-finger swipe) never reaches the browser.
      if (e.touches && e.touches.length > 1) {
        e.preventDefault();
        return true;
      }
      if (e.type === "touchmove") {
        // No scrolling, pull-to-refresh or swipe-back anywhere.
        e.preventDefault();
        return true;
      }
      return false;
    case "click": {
      const t = e.target as { closest?: (s: string) => unknown } | undefined;
      if (t && typeof t.closest === "function" && t.closest("a[href]")) {
        e.preventDefault();
        return true;
      }
      return false;
    }
    case "keydown":
      if ((e.ctrlKey || e.metaKey || e.altKey) && e.key && BLOCKED_KEYS.has(e.key)) {
        e.preventDefault();
        return true;
      }
      if (e.key === "Backspace" || e.key === "F5") {
        e.preventDefault();
        return true;
      }
      return false;
    default:
      if ((ALWAYS_BLOCK as readonly string[]).includes(e.type)) {
        e.preventDefault();
        return true;
      }
      return false;
  }
}

export function installGuards(target: GuardTarget): void {
  const opts: AddEventListenerOptions = { capture: true, passive: false };
  for (const t of [...ALWAYS_BLOCK, "wheel", "touchstart", "touchmove", "click", "keydown"]) {
    target.addEventListener(t, guard, opts);
  }
}
