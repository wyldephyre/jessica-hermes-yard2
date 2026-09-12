import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, it } from "node:test";
import { loadConfig } from "../src/config.ts";
import { createStore, parseAction } from "../src/store.ts";

function testConfig(root = "fixtures/iron") {
  return loadConfig({
    FILE_ACL_MODE: "some",
    FILE_ACL_ROOT: root,
    FILE_ACL_ALLOW: "public,notes",
    ACTIVE_PROFILE: "cap",
  });
}

function tempIron(): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "yard2-iron-"));
  fs.cpSync("fixtures/iron", dir, { recursive: true });
  return dir;
}

describe("desk store", () => {
  it("routes cap to hermes-local and can switch harness", async () => {
    const store = createStore(testConfig(), () => new Date("2026-09-12T17:00:00.000Z"));
    const start = await store.snapshot();
    assert.equal(start.plane.name, "Jessica on Hermes");
    assert.equal(start.activeProfile.harness, "hermes-local");
    const next = await store.apply({ type: "profile.select", id: "jessica" });
    assert.equal(next.activeProfile.harness, "jessica-remote");
  });

  it("queues file writes for Cap and applies them only after approve", async () => {
    const store = createStore(testConfig(tempIron()), () => new Date("2026-09-12T17:00:00.000Z"));
    const queued = await store.apply({
      type: "files.write",
      path: "notes/from-test.txt",
      content: "gated write",
    });
    const pending = queued.gates.find((g) => g.kind === "file.write" && g.status === "pending");
    assert.ok(pending);
    const approved = await store.apply({ type: "gate.decide", id: pending.id, decision: "approved" });
    const gate = approved.gates.find((g) => g.id === pending.id);
    assert.equal(gate?.status, "approved");
    const read = await store.apply({ type: "files.read", path: "notes/from-test.txt" });
    assert.equal(read.files.preview?.text, "gated write");
  });

  it("rejects unknown actions at the boundary", () => {
    assert.equal(parseAction({ type: "soul.dump" }), null);
    assert.equal(parseAction({ type: "acl.set-mode", mode: "everything" }), null);
  });
});
