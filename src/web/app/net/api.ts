// Mission API (architecture 5.7) and the staff admin API (8.4 v1,
// docs/original-ui-switch.md 6.1). Same origin as the page.

import type { AdminErrorBody, CompiledMission, MissionCompiled, MissionSummary } from "../protocol.ts";
import { toView } from "../mission/view.ts";
import type { Board, ScoreEntry } from "../game/logic.ts";

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

/** An admin call's outcome. code NETWORK: the bridge did not answer. */
export type AdminResult<T> = ({ ok: true } & T) | { ok: false; status: number; code: AdminErrorBody["code"] | "NETWORK"; retryAfterS?: number; reason?: string };

async function adminPost<T>(path: string, body: unknown, token?: string): Promise<AdminResult<T>> {
  let r: Response;
  try {
    r = await fetch(`/api/admin/${path}`, {
      method: "POST",
      cache: "no-store",
      headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: JSON.stringify(body),
    });
  } catch {
    return { ok: false, status: 0, code: "NETWORK" };
  }
  if (r.ok) {
    const data = r.status === 204 ? {} : ((await r.json().catch(() => ({}))) as T);
    return { ok: true, ...(data as T) };
  }
  const e = ((await r.json().catch(() => null)) as { error?: AdminErrorBody } | null)?.error;
  return { ok: false, status: r.status, code: e?.code ?? "INTERNAL", retryAfterS: e?.retryAfterS, reason: e?.reason };
}

/** POST /api/admin/login: a token for 10 min, or BAD_PIN / LOCKED / NO_PIN. */
export function adminLogin(pin: string): Promise<AdminResult<{ token: string; expiresInS: number }>> {
  return adminPost("login", { pin });
}

export function adminLogout(token: string): Promise<AdminResult<object>> {
  return adminPost("logout", {}, token);
}

/** restart-core (200) or original-ui (202, the request id). TOKEN: log in again. */
export function adminAction(token: string, action: "restart-core" | "original-ui"): Promise<AdminResult<{ mode?: string; id?: string }>> {
  return adminPost(action, {}, token);
}

/** The high-score lists of a game mission (Gunnery), from the bridge; null when it cannot be reached. */
export async function fetchScores(mission: string): Promise<Board | null> {
  try {
    const r = await fetch(`/api/scores/${encodeURIComponent(mission)}`, { cache: "no-store" });
    return r.ok ? ((await r.json()) as Board) : null;
  } catch {
    return null;
  }
}

/** Saves a finished round; returns the new lists, "name" when the bridge will not carry that name, or null when it failed. */
export async function postScore(mission: string, entry: Omit<ScoreEntry, "at">): Promise<Board | "name" | null> {
  try {
    const r = await fetch(`/api/scores/${encodeURIComponent(mission)}`, {
      method: "POST",
      cache: "no-store",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(entry),
    });
    if (r.status === 422) return "name";
    return r.ok ? ((await r.json()) as Board) : null;
  } catch {
    return null;
  }
}
