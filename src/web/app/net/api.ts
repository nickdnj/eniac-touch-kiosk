// Mission API (architecture 5.7). Same origin as the page.

import type { CompiledMission, MissionSummary } from "../protocol.ts";

export async function fetchMissions(): Promise<MissionSummary[]> {
  const r = await fetch("/api/missions", { cache: "no-store" });
  if (!r.ok) throw new Error(`missions: HTTP ${r.status}`);
  return (await r.json()) as MissionSummary[];
}

export async function fetchMission(id: string): Promise<CompiledMission> {
  const r = await fetch(`/api/missions/${encodeURIComponent(id)}`, { cache: "no-store" });
  if (!r.ok) throw new Error(`mission ${id}: HTTP ${r.status}`);
  return (await r.json()) as CompiledMission;
}
