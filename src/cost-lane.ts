import type { Gate, LaneDecision, LaneRequest } from "./domain.ts";
import { SPECIALIST_MODEL, SPECIALIST_TOKEN_FLOOR, SUPER_GROK_MODEL } from "./domain.ts";

export function specialistEarned(req: LaneRequest, gates: readonly Gate[]): boolean {
  const reason = req.specialistReason?.trim();
  if (!reason) return false;
  if (req.tokensEstimate < SPECIALIST_TOKEN_FLOOR) return false;

  if (req.approvedGateId) {
    return gates.some(
      (gate) =>
        gate.id === req.approvedGateId &&
        gate.kind === "lane.specialist" &&
        gate.status === "approved" &&
        gate.specialistReason === reason,
    );
  }

  return gates.some(
    (gate) =>
      gate.kind === "lane.specialist" &&
      gate.status === "approved" &&
      gate.specialistReason === reason,
  );
}

export function routeLane(req: LaneRequest, gates: readonly Gate[] = []): LaneDecision {
  if (specialistEarned(req, gates)) {
    return {
      lane: "specialist",
      model: SPECIALIST_MODEL,
      reason: `Cap approved specialist for: ${req.specialistReason?.trim()}`,
      oauth: "xai-super-grok",
      earned: true,
    };
  }

  const wantsSpecialist = Boolean(req.specialistReason?.trim());
  const heavy = req.tokensEstimate >= SPECIALIST_TOKEN_FLOOR;
  let reason = `Default Super Grok OAuth lane (${SUPER_GROK_MODEL}).`;
  if (wantsSpecialist && !heavy) {
    reason = `Specialist not earned: estimate ${req.tokensEstimate} is under ${SPECIALIST_TOKEN_FLOOR} tokens.`;
  } else if (wantsSpecialist && heavy) {
    reason = "Specialist not earned: waiting on Cap gate.";
  }

  return {
    lane: "super-grok",
    model: SUPER_GROK_MODEL,
    reason,
    oauth: "xai-super-grok",
    earned: false,
  };
}
