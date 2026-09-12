import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const MUSTS = ["home", "acl", "gate", "lane", "coach"];
const CLI = path.resolve("hermes/skills/yard2-desk/scripts/desk.mjs");
const requireTarget = process.argv.includes("--require-target");

function score(payload) {
  const rows = Array.isArray(payload?.musts) ? payload.musts : [];
  const passed = MUSTS.filter((id) => rows.some((row) => row && row.id === id && row.ok === true));
  return { passed: passed.length, target: MUSTS.length, ids: passed };
}

function emptyMetric(note, seconds = 0) {
  return {
    metric: "musts_via_skill",
    passed: 0,
    target: MUSTS.length,
    seconds,
    note,
    ids: [],
  };
}

function runCli() {
  return new Promise((resolve) => {
    const started = Date.now();
    const child = spawn(process.execPath, [CLI, "demo", "--json"], {
      env: { ...process.env, YARD2_DESK_MODE: "mock" },
      stdio: ["ignore", "pipe", "pipe"],
    });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (chunk) => {
      stdout += chunk;
    });
    child.stderr.on("data", (chunk) => {
      stderr += chunk;
    });
    child.on("error", (err) => {
      resolve({
        ...emptyMetric(`spawn-error:${err.message}`, (Date.now() - started) / 1000),
        exit: 1,
      });
    });
    child.on("close", (code) => {
      const seconds = (Date.now() - started) / 1000;
      if (code !== 0) {
        resolve({ ...emptyMetric(`cli-exit:${code}`, seconds), stderr: stderr.trim(), exit: code });
        return;
      }
      try {
        const payload = JSON.parse(stdout);
        resolve({ ...score(payload), metric: "musts_via_skill", seconds, note: payload.mode ?? "ok", exit: 0 });
      } catch {
        resolve({ ...emptyMetric("invalid-json", seconds), exit: 1 });
      }
    });
  });
}

const result = fs.existsSync(CLI) ? await runCli() : emptyMetric("cli-missing");
console.log(JSON.stringify(result));
if (requireTarget && result.passed < result.target) {
  process.exit(1);
}
