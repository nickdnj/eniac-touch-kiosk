// Tap dispatcher: one finger, fire on release, first pointer only (UX-03, UX-06).
// Elements opt in with onTap(). The pressed state shows on finger down;
// the action runs on pointerup only if the finger is still over the same
// element. Any second simultaneous pointer is ignored entirely.

export interface TapPoint {
  /** App coordinates (1920x1080 design space). */
  x: number;
  y: number;
}
export type TapHandler = (p: TapPoint) => void;

const handlers = new WeakMap<Element, TapHandler>();

export function onTap(el: Element, fn: TapHandler): void {
  handlers.set(el, fn);
  el.setAttribute("data-tap", "");
}

export function setDisabled(el: Element, disabled: boolean): void {
  el.classList.toggle("disabled", disabled);
  el.setAttribute("aria-disabled", disabled ? "true" : "false");
}

export interface DispatcherOptions {
  toApp: (clientX: number, clientY: number) => TapPoint;
  /** Called on every first-pointer down (idle timers count any touch). */
  onActivity?: () => void;
  /** Called for a tap that hit no data-tap element (neutral). */
  onEmpty?: (p: TapPoint) => void;
  /** Called when a finger goes down on an enabled button (feedback sound). */
  onPress?: () => void;
}

/** A finger that travels further than this (app px) is a swipe, not a tap. */
export const MOVE_CANCEL_PX = 40;

export function installTapDispatcher(root: HTMLElement, o: DispatcherOptions): void {
  let active: number | null = null;
  let downEl: Element | null = null;
  let downAt: TapPoint = { x: 0, y: 0 };
  // A second finger (pinch, two-finger swipe) cancels the first finger's tap.
  let cancelled = false;

  const findTap = (el: Element | null): Element | null => {
    const t = el?.closest("[data-tap]") ?? null;
    return t;
  };
  const isDisabled = (el: Element) => el.classList.contains("disabled") || el.closest(".inert") !== null;

  root.addEventListener(
    "pointerdown",
    (e) => {
      if (active !== null || !e.isPrimary) {
        e.preventDefault();
        e.stopImmediatePropagation();
        if (active !== null) {
          cancelled = true;
          downEl?.classList.remove("pressed");
        }
        return;
      }
      active = e.pointerId;
      cancelled = false;
      downAt = o.toApp(e.clientX, e.clientY);
      o.onActivity?.();
      downEl = findTap(e.target as Element);
      if (downEl && !isDisabled(downEl)) {
        downEl.classList.add("pressed");
        o.onPress?.();
      }
    },
    { capture: true, passive: false },
  );

  const finish = (e: PointerEvent, fire: boolean) => {
    if (e.pointerId !== active) return;
    active = null;
    const el = downEl;
    downEl = null;
    el?.classList.remove("pressed");
    if (!fire || cancelled) return;
    const p = o.toApp(e.clientX, e.clientY);
    if (Math.hypot(p.x - downAt.x, p.y - downAt.y) > MOVE_CANCEL_PX) return; // a swipe or drag
    const under = document.elementFromPoint(e.clientX, e.clientY);
    const upEl = findTap(under);
    if (el && upEl === el) {
      if (isDisabled(el)) return;
      handlers.get(el)?.(p);
    } else if (!el && !upEl) {
      o.onEmpty?.(p);
    }
  };
  root.addEventListener("pointerup", (e) => finish(e, true), { capture: true });
  root.addEventListener("pointercancel", (e) => finish(e, false), { capture: true });
}
