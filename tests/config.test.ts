import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { loadConfig, oauthStatus } from "../src/config.ts";

describe("env boundary", () => {
  it("marks OAuth configured without echoing the token", () => {
    const env = {
      XAI_OAUTH_TOKEN: "dummy-not-a-real-token",
      FILE_ACL_ROOT: "fixtures/iron",
    };
    const cfg = loadConfig(env);
    assert.equal(cfg.xaiOAuthConfigured, true);
    assert.equal(oauthStatus(env), "configured");
    assert.equal(JSON.stringify(cfg).includes("dummy-not-a-real-token"), false);
  });

  it("defaults ACL to some on the iron fixture", () => {
    const cfg = loadConfig({ FILE_ACL_ROOT: "fixtures/iron" });
    assert.equal(cfg.acl.mode, "some");
    assert.deepEqual(cfg.acl.allow, ["public", "notes"]);
    assert.equal(oauthStatus({}), "missing");
  });
});
