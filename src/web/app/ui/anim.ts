// Decorative animation that can never hold the UI hostage.
//
// Rule for the whole app: the FINAL visual state is set synchronously and
// flow never waits on requestAnimationFrame or Animation.finished alone.
// Chromium throttles frames in hidden or occluded windows (and some
// automation setups), and a kiosk must not stall because an animation did
// not tick. play() resolves on the animation's end OR a timer, whichever
// comes first, and then finishes the animation so it cannot linger.

const active = new Set<Animation>();

export function play(el: Element, keyframes: Keyframe[], opts: KeyframeAnimationOptions & { duration: number }): Promise<void> {
  let a: Animation;
  try {
    a = (el as HTMLElement).animate(keyframes, opts);
  } catch {
    return Promise.resolve();
  }
  active.add(a);
  const total = opts.duration + (typeof opts.delay === "number" ? opts.delay : 0);
  return new Promise((resolve) => {
    let settled = false;
    const done = () => {
      if (settled) return;
      settled = true;
      clearTimeout(t);
      active.delete(a);
      try {
        if (a.playState !== "finished") a.finish();
      } catch {
        a.cancel();
      }
      resolve();
    };
    const t = setTimeout(done, total + 80);
    a.finished.then(done, done);
  });
}

/** Jumps every running decorative animation to its end (e.g. on "Next step"). */
export function finishAll(): void {
  for (const a of [...active]) {
    try {
      a.finish();
    } catch {
      a.cancel();
    }
  }
}

/** setTimeout as a promise (for choreography steps; never for machine state). */
export function after(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}
