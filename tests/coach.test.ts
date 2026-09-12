import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildCoach, checkDaily, fireAt, isoWeekStart, WEEKLY_PROMPTS } from "../src/coach.ts";

describe("coach voice hooks", () => {
  it("keeps one daily objective and a check timestamp", () => {
    const noon = new Date("2026-09-12T17:00:00.000Z");
    const start = buildCoach(noon);
    assert.equal(start.daily.kind, "daily-objective");
    assert.equal(start.daily.checkedAt, null);
    const checked = checkDaily(start, noon);
    assert.equal(checked.daily.checkedAt, noon.toISOString());
  });

  it("FIRE work and break split on the cadence", () => {
    const start = new Date("2026-09-12T17:00:00.000Z");
    const work = fireAt(new Date(start.getTime() + 10 * 60 * 1000), start, 50, 10);
    const rest = fireAt(new Date(start.getTime() + 52 * 60 * 1000), start, 50, 10);
    assert.equal(work.phase, "work");
    assert.equal(rest.phase, "break");
    assert.match(rest.nudge, /Stand up/);
  });

  it("weekly review is four entrepreneur prompts, not a SideCoach clone", () => {
    const week = isoWeekStart(new Date("2026-09-12T17:00:00.000Z"));
    assert.equal(week, "2026-09-07");
    assert.equal(WEEKLY_PROMPTS.length, 4);
    assert.equal(WEEKLY_PROMPTS.includes("What actually shipped?"), true);
  });
});
