import { decidePath, listDir, readFile, writeFile } from "./acl.ts";
import { buildCoach, checkDaily, resetFire, setObjective } from "./coach.ts";
import { routeLane } from "./cost-lane.ts";
import { oauthStatus, type Config } from "./config.ts";
import { jessicaHealth } from "./jessica-client.ts";
import type {
  AclMode,
  DeskAction,
  DeskState,
  FilePanel,
  Gate,
  Profile,
} from "./domain.ts";
import { DEFAULT_PROFILES, SPECIALIST_TOKEN_FLOOR } from "./domain.ts";

export type Store = {
  snapshot(): Promise<DeskState>;
  apply(action: DeskAction): Promise<DeskState>;
};

function nowIso(now: Date): string {
  return now.toISOString();
}

function pickProfile(id: string): Profile {
  return DEFAULT_PROFILES.find((p) => p.id === id) ?? DEFAULT_PROFILES[0];
}

function emptyFiles(): FilePanel {
  return { cwd: "", listing: null, denyReason: null, preview: null };
}

export function createStore(config: Config, clock: () => Date = () => new Date()): Store {
  let acl = { ...config.acl, allow: [...config.acl.allow] };
  let files = emptyFiles();
  let gates: Gate[] = [
    {
      id: "gate_1",
      kind: "lane.specialist",
      summary: "Escalate catalog copy to specialist",
      status: "pending",
      createdAt: clock().toISOString(),
      specialistReason: "catalog-copy",
    },
  ];
  let lastLane: DeskState["lastLane"] = null;
  let activeProfile = pickProfile(config.activeProfile);
  let coach = buildCoach(clock());
  let activity: DeskState["activity"] = [
    { at: clock().toISOString(), text: "Desk opened. Jessica on Hermes, public slice only." },
  ];
  let gateSeq = 2;

  function note(text: string): void {
    activity = [{ at: nowIso(clock()), text }, ...activity].slice(0, 40);
  }

  function refreshFiles(rel: string): void {
    const { decision, entries } = listDir(acl, rel);
    if (!decision.ok) {
      files = { cwd: rel, listing: null, denyReason: decision.reason, preview: null };
      return;
    }
    files = {
      cwd: decision.rel,
      listing: entries,
      denyReason: null,
      preview: files.preview,
    };
  }

  refreshFiles("");

  async function snapshot(): Promise<DeskState> {
    coach = buildCoach(clock(), coach);
    const jessica = await jessicaHealth();
    return {
      plane: {
        name: "Jessica on Hermes",
        home: "yard2-desk",
        jessica,
        oauth: oauthStatus(),
      },
      acl: { ...acl, allow: [...acl.allow] },
      files: { ...files, listing: files.listing ? [...files.listing] : null },
      gates: gates.map((g) => ({ ...g })),
      lastLane,
      profiles: DEFAULT_PROFILES.map((p) => ({ ...p })),
      activeProfile: { ...activeProfile },
      coach,
      activity: [...activity],
    };
  }

  function enqueue(gate: Omit<Gate, "id" | "createdAt" | "status">): Gate {
    const created: Gate = {
      ...gate,
      id: `gate_${gateSeq}`,
      status: "pending",
      createdAt: nowIso(clock()),
    };
    gateSeq += 1;
    gates = [created, ...gates];
    note(`Gate ${created.id} pending: ${created.summary}`);
    return created;
  }

  async function apply(action: DeskAction): Promise<DeskState> {
    switch (action.type) {
      case "acl.set-mode": {
        acl = { ...acl, mode: action.mode };
        refreshFiles(files.cwd);
        note(`File ACL mode set to ${action.mode}.`);
        return snapshot();
      }
      case "files.list": {
        refreshFiles(action.path);
        note(`Listed ${action.path || "/"} under ACL ${acl.mode}.`);
        return snapshot();
      }
      case "files.read": {
        const { decision, text } = readFile(acl, action.path);
        if (!decision.ok || text === null) {
          files = { ...files, preview: null };
          note(`Read denied: ${action.path} (${decision.ok ? "missing" : decision.reason}).`);
          return snapshot();
        }
        files = { ...files, cwd: files.cwd, preview: { rel: decision.rel, text }, denyReason: null };
        note(`Read ${decision.rel}.`);
        return snapshot();
      }
      case "files.write": {
        const decision = decidePath(acl, action.path);
        if (!decision.ok) {
          note(`Write blocked by ACL: ${action.path} (${decision.reason}).`);
          return snapshot();
        }
        enqueue({
          kind: "file.write",
          summary: `Write ${action.path}`,
          path: action.path,
          content: action.content,
        });
        return snapshot();
      }
      case "gate.decide": {
        const gate = gates.find((g) => g.id === action.id);
        if (!gate || gate.status !== "pending") {
          note(`Gate ${action.id} is not pending.`);
          return snapshot();
        }
        const decided: Gate = {
          ...gate,
          status: action.decision,
          decidedAt: nowIso(clock()),
        };
        gates = gates.map((g) => (g.id === decided.id ? decided : g));
        if (action.decision === "approved" && decided.kind === "file.write" && decided.path && decided.content !== undefined) {
          const result = writeFile(acl, decided.path, decided.content);
          note(
            result.ok
              ? `Cap approved ${decided.id}. Wrote ${result.rel}.`
              : `Cap approved ${decided.id} but ACL blocked the write (${result.reason}).`,
          );
        } else {
          note(`Cap ${action.decision} ${decided.id}.`);
        }
        return snapshot();
      }
      case "lane.route": {
        const decision = routeLane(
          {
            task: action.task,
            tokensEstimate: action.tokensEstimate,
            specialistReason: action.specialistReason,
          },
          gates,
        );
        lastLane = decision;
        if (
          action.specialistReason?.trim() &&
          action.tokensEstimate >= SPECIALIST_TOKEN_FLOOR &&
          !decision.earned
        ) {
          const already = gates.some(
            (g) =>
              g.kind === "lane.specialist" &&
              g.status === "pending" &&
              g.specialistReason === action.specialistReason?.trim(),
          );
          if (!already) {
            enqueue({
              kind: "lane.specialist",
              summary: `Specialist for ${action.specialistReason.trim()}`,
              specialistReason: action.specialistReason.trim(),
            });
          }
        }
        note(`Lane ${decision.lane} (${decision.model}). ${decision.reason}`);
        return snapshot();
      }
      case "profile.select": {
        activeProfile = pickProfile(action.id);
        note(`Profile ${activeProfile.id} → ${activeProfile.harness}.`);
        return snapshot();
      }
      case "coach.set-objective": {
        coach = setObjective(coach, action.objective, clock());
        note(`Daily objective set: ${coach.daily.objective}`);
        return snapshot();
      }
      case "coach.check-daily": {
        coach = checkDaily(coach, clock());
        note("Daily one-objective check marked.");
        return snapshot();
      }
      case "coach.fire-reset": {
        coach = resetFire(coach, clock());
        note("FIRE cadence reset.");
        return snapshot();
      }
      default: {
        const _never: never = action;
        return _never;
      }
    }
  }

  return { snapshot, apply };
}

