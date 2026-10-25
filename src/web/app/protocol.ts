// Websocket + mission API types for the kiosk UI.
//
// SECTION A re-exports the tygo-generated types, the source of truth (#8,
// architecture 5.3-5.9): src/bridge/internal/protocol/protocol.gen.ts and
// src/bridge/internal/mission/mission.gen.ts (`make protogen`). The aliases
// keep the UI's names; any drift between the Go types and the UI is a tsc
// error. tests/web/contract.test.ts checks the recorded protocol fixtures
// (tests/fixtures/protocol) against the UI's reducers.
//
// SECTION B holds UI-only view types (narrowed mission steps) built from
// section A by mission/view.ts.

import type * as P from "../../bridge/internal/protocol/protocol.gen.ts";
import type * as M from "../../bridge/internal/mission/mission.gen.ts";

// =====================================================================
// SECTION A: generated types (re-exported)
// =====================================================================

export { Version as PROTOCOL_VERSION } from "../../bridge/internal/protocol/protocol.gen.ts";

export type TapZone = P.TapZone;
export type IdleConfig = P.IdleConfig;
export type HelloConfig = P.HelloConfig;
export type Health = P.Health;
/** Health as the UI keeps it (kioskClient is informational only). */
export type HealthInfo = Omit<P.Health, "t" | "kioskClient"> & { kioskClient?: boolean };
export type Hello = P.Hello;
export type Session = P.Session;
export type SessionInfo = Omit<P.Session, "t">;
export type SessionState = "none" | "starting" | "setup" | "armed" | "running" | "result" | "failed";
export type SessionMode = P.StartMission["mode"];
export type RunInfo = P.RunInfo;
export type PunchCard = P.Card;
export type AccState = P.AccState;
export type MachineState = P.MachineState;
/** RFC 7396 merge patch against MachineState. */
export type MergePatch = P.MachinePatch & { [k: string]: unknown };
export type State = P.State;
export type Frame = P.Frame;
export type StepApplied = P.StepApplied;
export type SetupComplete = P.SetupComplete;
export type Aimed = P.Aimed;
export type Run = P.Run;
export type Checkpoint = P.Checkpoint;
export type ErrorMsg = P.Error;
export type ErrorCode = P.Error["code"];
export type Pong = P.Pong;
export type Punch = P.Punch;
export type Attract = P.Attract;
export type AttractInfo = Omit<P.Attract, "t" | "re">;
export type AttractPhase = P.Attract["phase"];
export type AttractLanding = P.AttractLanding;
export type OriginalUIConfig = P.OriginalUIConfig;
export type OriginalUIReply = P.OriginalUIReply;
export type AdminErrorBody = P.AdminErrorBody;

export type ServerMsg =
  | P.Hello
  | P.State
  | P.Frame
  | (P.Session & { t: "session" })
  | P.StepApplied
  | P.SetupComplete
  | P.Aimed
  | P.Run
  | P.Checkpoint
  | (P.Health & { t: "health" })
  | P.Error
  | P.Pong
  | P.Punch
  | (P.Attract & { t: "attract" })
  | P.OriginalUIReply;

export type ButtonName = P.Button["b"];
export type EndReason = P.EndSession["reason"];
export type MetricEv = P.Metric["ev"];
export type ClientMsg =
  | P.StartMission
  | P.ApplyStep
  | P.Aim
  | P.SkipSetup
  | P.Button
  | P.SetSpeed
  | P.EndSession
  | P.AttractStart
  | P.AttractStop
  | P.Metric
  | P.Ping
  | P.OriginalUI;

export type MissionSummary = M.Summary;
export type Hints = M.Hints;
export type StepText = M.StepText;
export type RawConfigItem = M.ConfigItem;
export type RawStep = M.CompiledStep;
export type ContentCard = M.Card;
export type Trigger = M.Trigger;
export type Caption = M.Caption;
export type PressCopy = M.PressCopy;
export type RunContent = M.RunContent;
export type Content = M.Content;
export type YourTurn = M.YourTurn;
export type MissionCompiled = M.Compiled;

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

export type CardPane = M.CardPane;
export type PlotSpec = M.Plot;
export type ReadContent = M.ReadContent;
export type LiveLine = M.LiveLine;
export type CardsCopy = M.CardsCopy;
export type PlotCopy = M.PlotCopy;

export interface CompiledMission extends Omit<MissionCompiled, "config" | "steps" | "run"> {
  config: ConfigItem[];
  steps: MissionStep[];
  run: {
    buttons: ButtonName[];
    speeds: string[];
    defaultSpeed: string;
    watch: string[];
    initOnce?: boolean;
    initAfter?: string;
    cards?: CardPane;
    plot?: PlotSpec;
  };
}
