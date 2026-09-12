export type AclMode = "none" | "some" | "all";

export type FileAclPolicy = {
  mode: AclMode;
  root: string;
  allow: string[];
};

export type AclDenyReason =
  | "mode-none"
  | "outside-root"
  | "not-allowlisted"
  | "missing";

export type AclDecision =
  | { ok: true; abs: string; rel: string }
  | { ok: false; reason: AclDenyReason };

export type DirEntry = {
  name: string;
  rel: string;
  kind: "file" | "dir";
  access: "allow" | "deny";
};

export type GateKind = "file.write" | "lane.specialist";
export type GateStatus = "pending" | "approved" | "denied";

export type Gate = {
  id: string;
  kind: GateKind;
  summary: string;
  status: GateStatus;
  createdAt: string;
  decidedAt?: string;
  path?: string;
  content?: string;
  specialistReason?: string;
};

export type LaneId = "super-grok" | "specialist";

export type LaneRequest = {
  task: string;
  tokensEstimate: number;
  specialistReason?: string;
  approvedGateId?: string;
};

export type LaneDecision = {
  lane: LaneId;
  model: string;
  reason: string;
  oauth: "xai-super-grok";
  earned: boolean;
};

export type HarnessId = "hermes-local" | "jessica-remote" | "cursor-cloud";

export type Profile = {
  id: string;
  label: string;
  harness: HarnessId;
};

export type DailyObjective = {
  kind: "daily-objective";
  date: string;
  objective: string;
  checkedAt: string | null;
};

export type FireCadence = {
  kind: "fire-cadence";
  phase: "work" | "break";
  workMin: number;
  breakMin: number;
  startedAt: string;
  remainingSec: number;
  nudge: string;
};

export type WeeklyReview = {
  kind: "weekly-review";
  weekOf: string;
  prompts: string[];
};

export type CoachState = {
  daily: DailyObjective;
  fire: FireCadence;
  weekly: WeeklyReview;
};

export type JessicaHealth = {
  ok: boolean;
  status: "online" | "degraded" | "offline" | "unconfigured";
  code?: number;
};

export type JessicaBriefing = {
  ok: boolean;
  text: string;
};

export type JessicaEvent =
  | { type: "desk.opened" }
  | { type: "gate.decided"; id: string; decision: "approved" | "denied" }
  | { type: "lane.routed"; lane: LaneId }
  | { type: "acl.listed"; path: string };

export type Activity = {
  at: string;
  text: string;
};

export type PlaneSnapshot = {
  name: "Jessica on Hermes";
  home: "yard2-desk";
  jessica: JessicaHealth;
  oauth: "configured" | "missing";
};

export type FilePanel = {
  cwd: string;
  listing: DirEntry[] | null;
  denyReason: AclDenyReason | null;
  preview: { rel: string; text: string } | null;
};

export type DeskState = {
  plane: PlaneSnapshot;
  acl: FileAclPolicy;
  files: FilePanel;
  gates: Gate[];
  lastLane: LaneDecision | null;
  profiles: Profile[];
  activeProfile: Profile;
  coach: CoachState;
  activity: Activity[];
};

export type DeskAction =
  | { type: "acl.set-mode"; mode: AclMode }
  | { type: "files.list"; path: string }
  | { type: "files.read"; path: string }
  | { type: "files.write"; path: string; content: string }
  | { type: "gate.decide"; id: string; decision: "approved" | "denied" }
  | {
      type: "lane.route";
      task: string;
      tokensEstimate: number;
      specialistReason?: string;
    }
  | { type: "profile.select"; id: string }
  | { type: "coach.set-objective"; objective: string }
  | { type: "coach.check-daily" }
  | { type: "coach.fire-reset" };

export const ACL_MODES: readonly AclMode[] = ["none", "some", "all"];
export const SUPER_GROK_MODEL = "grok-4";
export const SPECIALIST_MODEL = "specialist";
export const SPECIALIST_TOKEN_FLOOR = 8000;
export const DEFAULT_PROFILES: readonly Profile[] = [
  { id: "cap", label: "Cap desk", harness: "hermes-local" },
  { id: "jessica", label: "Jessica remote", harness: "jessica-remote" },
  { id: "cloud", label: "Cursor Cloud", harness: "cursor-cloud" },
];
