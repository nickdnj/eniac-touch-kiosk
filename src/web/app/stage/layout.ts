// Fixed 1920x1080 layout (UX 4.2, 7.3). App coordinates, origin top-left.

export const STAGE = { x: 24, y: 112, w: 1360, h: 904 };
export const RAIL = { x: 1408, y: 112, w: 488, h: 904 };

/** Workbench, stage-local. Cards 300 px wide, 40 px gaps, centred. */
export const WB = {
  dataRail: { x: 0, y: 4 },
  cardsY: 82,
  /** Left edge of card 1..4 (Squares: i, c, a1, a2). */
  cardXs: [20, 360, 700, 1040],
  programRail: { x: 0, y: 768 },
  captionY: 876,
};

/** L2 windows (app coordinates). */
export const WIN_LEFT = { x: 48, y: 160, w: 620, h: 620 };
export const WIN_RIGHT = { x: 716, y: 160, w: 620, h: 620 };
export const WIN_SWITCH = { x: 234, y: 136, w: 900, h: 520 };
export const PICKER = { x: 24, y: 690, w: 1360, h: 326 };

export const JACK_HIT = 88;
export const DIAL_HIT = 120;
export const PICK_BTN = 120;
