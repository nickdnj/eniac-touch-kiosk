// Websocket + mission API types for the kiosk UI.
//
// SECTION A mirrors, field for field, the tygo-generated files on the bridge
// branch (origin/m1-bridge @ 12484c0, architecture v0.2):
//   src/bridge/internal/protocol/protocol.gen.ts
//   src/bridge/internal/mission/mission.gen.ts
// TO BE REPLACED BY THE GENERATED TYPES (#8) once m1-bridge is merged into
// this branch: delete section A and re-export instead, e.g.
//   export type * from "../../bridge/internal/protocol/protocol.gen.ts";
//   export type { Compiled as MissionCompiled, Summary as MissionSummary, ... }
//     from "../../bridge/internal/mission/mission.gen.ts";
// tsc then flags any drift. tests/web/contract.test.ts checks the real
// protocol fixtures (tests/fixtures/protocol) against this UI.
//
// SECTION B holds UI-only view types (narrowed mission steps) built from
// section A by mission/view.ts.

// =====================================================================
// SECTION A: mirror of protocol.gen.ts
// =====================================================================

export const PROTOCOL_VERSION = 1;

export interface TapZone {
  corner: string;
  widthPx: number;
  heightPx: number;
  taps: number;
}
export interface IdleConfig {
  setupS: number;
  runS: number;
  countdownS: number;
}
export interface HelloConfig {
  idle: IdleConfig;
  admin?: { tapZone: TapZone };
}

export interface Health {
  t?: "health";
  core: "starting" | "up" | "down";
  code?: string;
  detail?: string;
  attempt?: number;
  of?: number;
  final?: boolean;
  kioskClient?: boolean;
}
export type HealthInfo = Omit<Health, "t">;

export interface Hello {
  t: "hello";
  protocol: number;
  build: string;
  config: HelloConfig;
  health: Health;
}

export interface Session {
  t?: "session";
  id: string;
  mission: string;
  mode: string;
  state: string;
  applied: string[];
  remaining: number;
}
export type SessionState = "none" | "starting" | "setup" | "armed" | "running" | "result" | "failed";
export type SessionMode = "visitor" | "docent" | "attract";
export type SessionInfo = Omit<Session, "t">;

export interface RunInfo {
  state: string; // "busy" | "idle"
  inits: number;
  settled?: Record<string, number>;
}
export interface PunchCard {
  n: number;
  text: string;
  fields: string[];
}

export interface AccState {
  sign: "P" | "M";
  digits: string; // 10 chars, MSD first
  value: number; // decoded by the bridge (ten's complement when M)
  carry: string;
  rep: number;
  prog: string; // 12 chars, programs 1..12
}
export interface MachineState {
  cycle: { pos: number; mode: "" | "P" | "A" | "C" | string };
  init: string;
  acc: Record<string, AccState>;
  mp?: { stage: string; dec: string; inff: string };
  ft?: Record<string, { arg: string; ring: number; add: number; sub: number; argff: number }>;
  ct: string;
  mult?: { stage: number; ff: string; r1: number; r3: number };
  div?: { place: number; prog: number; progff: string; flags: string };
}
/** RFC 7396 merge patch against MachineState (MachinePatch in the gen file). */
export type MergePatch = { [k: string]: unknown };

export interface State {
  t: "state";
  session?: Session | null;
  seq: number;
  machine: MachineState | null; // null when there is no session
  cards: PunchCard[];
  run: RunInfo;
}
export interface Frame {
  t: "frame";
  seq: number; // monotonic for the life of the bridge
  d: MergePatch;
}
export interface StepApplied {
  t: "step_applied";
  re?: number;
  step: string;
  assisted: boolean;
  remaining: number;
}
export interface SetupComplete {
  t: "setup_complete";
  re?: number;
  skipped: number;
}
export interface Run {
  t: "run";
  state: "busy" | "idle";
  inits: number;
  settled?: Record<string, number>;
}
export interface Checkpoint {
  t: "checkpoint";
  id: string;
}
export type ErrorCode = "BUSY" | "BAD_STATE" | "UNKNOWN_STEP" | "NOT_ALLOWED" | "BAD_MESSAGE";
export interface ErrorMsg {
  t: "error";
  re?: number;
  code: ErrorCode;
  message: string;
}
export interface Pong {
  t: "pong";
  re?: number;
}
export interface Punch {
  t: "punch";
  n: number;
  text: string;
  fields: string[];
}

