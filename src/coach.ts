import type { CoachState, DailyObjective, FireCadence, WeeklyReview } from "./domain.ts";

export const WEEKLY_PROMPTS: readonly string[] = [
  "What actually shipped?",
  "What did you spend that did not come back?",
  "Who is waiting on you?",
  "What is next week's one bet?",
];

export const DEFAULT_OBJECTIVE =
  "Demo File Explorer ACL and Super Grok OAuth on this desk.";

function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export function isoWeekStart(d: Date): string {
  const day = d.getUTCDay() || 7;
  const monday = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  monday.setUTCDate(monday.getUTCDate() - (day - 1));
  return isoDate(monday);
}

export function fireAt(
  now: Date,
  startedAt: Date,
  workMin: number,
  breakMin: number,
): Pick<FireCadence, "phase" | "remainingSec" | "nudge"> {
  const cycleSec = (workMin + breakMin) * 60;
  const elapsed = Math.max(0, Math.floor((now.getTime() - startedAt.getTime()) / 1000));
  const into = elapsed % cycleSec;
  const workSec = workMin * 60;
  if (into < workSec) {
    return {
      phase: "work",
      remainingSec: workSec - into,
      nudge: "Stay on the one objective.",
    };
  }
  return {
    phase: "break",
    remainingSec: cycleSec - into,
    nudge: "Stand up. Water. Then back.",
  };
}

export function buildCoach(now: Date, existing?: CoachState): CoachState {
  const date = isoDate(now);
  const daily: DailyObjective =
    existing && existing.daily.date === date
      ? existing.daily
      : {
          kind: "daily-objective",
          date,
          objective: existing?.daily.objective ?? DEFAULT_OBJECTIVE,
          checkedAt: null,
        };

  const startedAt = existing?.fire.startedAt ?? now.toISOString();
  const workMin = existing?.fire.workMin ?? 50;
  const breakMin = existing?.fire.breakMin ?? 10;
  const tick = fireAt(now, new Date(startedAt), workMin, breakMin);
  const fire: FireCadence = {
    kind: "fire-cadence",
    phase: tick.phase,
    workMin,
    breakMin,
    startedAt,
    remainingSec: tick.remainingSec,
    nudge: tick.nudge,
  };

  const weekOf = isoWeekStart(now);
  const weekly: WeeklyReview =
    existing && existing.weekly.weekOf === weekOf
      ? existing.weekly
      : { kind: "weekly-review", weekOf, prompts: [...WEEKLY_PROMPTS] };

  return { daily, fire, weekly };
}

export function checkDaily(coach: CoachState, now: Date): CoachState {
  const next = buildCoach(now, coach);
  return {
    ...next,
    daily: { ...next.daily, checkedAt: now.toISOString() },
  };
}

export function setObjective(coach: CoachState, objective: string, now: Date): CoachState {
  const next = buildCoach(now, coach);
  return {
    ...next,
    daily: { ...next.daily, objective: objective.trim() || DEFAULT_OBJECTIVE, checkedAt: null },
  };
}

export function resetFire(coach: CoachState, now: Date): CoachState {
  const next = buildCoach(now, coach);
  return {
    ...next,
    fire: { ...next.fire, startedAt: now.toISOString(), ...fireAt(now, now, next.fire.workMin, next.fire.breakMin) },
  };
}
