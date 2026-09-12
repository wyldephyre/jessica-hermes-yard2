import fs from "node:fs";
import path from "node:path";
import type { AclDecision, DirEntry, FileAclPolicy } from "./domain.ts";

function posixRel(rel: string): string {
  return rel.replace(/\\/g, "/").replace(/^\/+/, "").replace(/\/+$/, "");
}

function isInsideRoot(root: string, abs: string): boolean {
  const base = path.resolve(root);
  const target = path.resolve(abs);
  return target === base || target.startsWith(base + path.sep);
}

function realExisting(p: string): string {
  try {
    return fs.realpathSync(p);
  } catch {
    return path.resolve(p);
  }
}

export function isAllowlisted(rel: string, allow: string[]): boolean {
  const n = posixRel(rel);
  if (n === "" || n === ".") return true;
  return allow.some((entry) => {
    const a = posixRel(entry);
    return n === a || n.startsWith(a + "/");
  });
}

export function decidePath(policy: FileAclPolicy, rel: string): AclDecision {
  if (policy.mode === "none") {
    return { ok: false, reason: "mode-none" };
  }

  const rootReal = realExisting(policy.root);
  const abs = path.resolve(rootReal, rel);
  if (!isInsideRoot(rootReal, abs)) {
    return { ok: false, reason: "outside-root" };
  }

  const resolved = realExisting(abs);
  if (!isInsideRoot(rootReal, resolved)) {
    return { ok: false, reason: "outside-root" };
  }

  const relFromRoot = posixRel(path.relative(rootReal, resolved));
  if (policy.mode === "some" && !isAllowlisted(relFromRoot, policy.allow)) {
    return { ok: false, reason: "not-allowlisted" };
  }

  return { ok: true, abs: resolved, rel: relFromRoot };
}

export function listDir(policy: FileAclPolicy, rel: string): {
  decision: AclDecision;
  entries: DirEntry[] | null;
} {
  const decision = decidePath(policy, rel);
  if (!decision.ok) {
    return { decision, entries: null };
  }

  if (!fs.existsSync(decision.abs)) {
    return { decision: { ok: false, reason: "missing" }, entries: null };
  }

  const stat = fs.statSync(decision.abs);
  if (!stat.isDirectory()) {
    return { decision, entries: null };
  }

  const names = fs.readdirSync(decision.abs).sort((a, b) => a.localeCompare(b));
  const entries: DirEntry[] = names.map((name) => {
    const childRel = posixRel(path.join(decision.rel, name));
    const childAbs = path.join(decision.abs, name);
    const kind = fs.statSync(childAbs).isDirectory() ? "dir" : "file";
    const child = decidePath(policy, childRel);
    return { name, rel: childRel, kind, access: child.ok ? "allow" : "deny" };
  });

  return { decision, entries };
}

export function readFile(policy: FileAclPolicy, rel: string): {
  decision: AclDecision;
  text: string | null;
} {
  const decision = decidePath(policy, rel);
  if (!decision.ok) {
    return { decision, text: null };
  }
  if (!fs.existsSync(decision.abs) || !fs.statSync(decision.abs).isFile()) {
    return { decision: { ok: false, reason: "missing" }, text: null };
  }
  return { decision, text: fs.readFileSync(decision.abs, "utf8") };
}

export function writeFile(policy: FileAclPolicy, rel: string, content: string): AclDecision {
  const decision = decidePath(policy, rel);
  if (!decision.ok) {
    return decision;
  }
  fs.mkdirSync(path.dirname(decision.abs), { recursive: true });
  fs.writeFileSync(decision.abs, content, "utf8");
  return decision;
}