export type ServerMsg =
  | Hello
  | State
  | Frame
  | (Session & { t: "session" })
  | StepApplied
  | SetupComplete
  | Run
  | Checkpoint
  | (Health & { t: "health" })
  | ErrorMsg
  | Pong
  | Punch;

// ---- client -> server whitelist (architecture 5.6)
export type ButtonName = "init" | "clear" | "read";
export type EndReason = "idle" | "menu" | "restart" | "done";
/** UI metric names (architecture 8.3); bridge-owned names are NOT_ALLOWED. */
export type MetricEv = "wrong_tap" | "step_done" | "speed" | "skip_to_answer" | "setup_skipped" | "idle_reset";

export type ClientMsg =
  | { t: "start_mission"; id?: number; mission: string; mode: SessionMode }
  | { t: "apply_step"; id?: number; step: string; assisted: boolean }
  | { t: "skip_setup"; id?: number }
  | { t: "button"; id?: number; b: ButtonName }
  | { t: "set_speed"; id?: number; speed: string }
  | { t: "end_session"; id?: number; reason: EndReason }
  | {
      t: "metric";
      id?: number;
      ev: MetricEv;
      mission?: string;
      step?: string;
      speed?: string;
      screen?: string;
      assisted?: boolean;
      n?: number;
    }
  | { t: "ping"; id?: number };

// =====================================================================
// SECTION A (cont.): mirror of mission.gen.ts
// =====================================================================

export interface MissionSummary {
  id: string;
  title: string;
  order: number;
  summary: string;
  buttons: string[];
  available: boolean;
  reason?: string;
}

export interface Hints {
  wrongFrom?: string;
  wrongTo?: string;
  wrongKind?: string;
  wrongSwitch?: string;
  wrongValue?: string;
  /** Canonical .e term (e.g. "a1.S", "1-2") -> text. */
  byTarget?: Record<string, string>;
}
export interface StepText {
  headline: string;
  body: string;
  more?: string;
  done: string;
  button?: string;
  hints: Hints;
}
export interface RawConfigItem {
  kind: string; // plug | switch
  from?: string;
  to?: string;
  cable?: string;
  switch?: string;
  value?: string;
  owner: string; // preset | step:<id> | withheld
}
export interface RawStep {
  id: string;
  kind: string;
  from?: string;
  to?: string;
  fromClass?: string;
  toClass?: string;
  cable?: string;
  switch?: string;
  value?: string;
  family?: string;
  choices?: string[];
  text: StepText;
}
export interface ContentCard {
  headline: string;
  body: string;
  more?: string;
  math?: string;
  takeaway?: string;
  takeawaySub?: string;
  buttons?: string[];
}
export interface Trigger {
  accProg?: { acc: string; program: number };
  run?: string; // idle | busy
}
export interface Caption {
  text: string;
  trigger: Trigger;
}
export interface PressCopy {
  press: number;
  headline: string;
  captions: Caption[];
}
export interface RunContent {
  before: { headline: string; sub?: string };
  presses: PressCopy[];
  tape: string; // "{a1} x {a1} = {a2}"
  extras: {
    afterPress: number;
    keepPressing: string;
    showResult: string;
    skipToAnswer: string;
    hint?: string;
    stopAt: string;
  };
}
export interface Content {
  briefing: ContentCard;
  plan: ContentCard;
  rest: ContentCard;
  run: RunContent;
  result: ContentCard;
}
export interface MissionCompiled {
  id: string;
  title: string;
  order: number;
  summary: string;
  ordered: boolean;
  config: RawConfigItem[];
  steps: RawStep[];
  counts: { presetCables: number; presetSwitches: number; stepCables: number; stepSwitches: number };
  units: string[];
  run: { buttons: string[]; speeds: string[]; defaultSpeed: string; watch: string[] };
  checkpoints: string[];
  result: string;
  content: Content;
  credits: string[];
}

// =====================================================================
// SECTION B: UI view types (narrowed by mission/view.ts)
// =====================================================================

export interface ConfigItemPlug {
  kind: "plug";
  from: string;
  to: string;
  cable: "data" | "program";
  owner: string;
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
  text: StepText;
}
export type MissionStep = PlugStep | SwitchStep;

export interface CompiledMission extends Omit<MissionCompiled, "config" | "steps" | "run"> {
  config: ConfigItem[];
  steps: MissionStep[];
  run: { buttons: ButtonName[]; speeds: string[]; defaultSpeed: string; watch: string[] };
}
