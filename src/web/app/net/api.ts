// Mission API (architecture 5.7). Same origin as the page.

import type { CompiledMission, MissionCompiled, MissionSummary } from "../protocol.ts";
import { toView } from "../mission/view.ts";

export async function fetchMissions(): Promise<MissionSummary[]> {
  const r = await fetch("/api/missions", { cache: "no-store" });
  if (!r.ok) throw new Error(`missions: HTTP ${r.status}`);
  return (await r.json()) as MissionSummary[];
}

export async function fetchMission(id: string): Promise<CompiledMission> {
  const r = await fetch(`/api/missions/${encodeURIComponent(id)}`, { cache: "no-store" });
  if (!r.ok) throw new Error(`mission ${id}: HTTP ${r.status}`);
  return toView((await r.json()) as MissionCompiled);
}
