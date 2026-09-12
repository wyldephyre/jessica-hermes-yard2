import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { askJessica, jessicaBriefing, jessicaHealth, notifyJessica } from "../src/jessica-client.ts";

describe("jessica client", () => {
  it("stays local when JESSICA_BASE_URL is unset", async () => {
    delete process.env.JESSICA_BASE_URL;
    const health = await jessicaHealth();
    const briefing = await jessicaBriefing();
    const ask = await askJessica("ping");
    const notify = await notifyJessica({ type: "desk.opened" });
    assert.equal(health.status, "unconfigured");
    assert.equal(briefing.ok, false);
    assert.equal(ask.ok, false);
    assert.equal(notify.ok, false);
  });
});
