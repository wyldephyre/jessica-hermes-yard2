import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { describe, it } from "node:test";

const CLI = "hermes/skills/yard2-desk/scripts/desk.mjs";

function run(args: string[], env: NodeJS.ProcessEnv = {}): Promise<{
  code: number | null;
  stdout: string;
  stderr: string;
}> {
  return new Promise((resolve) => {
    const child = spawn(process.execPath, [CLI, ...args], {
      env: { ...process.env, ...env },
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
    child.on("close", (code) => resolve({ code, stdout, stderr }));
  });
}

describe("yard2-desk Hermes skill CLI", () => {
  it("completes the five Cap musts in mock mode against the real desk", async () => {
    const result = await run(["demo", "--json"], { YARD2_DESK_MODE: "mock" });
    assert.equal(result.code, 0, result.stderr || result.stdout);
    const payload = JSON.parse(result.stdout);
    assert.equal(payload.mode, "mock");
    const ids = payload.musts.map((row: { id: string; ok: boolean }) => row.id);
    assert.deepEqual(ids, ["home", "acl", "gate", "lane", "coach"]);
    assert.ok(payload.musts.every((row: { ok: boolean }) => row.ok === true));
    assert.equal(payload.state.plane.name, "Jessica on Hermes");
    assert.equal(payload.state.lastLane.lane, "specialist");
    assert.ok(payload.state.coach.daily.checkedAt);
  });

  it("tells Cap the live desk is down instead of inventing state", async () => {
    const result = await run(["home", "--json"], {
      YARD2_DESK_MODE: "live",
      YARD2_DESK_URL: "http://127.0.0.1:1",
    });
    assert.notEqual(result.code, 0);
    const payload = JSON.parse(result.stdout);
    assert.equal(payload.ok, false);
    assert.match(payload.error, /desk not reachable/);
  });
});
