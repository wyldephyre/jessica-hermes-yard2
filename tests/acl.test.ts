import assert from "node:assert/strict";
import path from "node:path";
import { describe, it } from "node:test";
import { decidePath, listDir, readFile } from "../src/acl.ts";
import type { FileAclPolicy } from "../src/domain.ts";

const root = path.resolve("fixtures/iron");

function policy(mode: FileAclPolicy["mode"]): FileAclPolicy {
  return { mode, root, allow: ["public", "notes"] };
}

describe("file explorer ACL", () => {
  it("mode none denies the public tree", () => {
    const decision = decidePath(policy("none"), "public/readme.txt");
    assert.equal(decision.ok, false);
    if (!decision.ok) assert.equal(decision.reason, "mode-none");
  });

  it("mode some allows public and notes, denies secrets", () => {
    const pub = readFile(policy("some"), "public/readme.txt");
    const notes = readFile(policy("some"), "notes/objective.txt");
    const secret = readFile(policy("some"), "secrets/do-not-read.txt");
    assert.equal(pub.decision.ok, true);
    assert.match(pub.text ?? "", /Public fixture/);
    assert.equal(notes.decision.ok, true);
    assert.equal(secret.decision.ok, false);
    if (!secret.decision.ok) assert.equal(secret.decision.reason, "not-allowlisted");
  });

  it("mode some lists root with secrets marked deny", () => {
    const { decision, entries } = listDir(policy("some"), "");
    assert.equal(decision.ok, true);
    assert.ok(entries);
    const secrets = entries.find((e) => e.name === "secrets");
    const pub = entries.find((e) => e.name === "public");
    assert.equal(secrets?.access, "deny");
    assert.equal(pub?.access, "allow");
  });

  it("mode all reads secrets still inside the iron root", () => {
    const secret = readFile(policy("all"), "secrets/do-not-read.txt");
    assert.equal(secret.decision.ok, true);
    assert.match(secret.text ?? "", /ACL demo only/);
  });

  it("blocks path escape", () => {
    const decision = decidePath(policy("all"), "../package.json");
    assert.equal(decision.ok, false);
    if (!decision.ok) assert.equal(decision.reason, "outside-root");
  });
});
