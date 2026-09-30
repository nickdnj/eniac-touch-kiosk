// Websocket + mission API types for the kiosk UI.
//
// HAND-WRITTEN from docs/architecture.md sections 5.3-5.9.
// TO BE REPLACED BY GENERATED TYPES (#8): `make protogen` (tygo) will emit
// app/protocol.gen.ts from src/bridge/internal/protocol. When it lands,
// delete this file and re-export from protocol.gen.ts; tsc will flag any drift.
//
// Additions not (yet) in the architecture schema are marked "UI-EXT" and are
// listed in the PR so #8/#10 can adopt or reject them.

export const PROTOCOL_VERSION = 1;

// ---------- MachineState (architecture 5.4) ----------

export interface AccState {
  sign: "P" | "M";
  digits: string; // 10 chars, MSD first
  value: number; // decoded by the bridge (ten's complement when M)
  carry: string; // 10 chars of 0/1
  rep: number; // 0..9
  prog: string; // 12 chars of 0/1, programs 1..12
}

export interface MachineState {
  cycle: { pos: number; mode: string };
  init: string; // 15 chars
  acc: Record<string, AccState>; // "1".."20"
  mp?: { stage: string; dec: string; inff: string };
  ft?: Record<string, { arg: string; ring: number; add: number; sub: number; argff: number }>;
  ct: string; // 30 chars, programs 1..30
  mult?: { stage: number; ff: string; r1: number; r3: number };
  div?: { place: number; prog: number; progff: string; flags: string };
}

/** RFC 7396 merge patch against MachineState. */
export type MergePatch = { [k: string]: unknown };

// ---------- Session (architecture 5.5) ----------

export type SessionState = "none" | "starting" | "setup" | "armed" | "running" | "result" | "failed";
export type SessionMode = "visitor" | "docent" | "attract";

export interface SessionInfo {
  id: string;
  mission: string;
  mode: SessionMode;
  state: SessionState;
  applied: string[];
  remaining: number;
}

export interface RunInfo {
  state: "busy" | "idle";
  inits: number;
  settled?: Record<string, number>;
}

export type CoreHealth = "starting" | "up" | "down";

export interface HealthInfo {
  core: CoreHealth;
  code?: string;
  attempt?: number;
  of?: number;
  final?: boolean;
  kioskClient?: boolean;
}

export interface HelloConfig {
  idle: { setupS: number; runS: number; countdownS: number };
  admin?: { tapZone?: unknown };
}

// ---------- Server -> client (architecture 5.4) ----------

export interface HelloMsg {
  t: "hello";
  protocol: number;
  build: string;
  config: HelloConfig;
  health: HealthInfo;
}
export interface StateMsg {
  t: "state";
  session: SessionInfo | null;
  seq: number;
  machine: MachineState;
  cards: unknown[];
  run: RunInfo;
}
export interface FrameMsg {
  t: "frame";
  seq: number;
  d: MergePatch;
}
export interface SessionMsg extends SessionInfo {
  t: "session";
}
export interface StepAppliedMsg {
  t: "step_applied";
  re?: number;
  step: string;
  assisted: boolean;
  remaining: number;
}
export interface SetupCompleteMsg {
  t: "setup_complete";
  skipped: number;
}
export interface RunMsg extends RunInfo {
  t: "run";
}
export interface CheckpointMsg {
  t: "checkpoint";
  id: string;
}
export interface HealthMsg extends HealthInfo {
  t: "health";
}
export type ErrorCode = "BUSY" | "BAD_STATE" | "UNKNOWN_STEP" | "NOT_ALLOWED" | "BAD_MESSAGE";
export interface ErrorMsg {
  t: "error";
  re?: number;
  code: ErrorCode;
  message: string;
}
export interface PongMsg {
  t: "pong";
  re?: number;
}

export type ServerMsg =
  | HelloMsg
  | StateMsg
  | FrameMsg
  | SessionMsg
  | StepAppliedMsg
  | SetupCompleteMsg
  | RunMsg
  | CheckpointMsg
  | HealthMsg
  | ErrorMsg
  | PongMsg;

// ---------- Client -> server whitelist (architecture 5.6) ----------

export type ButtonName = "init" | "clear" | "read";
export type EndReason = "idle" | "menu" | "restart" | "done";

/** Metric events the UI may emit (architecture 8.3). */
export type MetricEv =
  | "wrong_tap"
  | "setup_skipped"
  | "skip_to_answer"
  | "idle_reset"
  | "error_enter"
  | "error_exit";

