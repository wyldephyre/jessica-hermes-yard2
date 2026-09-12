import path from "node:path";
import type { FileAclPolicy, AclMode } from "./domain.ts";
import { ACL_MODES } from "./domain.ts";

export type Config = {
  port: number;
  jessicaBaseUrl: string | null;
  hasJessicaSecret: boolean;
  xaiOAuthConfigured: boolean;
  acl: FileAclPolicy;
  activeProfile: string;
};

function parseMode(raw: string | undefined): AclMode {
  const value = (raw ?? "some").trim();
  if ((ACL_MODES as readonly string[]).includes(value)) {
    return value as AclMode;
  }
  return "some";
}

function parseAllow(raw: string | undefined): string[] {
  return (raw ?? "public,notes")
    .split(",")
    .map((part) => part.trim().replace(/^\/+|\/+$/g, ""))
    .filter((part) => part.length > 0);
}

export function loadConfig(env: NodeJS.ProcessEnv = process.env): Config {
  const root = path.resolve(env.FILE_ACL_ROOT ?? path.join(process.cwd(), "fixtures", "iron"));
  return {
    port: Number(env.DESK_PORT ?? "3344") || 3344,
    jessicaBaseUrl: env.JESSICA_BASE_URL?.trim() || null,
    hasJessicaSecret: Boolean(env.JESSICA_WEBHOOK_SECRET?.trim()),
    xaiOAuthConfigured: Boolean(
      env.XAI_OAUTH_TOKEN?.trim() || env.XAI_OAUTH_CLIENT_ID?.trim(),
    ),
    acl: {
      mode: parseMode(env.FILE_ACL_MODE),
      root,
      allow: parseAllow(env.FILE_ACL_ALLOW),
    },
    activeProfile: env.ACTIVE_PROFILE?.trim() || "cap",
  };
}

export function oauthStatus(env: NodeJS.ProcessEnv = process.env): "configured" | "missing" {
  return loadConfig(env).xaiOAuthConfigured ? "configured" : "missing";
}
