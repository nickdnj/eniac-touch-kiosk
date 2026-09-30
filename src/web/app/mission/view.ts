// Narrows the bridge's compiled mission (loose generated types with optional
// fields) into the UI's view types, rejecting anything the UI can't run.
// Pure; tested in tests/web/contract.test.ts.

import type { ButtonName, CompiledMission, ConfigItem, MissionCompiled, MissionStep } from "../protocol.ts";

export class MissionError extends Error {}

const cableOf = (c: string | undefined): "data" | "program" => (c === "program" ? "program" : "data");

export function toView(c: MissionCompiled): CompiledMission {
  if (!c || !Array.isArray(c.steps) || !Array.isArray(c.config) || !c.content || !c.run) throw new MissionError("malformed mission");
  const steps: MissionStep[] = c.steps.map((s) => {
    if (s.kind === "plug") {
      if (!s.from || !s.to) throw new MissionError(`step ${s.id}: plug without ends`);
      return { id: s.id, kind: "plug", from: s.from, to: s.to, fromClass: s.fromClass, toClass: s.toClass, cable: cableOf(s.cable), text: s.text };
    }
    if (s.kind === "switch") {
      if (!s.switch || s.value === undefined) throw new MissionError(`step ${s.id}: switch without value`);
      const choices = s.choices && s.choices.length ? s.choices : [s.value];
      if (!choices.includes(s.value)) throw new MissionError(`step ${s.id}: value not in choices`);
      return { id: s.id, kind: "switch", switch: s.switch, value: s.value, family: s.family, choices, text: s.text };
    }
    throw new MissionError(`step ${s.id}: unknown kind ${s.kind}`);
  });
  const config: ConfigItem[] = [];
  for (const i of c.config) {
    if (i.kind === "plug" && i.from && i.to) config.push({ kind: "plug", from: i.from, to: i.to, cable: cableOf(i.cable), owner: i.owner });
    else if (i.kind === "switch" && i.switch && i.value !== undefined) config.push({ kind: "switch", switch: i.switch, value: i.value, owner: i.owner });
  }
  const buttons = c.run.buttons.filter((b): b is ButtonName => b === "init" || b === "clear" || b === "read");
  return { ...c, steps, config, run: { ...c.run, buttons } };
}
