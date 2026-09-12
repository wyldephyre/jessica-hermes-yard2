import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { routeLane, specialistEarned } from "../src/cost-lane.ts";
import type { Gate } from "../src/domain.ts";
import { SPECIALIST_TOKEN_FLOOR } from "../src/domain.ts";

const approved: Gate = {
  id: "gate_9",
  kind: "lane.specialist",
  summary: "catalog-copy",
  status: "approved",
  createdAt: "2026-09-12T00:00:00.000Z",
  specialistReason: "catalog-copy",
};

describe("super grok cost lane", () => {
  it("defaults bulk work to Super Grok", () => {
    const decision = routeLane({ task: "titles", tokensEstimate: 1200 });
    assert.equal(decision.lane, "super-grok");
    assert.equal(decision.model, "grok-4");
    assert.equal(decision.oauth, "xai-super-grok");
    assert.equal(decision.earned, false);
  });

  it("does not escalate without a reason and a gate", () => {
    const decision = routeLane({
      task: "titles",
      tokensEstimate: SPECIALIST_TOKEN_FLOOR,
      specialistReason: "catalog-copy",
    });
    assert.equal(decision.lane, "super-grok");
    assert.match(decision.reason, /waiting on Cap gate/);
  });

  it("escalates only when the specialist is earned", () => {
    const req = {
      task: "titles",
      tokensEstimate: SPECIALIST_TOKEN_FLOOR,
      specialistReason: "catalog-copy",
      approvedGateId: "gate_9",
    };
    assert.equal(specialistEarned(req, [approved]), true);
    const decision = routeLane(req, [approved]);
    assert.equal(decision.lane, "specialist");
    assert.equal(decision.earned, true);
  });
});