export type ClientMsg =
  | { t: "start_mission"; id?: number; mission: string; mode: SessionMode }
  | { t: "apply_step"; id?: number; step: string; assisted: boolean }
  | { t: "skip_setup"; id?: number }
  | { t: "button"; id?: number; b: ButtonName }
  | { t: "set_speed"; id?: number; speed: string }
  | { t: "end_session"; id?: number; reason: EndReason }
  // UI-EXT: `code` carries the error code for error_enter/error_exit.
  | { t: "metric"; id?: number; ev: MetricEv; mission?: string; step?: string; n?: number; code?: string }
  | { t: "ping"; id?: number };

// ---------- Mission API (architecture 5.7, 5.9.3) ----------

export interface MissionSummary {
  id: string;
  title: string;
  order: number;
  summary: string;
  buttons: ButtonName[];
  available: boolean;
  reason?: string;
  // UI-EXT (optional): picker-card copy (UX 7.2). Falls back to `summary`.
  teaser?: string;
  minutes?: number;
  stepCount?: number;
}

export interface StepText {
  headline: string;
  body: string;
  more?: string;
  done: string;
  /**
   * Wrong-tap hints (UX 8.1.4). Keys are either an element ID of a specific
   * decoy (e.g. "jack:a1.S") or a class key: wrongSource, wrongDest,
   * wrongTarget, wrongValue. Architecture 5.9.2 shows wrongValue/wrongTarget;
   * wrongSource/wrongDest and per-ID keys are UI-EXT.
   */
  hints?: Record<string, string>;
  /** UI-EXT: plain-language label chips for the targets (UX 4.3 step 6). */
  labels?: Record<string, string>;
}

export interface ConfigItemPlug {
  kind: "plug";
  from: string;
  to: string;
  cable: "data" | "program";
  owner: string; // "preset" | "step:<id>"
}
export interface ConfigItemSwitch {
  kind: "switch";
  switch: string;
  value: string;
  owner: string;
}
export type ConfigItem = ConfigItemPlug | ConfigItemSwitch;

export interface PlugStep {
  id: string;
  kind: "plug";
  from: string;
  to: string;
  fromClass?: string;
  toClass?: string;
  cable: "data" | "program";
  text: StepText;
}
export interface SwitchStep {
  id: string;
  kind: "switch";
  switch: string;
  value: string;
  family?: string;
  choices: string[];
  /** UI-EXT: optional plain labels per choice, e.g. {"2": "2 times"}. */
  choiceLabels?: Record<string, string>;
  text: StepText;
}
export type MissionStep = PlugStep | SwitchStep;

/** UI-EXT: a caption beat in the run view, fired by a real machine change. */
export interface RunBeat {
  when: { accProg?: { acc: string; prog: number } } | { ct?: number } | { idle?: true };
  text: string; // may use {x} (acc1 before the press), {x1} (after), {sq}
}

/**
 * UI-EXT: screen copy for the mission (UX 8.1.4). Issue #18 requires all
 * mission copy to come from the mission JSON, and 5.9.3 only carries step
 * text, so the rest lives here until #10 adopts it.
 */
export interface MissionScreens {
  briefing: { headline: string; body: string; more?: string; units: { id: string; label: string; panel: number }[] };
  plan: { headline: string; body: string; more?: string; boxes: [string, string]; math: string };
  rest: { headline: string; body: string };
  run: {
    labels: Record<string, string>; // acc id -> "x" / "x squared"
    /** presses[k].prompt is shown before press k+1; captions play during it. */
    presses: { prompt: string; captions: RunBeat[] }[];
    promptBusy: string;
    promptLater: string;
    initHelp: string;
    fasterHint: string;
    tapeRow: string; // "{x} x {x} = {sq}"
    extrasAfterPress: number; // "Keep pressing" etc. appear after this many presses
  };
  result: { headline: string; body: string; takeaway: string; takeawaySub: string; more?: string };
}

export interface CompiledMission {
  id: string;
  title: string;
  order: number;
  ordered: boolean;
  config: ConfigItem[];
  steps: MissionStep[];
  counts: { presetCables: number; presetSwitches: number; stepCables: number; stepSwitches: number };
  units: string[];
  run: { buttons: ButtonName[]; speeds: string[]; defaultSpeed: string; watch: string[] };
  checkpoints: string[];
  result: string;
  credits?: string[];
  screens?: MissionScreens; // UI-EXT
}
