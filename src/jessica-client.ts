import { loadConfig } from "./config.ts";
import type { JessicaBriefing, JessicaEvent, JessicaHealth } from "./domain.ts";

const TIMEOUT_MS = 2500;

async function jessicaFetch(base: string, pathname: string, init?: RequestInit): Promise<Response> {
  const url = new URL(pathname, base.endsWith("/") ? base : `${base}/`);
  return fetch(url, { ...init, signal: AbortSignal.timeout(TIMEOUT_MS) });
}

function baseUrl(): string | null {
  return loadConfig().jessicaBaseUrl;
}

export async function jessicaHealth(): Promise<JessicaHealth> {
  const base = baseUrl();
  if (!base) {
    return { ok: false, status: "unconfigured" };
  }
  try {
    const res = await jessicaFetch(base, "health");
    if (res.ok) return { ok: true, status: "online", code: res.status };
    return { ok: false, status: "degraded", code: res.status };
  } catch {
    return { ok: false, status: "offline" };
  }
}

export async function jessicaBriefing(): Promise<JessicaBriefing> {
  const base = baseUrl();
  if (!base) {
    return { ok: false, text: "Jessica URL is unset. This public slice stays local." };
  }
  try {
    const res = await jessicaFetch(base, "briefing");
    if (!res.ok) {
      return { ok: false, text: `Jessica briefing returned ${res.status}.` };
    }
    const text = await res.text();
    return { ok: true, text: text.slice(0, 2000) };
  } catch {
    return { ok: false, text: "Jessica briefing is unreachable from this desk." };
  }
}

export async function askJessica(query: string): Promise<{ ok: boolean; text: string }> {
  const base = baseUrl();
  if (!base) {
    return { ok: false, text: "Jessica URL is unset. Ask stays on this desk." };
  }
  try {
    const res = await jessicaFetch(base, "query", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ query }),
    });
    const text = await res.text();
    return { ok: res.ok, text: text.slice(0, 2000) };
  } catch {
    return { ok: false, text: "Jessica query failed. Desk stays up." };
  }
}

export async function notifyJessica(event: JessicaEvent): Promise<{ ok: boolean }> {
  const base = baseUrl();
  if (!base) return { ok: false };
  try {
    const res = await jessicaFetch(base, "event", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(event),
    });
    return { ok: res.ok };
  } catch {
    return { ok: false };
  }
}
