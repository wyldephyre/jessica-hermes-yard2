import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadConfig } from "./config.ts";
import { createStore, parseAction } from "./store.ts";

const here = path.dirname(fileURLToPath(import.meta.url));
const publicDir = path.resolve(here, "..", "public");

function send(res: http.ServerResponse, status: number, body: unknown, type = "application/json"): void {
  const payload = typeof body === "string" ? body : JSON.stringify(body);
  res.writeHead(status, {
    "content-type": `${type}; charset=utf-8`,
    "cache-control": "no-store",
  });
  res.end(payload);
}

function readBody(req: http.IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on("data", (chunk) => chunks.push(Buffer.from(chunk)));
    req.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    req.on("error", reject);
  });
}

export function startDesk(env: NodeJS.ProcessEnv = process.env): http.Server {
  const config = loadConfig(env);
  const store = createStore(config);

  const server = http.createServer(async (req, res) => {
    const url = new URL(req.url ?? "/", `http://127.0.0.1:${config.port}`);

    try {
      if (req.method === "GET" && (url.pathname === "/" || url.pathname === "/index.html")) {
        const html = fs.readFileSync(path.join(publicDir, "index.html"), "utf8");
        send(res, 200, html, "text/html");
        return;
      }

      if (req.method === "GET" && url.pathname === "/api/state") {
        send(res, 200, await store.snapshot());
        return;
      }

      if (req.method === "POST" && url.pathname === "/api/action") {
        const raw = await readBody(req);
        let parsed: unknown;
        try {
          parsed = JSON.parse(raw);
        } catch {
          send(res, 400, { error: "invalid-json" });
          return;
        }
        const action = parseAction(parsed);
        if (!action) {
          send(res, 400, { error: "invalid-action" });
          return;
        }
        send(res, 200, await store.apply(action));
        return;
      }

      send(res, 404, { error: "not-found" });
    } catch (err) {
      const message = err instanceof Error ? err.message : "desk-error";
      send(res, 500, { error: message });
    }
  });

  server.listen(config.port, () => {
    if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
      console.log(`Jessica on Hermes desk: http://127.0.0.1:${config.port}`);
    }
  });
  return server;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const server = startDesk();
  server.on("error", (err) => {
    console.error(err);
    process.exit(1);
  });
}
