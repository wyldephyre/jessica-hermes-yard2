import { spawn, spawnSync } from "node:child_process";
import { setTimeout as delay } from "node:timers/promises";

const PORT = 3399;
const BASE = `http://127.0.0.1:${PORT}`;

function secretLeak(text) {
  return /sk-[A-Za-z0-9]{8,}|Bearer [A-Za-z0-9._-]+|WEBHOOK_SECRET=|OAUTH_TOKEN=|OAUTH_CLIENT_SECRET=/i.test(
    text,
  );
}

async function json(method, path, body) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: body ? { "content-type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  if (secretLeak(text)) {
    throw new Error(`secret-shaped text leaked from ${path}`);
  }
  return { status: res.status, body: JSON.parse(text) };
}

async function waitForDesk(child) {
  for (let i = 0; i < 40; i++) {
    if (child.exitCode !== null) {
      throw new Error(`desk exited ${child.exitCode}`);
    }
    try {
      const res = await fetch(`${BASE}/api/state`);
      if (res.ok) return;
    } catch {
      // desk not bound yet
    }
    await delay(150);
  }
  throw new Error("desk did not start");
}

const child = spawn(process.execPath, ["--import", "tsx", "src/desk.ts"], {
  env: {
    ...process.env,
    DESK_PORT: String(PORT),
    FILE_ACL_MODE: "some",
    FILE_ACL_ROOT: "fixtures/iron",
    FILE_ACL_ALLOW: "public,notes",
  },
  stdio: ["ignore", "pipe", "pipe"],
});

let failed = false;
try {
  await waitForDesk(child);
  const html = await fetch(BASE).then((r) => r.text());
  if (!html.includes("File Explorer ACL") || !html.includes("Super Grok OAuth")) {
    throw new Error("desk HTML missing spotlight panels");
  }

  let state = (await json("GET", "/api/state")).body;
  if (state.plane.name !== "Jessica on Hermes") throw new Error("control plane missing");
  if (state.acl.mode !== "some") throw new Error("expected ACL some");
  const secrets = state.files.listing.find((e) => e.name === "secrets");
  if (secrets.access !== "deny") throw new Error("secrets should be deny in mode some");

  state = (await json("POST", "/api/action", { type: "files.read", path: "secrets/do-not-read.txt" })).body;
  if (state.files.preview) throw new Error("secrets read leaked in mode some");

  state = (await json("POST", "/api/action", { type: "acl.set-mode", mode: "all" })).body;
  state = (await json("POST", "/api/action", { type: "files.read", path: "secrets/do-not-read.txt" })).body;
  if (!state.files.preview?.text.includes("ACL demo only")) throw new Error("mode all should read secrets fixture");

  state = (await json("POST", "/api/action", { type: "acl.set-mode", mode: "none" })).body;
  state = (await json("POST", "/api/action", { type: "files.list", path: "" })).body;
  if (state.files.denyReason !== "mode-none") throw new Error("mode none should deny list");

  state = (await json("POST", "/api/action", { type: "acl.set-mode", mode: "some" })).body;
  state = (await json("POST", "/api/action", {
    type: "lane.route",
    task: "titles",
    tokensEstimate: 1200,
  })).body;
  if (state.lastLane.lane !== "super-grok") throw new Error("bulk path must be super-grok");

  state = (await json("POST", "/api/action", {
    type: "lane.route",
    task: "titles",
    tokensEstimate: 9000,
    specialistReason: "verify-escalation",
  })).body;
  if (state.lastLane.lane !== "super-grok") throw new Error("unearned specialist must stay on super-grok");
  const pending = state.gates.find((g) => g.specialistReason === "verify-escalation" && g.status === "pending");
  if (!pending) throw new Error("missing specialist gate");

  state = (await json("POST", "/api/action", { type: "gate.decide", id: pending.id, decision: "approved" })).body;
  state = (await json("POST", "/api/action", {
    type: "lane.route",
    task: "titles",
    tokensEstimate: 9000,
    specialistReason: "verify-escalation",
  })).body;
  if (state.lastLane.lane !== "specialist" || !state.lastLane.earned) {
    throw new Error("approved specialist should be earned");
  }

  state = (await json("POST", "/api/action", { type: "coach.check-daily" })).body;
  if (!state.coach.daily.checkedAt) throw new Error("daily check missing");
  if (state.coach.weekly.prompts.length !== 4) throw new Error("weekly review prompts missing");
  if (state.coach.fire.kind !== "fire-cadence") throw new Error("FIRE hook missing");

  const skill = spawnSync(
    process.execPath,
    ["hermes/skills/yard2-desk/scripts/desk.mjs", "demo", "--json"],
    {
      encoding: "utf8",
      env: { ...process.env, YARD2_DESK_MODE: "live", YARD2_DESK_URL: BASE },
    },
  );
  if (secretLeak(skill.stdout) || secretLeak(skill.stderr)) {
    throw new Error("secret-shaped text leaked from skill demo");
  }
  if (skill.status !== 0) {
    throw new Error(`skill live demo failed: ${skill.stdout} ${skill.stderr}`);
  }
  const demo = JSON.parse(skill.stdout);
  if (!demo.musts || demo.musts.some((row) => !row.ok)) {
    throw new Error("skill live demo missed a Cap must");
  }

  console.log("verify.mjs: desk HTTP path passed");
  console.log("verify.mjs: Hermes skill live demo passed");
} catch (err) {
  failed = true;
  console.error(err);
} finally {
  child.kill("SIGTERM");
  await delay(300);
  if (!child.killed) child.kill("SIGKILL");
}

if (failed) process.exit(1);