export function parseAction(input: unknown): DeskAction | null {
  if (!input || typeof input !== "object") return null;
  const obj = input as Record<string, unknown>;
  const type = obj.type;
  if (type === "acl.set-mode" && typeof obj.mode === "string") {
    if (obj.mode === "none" || obj.mode === "some" || obj.mode === "all") {
      return { type, mode: obj.mode as AclMode };
    }
  }
  if (type === "files.list" && typeof obj.path === "string") {
    return { type, path: obj.path };
  }
  if (type === "files.read" && typeof obj.path === "string") {
    return { type, path: obj.path };
  }
  if (type === "files.write" && typeof obj.path === "string" && typeof obj.content === "string") {
    return { type, path: obj.path, content: obj.content };
  }
  if (
    type === "gate.decide" &&
    typeof obj.id === "string" &&
    (obj.decision === "approved" || obj.decision === "denied")
  ) {
    return { type, id: obj.id, decision: obj.decision };
  }
  if (
    type === "lane.route" &&
    typeof obj.task === "string" &&
    typeof obj.tokensEstimate === "number" &&
    Number.isFinite(obj.tokensEstimate)
  ) {
    return {
      type,
      task: obj.task,
      tokensEstimate: obj.tokensEstimate,
      specialistReason: typeof obj.specialistReason === "string" ? obj.specialistReason : undefined,
    };
  }
  if (type === "profile.select" && typeof obj.id === "string") {
    return { type, id: obj.id };
  }
  if (type === "coach.set-objective" && typeof obj.objective === "string") {
    return { type, objective: obj.objective };
  }
  if (type === "coach.check-daily") return { type };
  if (type === "coach.fire-reset") return { type };
  return null;
}
