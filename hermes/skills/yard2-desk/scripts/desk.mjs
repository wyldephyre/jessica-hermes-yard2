#!/usr/bin/env node
import { spawn } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { setTimeout as delay } from "node:timers/promises";

const here = path.dirname(fileURLToPath(import.meta.url));
const jsonOut = process.argv.includes("--json");
const argv = process.argv.slice(2).filter((arg) => arg !== "--json");
const MODE = process.env.YARD2_DESK_MODE === "mock" ? "mock" : "live";
const LIVE_URL = (process.env.YARD2_DESK_URL ?? "http://127.0.0.1:3344").replace(/\/$/, "");

function fail(message, code = 1) {
  const err = new Error(message);
  err.exitCode = code;
  throw err;
}

function findRepoRoot() {
  if (process.env.YARD2_REPO) return path.resolve(process.env.YARD2_REPO);
  let dir = path.resolve(here);
  for (let i = 0; i < 10; i += 1) {
    if (fs.existsSync(path.join(dir, "src/desk.ts")) && fs.existsSync(path.join(dir, "src/domain.ts"))) {
      return dir;
    }
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return null;
}

async function waitForState(url) {
  for (let i = 0; i < 40; i += 1) {
    try {
      const res = await fetch(`${url}/api/state`);
      if (res.ok) return;
    } catch {
      // desk not bound yet
    }
    await delay(150);
  }
  throw new Error(`desk did not start at ${url}`);
}

async function startMock() {
  const root = findRepoRoot();
  if (!root) {
    throw new Error("mock mode needs the jessica-hermes-yard2 checkout (src/desk.ts). Set YARD2_REPO or use live mode.");
  }
  const iron = fs.mkdtempSync(path.join(os.tmpdir(), "yard2-skill-"));
  fs.cpSync(path.join(root, "fixtures/iron"), iron, { recursive: true });
  const port = 3400 + Math.floor(Math.random() * 199);
  const child = spawn(process.execPath, ["--import", "tsx", path.join(root, "src/desk.ts")], {
    cwd: root,
    env: {
      ...process.env,
      DESK_PORT: String(port),
      FILE_ACL_MODE: "some",
      FILE_ACL_ROOT: iron,
      FILE_ACL_ALLOW: "public,notes",
      ACTIVE_PROFILE: "cap",
    },
    stdio: ["ignore", "pipe", "pipe"],
  });
  const url = `http://127.0.0.1:${port}`;
  try {
    await waitForState(url);
  } catch (err) {
    child.kill("SIGTERM");
    throw err;
  }
  return {
    url,
    async stop() {
      child.kill("SIGTERM");
      await delay(200);
      if (child.exitCode === null) child.kill("SIGKILL");
    },
  };
}

async function connect() {
  if (MODE === "mock") return startMock();
  return {
    url: LIVE_URL,
    async stop() {},
  };
}

async function getState(url) {
  const res = await fetch(`${url}/api/state`);
  const text = await res.text();
  if (!res.ok) throw new Error(`GET /api/state failed (${res.status})`);
  return JSON.parse(text);
}

async function postAction(url, action) {
  const res = await fetch(`${url}/api/action`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(action),
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`POST /api/action failed (${res.status}): ${text}`);
  return JSON.parse(text);
}

function print(text, payload) {
  if (jsonOut) {
    console.log(JSON.stringify(payload));
    return;
  }
  console.log(text);
}

function renderHome(state) {
  const listing = (state.files.listing ?? [])
    .map((entry) => `${entry.name}:${entry.access}`)
    .join(" ");
  const pending = state.gates.filter((gate) => gate.status === "pending");
  const lane = state.lastLane
    ? `${state.lastLane.lane} ${state.lastLane.model} earned=${state.lastLane.earned}`
    : "none";
  return [
    `${state.plane.name}`,
    `home ${state.plane.home}`,
    `jessica ${state.plane.jessica.status}`,
    `oauth ${state.plane.oauth}`,
    `acl ${state.acl.mode}`,
    `files ${state.files.cwd || "/"} ${(state.files.denyReason ?? listing) || "empty"}`,
    `gates pending ${pending.length}`,
    `lane ${lane}`,
    `coach ${state.coach.daily.objective}`,
    `checked ${state.coach.daily.checkedAt ?? "no"}`,
  ].join("\n");
}

function renderGates(state) {
  if (state.gates.length === 0) return "gates none";
  return state.gates
    .map((gate) => `${gate.id} ${gate.status} ${gate.kind} ${gate.summary}`)
    .join("\n");
}

function usage() {
  return [
    "yard2-desk",
    "  home",
    "  acl none|some|all",
    "  list [path]",
    "  read <path>",
    "  write <path> <content>",
    "  gates",
    "  approve <id>",
    "  deny <id>",
    "  lane <task> [tokens] [reason]",
    "  coach-one",
    "  demo",
    "live: YARD2_DESK_URL (default http://127.0.0.1:3344)",
    "mock: YARD2_DESK_MODE=mock from the yard2 checkout",
  ].join("\n");
}

async function runDemo(url) {
  const musts = [];
  let state = await getState(url);
  musts.push({
    id: "home",
    ok: state.plane.name === "Jessica on Hermes" && state.plane.home === "yard2-desk",
    detail: `${state.plane.name} / ${state.plane.home}`,
  });

  state = await postAction(url, { type: "acl.set-mode", mode: "some" });
  const secrets = (state.files.listing ?? []).find((entry) => entry.name === "secrets");
  state = await postAction(url, { type: "acl.set-mode", mode: "all" });
  state = await postAction(url, { type: "files.read", path: "secrets/do-not-read.txt" });
  const allRead = Boolean(state.files.preview?.text.includes("ACL demo only"));
  state = await postAction(url, { type: "acl.set-mode", mode: "none" });
  state = await postAction(url, { type: "files.list", path: "" });
  const noneDenied = state.files.denyReason === "mode-none";
  state = await postAction(url, { type: "acl.set-mode", mode: "some" });
  musts.push({
    id: "acl",
    ok: secrets?.access === "deny" && allRead && noneDenied && state.acl.mode === "some",
    detail: "none/some/all",
  });

  state = await postAction(url, {
    type: "files.write",
    path: "notes/from-skill.txt",
    content: "gated skill write",
  });
  const writeGate = state.gates.find((gate) => gate.kind === "file.write" && gate.status === "pending");
  if (!writeGate) {
    musts.push({ id: "gate", ok: false, detail: "missing file.write gate" });
  } else {
    state = await postAction(url, { type: "gate.decide", id: writeGate.id, decision: "approved" });
    const decided = state.gates.find((gate) => gate.id === writeGate.id);
    state = await postAction(url, { type: "files.read", path: "notes/from-skill.txt" });
    musts.push({
      id: "gate",
      ok: decided?.status === "approved" && state.files.preview?.text === "gated skill write",
      detail: writeGate.id,
    });
  }

  state = await postAction(url, { type: "lane.route", task: "titles", tokensEstimate: 1200 });
  const bulk = state.lastLane?.lane === "super-grok" && state.lastLane?.earned === false;
  state = await postAction(url, {
    type: "lane.route",
    task: "titles",
    tokensEstimate: 9000,
    specialistReason: "skill-escalate",
  });
  const waiting = state.lastLane?.lane === "super-grok";
  const pendingLane = state.gates.find(
    (gate) => gate.kind === "lane.specialist" && gate.status === "pending" && gate.specialistReason === "skill-escalate",
  );
  if (!pendingLane) {
    musts.push({ id: "lane", ok: false, detail: "missing specialist gate" });
  } else {
    state = await postAction(url, { type: "gate.decide", id: pendingLane.id, decision: "approved" });
    state = await postAction(url, {
      type: "lane.route",
      task: "titles",
      tokensEstimate: 9000,
      specialistReason: "skill-escalate",
    });
    musts.push({
      id: "lane",
      ok: bulk && waiting && state.lastLane?.lane === "specialist" && state.lastLane?.earned === true,
      detail: state.lastLane?.reason ?? "lane",
    });
  }

  state = await postAction(url, { type: "coach.check-daily" });
  musts.push({
    id: "coach",
    ok: Boolean(state.coach.daily.checkedAt),
    detail: state.coach.daily.objective,
  });

  return { mode: MODE, musts, state };
}

async function dispatch(url, cmd, rest) {
  if (cmd === "home" || cmd === undefined) {
    const state = await getState(url);
    print(renderHome(state), { ok: true, mode: MODE, command: "home", state });
    return;
  }
  if (cmd === "acl") {
    const mode = rest[0];
    if (mode !== "none" && mode !== "some" && mode !== "all") {
      fail("acl needs none, some, or all");
    }
    const state = await postAction(url, { type: "acl.set-mode", mode });
    print(renderHome(state), { ok: true, mode: MODE, command: "acl", state });
    return;
  }
  if (cmd === "list") {
    const state = await postAction(url, { type: "files.list", path: rest[0] ?? "" });
    print(renderHome(state), { ok: true, mode: MODE, command: "list", state });
    return;
  }
  if (cmd === "read") {
    if (!rest[0]) fail("read needs a path");
    const state = await postAction(url, { type: "files.read", path: rest[0] });
    const preview = state.files.preview?.text ?? state.files.denyReason ?? "no preview";
    print(`${renderHome(state)}\npreview\n${preview}`, { ok: true, mode: MODE, command: "read", state });
    return;
  }
  if (cmd === "write") {
    if (!rest[0] || rest.length < 2) fail("write needs a path and content");
    const state = await postAction(url, {
      type: "files.write",
      path: rest[0],
      content: rest.slice(1).join(" "),
    });
    print(renderGates(state), { ok: true, mode: MODE, command: "write", state });
    return;
  }
  if (cmd === "gates") {
    const state = await getState(url);
    print(renderGates(state), { ok: true, mode: MODE, command: "gates", state });
    return;
  }
  if (cmd === "approve" || cmd === "deny") {
    if (!rest[0]) fail(`${cmd} needs a gate id`);
    const state = await postAction(url, {
      type: "gate.decide",
      id: rest[0],
      decision: cmd === "approve" ? "approved" : "denied",
    });
    print(renderGates(state), { ok: true, mode: MODE, command: cmd, state });
    return;
  }
  if (cmd === "lane") {
    if (!rest[0]) fail("lane needs a task");
    const tokens = Number(rest[1]);
    const tokensEstimate = Number.isFinite(tokens) ? tokens : 1200;
    const reasonParts = Number.isFinite(tokens) ? rest.slice(2) : rest.slice(1);
    const specialistReason = reasonParts.join(" ").trim() || undefined;
    const state = await postAction(url, { type: "lane.route", task: rest[0], tokensEstimate, specialistReason });
    const line = `${state.lastLane.lane} ${state.lastLane.model} earned=${state.lastLane.earned}\n${state.lastLane.reason}`;
    print(`${line}\n${renderGates(state)}`, { ok: true, mode: MODE, command: "lane", state });
    return;
  }
  if (cmd === "coach-one") {
    const state = await postAction(url, { type: "coach.check-daily" });
    print(`checked ${state.coach.daily.checkedAt}\n${state.coach.daily.objective}`, {
      ok: true,
      mode: MODE,
      command: "coach-one",
      state,
    });
    return;
  }
  if (cmd === "demo") {
    const payload = await runDemo(url);
    const passed = payload.musts.filter((row) => row.ok).length;
    const lines = [
      ...payload.musts.map((row) => `MUST ${row.id} ${row.ok ? "PASS" : "FAIL"} ${row.detail}`),
      `${passed}/${payload.musts.length}`,
    ];
    print(lines.join("\n"), payload);
    if (passed < payload.musts.length) process.exitCode = 1;
    return;
  }
  if (cmd === "help" || cmd === "-h" || cmd === "--help") {
    print(usage(), { ok: true, command: "help", usage: usage() });
    return;
  }
  fail(`${usage()}\nunknown command: ${cmd}`);
}

const cmd = argv[0];
if (cmd === "help" || cmd === "-h" || cmd === "--help") {
  print(usage(), { ok: true, command: "help", usage: usage() });
  process.exit(0);
}

const session = await connect();
try {
  await dispatch(session.url, cmd, argv.slice(1));
} catch (err) {
  const message = err instanceof Error ? err.message : "desk-error";
  const unreachable = /fetch|ECONNREFUSED|did not start|NetworkError/i.test(message);
  const shown =
    MODE === "live" && unreachable
      ? `desk not reachable at ${LIVE_URL}. Start it with npm start, or set YARD2_DESK_MODE=mock from the repo.`
      : message;
  if (jsonOut) {
    console.log(JSON.stringify({ ok: false, error: shown, mode: MODE }));
  } else {
    console.error(shown);
  }
  process.exitCode = err instanceof Error && err.exitCode ? err.exitCode : 1;
} finally {
  await session.stop();
}
