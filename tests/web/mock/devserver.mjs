// DEV/TEST ONLY. Serves src/web like the bridge's --dev mode does (bundle
// app/main.ts on each /app.js request; static files otherwise), plus the
// MockBridge on /ws and /api/missions, plus /__mock/* control endpoints used
// by the Playwright tests. Never part of a release.
//
//   cd src/web && npm run dev        -> http://127.0.0.1:8740/
//   PORT=8750 npm run dev            -> another port
//   MOCK_IDLE=6,9,3 npm run dev      -> short idle timeouts (setupS,runS,countdownS)
//   MOCK_ORIGINAL_UI=1 MOCK_PIN=2468 npm run dev
//                                    -> the Explore tour tile, and a staff PIN for S12/S13
//                                       (no PIN unless MOCK_PIN is set: S12 says none is set)

import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { dirname, extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";
import { MockBridge, MISSIONS, defaultConfig } from "./bridge.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const webRoot = join(here, "..", "..", "..", "src", "web");
const require = createRequire(join(webRoot, "package.json"));
const esbuild = require("esbuild");
const { WebSocketServer } = require("ws");

const PORT = Number(process.env.PORT || 8740);
const HOST = process.env.HOST || "127.0.0.1";

const TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".svg": "image/svg+xml",
  ".woff2": "font/woff2",
  ".json": "application/json",
  ".txt": "text/plain; charset=utf-8",
};

export function startDevServer({ port = PORT, host = HOST } = {}) {
  const bridge = new MockBridge();
  const admin = { token: "", fails: 0, lockedUntil: 0 };
  if (process.env.MOCK_IDLE) {
    const [setupS, runS, countdownS] = process.env.MOCK_IDLE.split(",").map(Number);
    bridge.config = { ...defaultConfig(), idle: { setupS, runS, countdownS } };
  }

  const json = (res, code, body) => {
    res.writeHead(code, { "content-type": "application/json", "cache-control": "no-store" });
    res.end(JSON.stringify(body));
  };
  const readBody = (req) =>
    new Promise((resolve) => {
      let b = "";
      req.on("data", (c) => (b += c));
      req.on("end", () => {
        try {
          resolve(b ? JSON.parse(b) : {});
        } catch {
          resolve({});
        }
      });
    });

  const server = createServer(async (req, res) => {
    const url = new URL(req.url, `http://${req.headers.host}`);
    const p = url.pathname;
    try {
      if (p === "/app.js") {
        const r = await esbuild.build({
          entryPoints: [join(webRoot, "app", "main.ts")],
          bundle: true,
          format: "esm",
          target: "es2022",
          write: false,
          sourcemap: "inline",
          define: { __DEV__: "true" },
          logLevel: "silent",
        });
        res.writeHead(200, { "content-type": TYPES[".js"], "cache-control": "no-store" });
        return res.end(r.outputFiles[0].contents);
      }
      if (p === "/api/missions") return json(res, 200, bridge.missionsList());
      const mid = p.startsWith("/api/missions/") ? decodeURIComponent(p.slice("/api/missions/".length)) : "";
      if (MISSIONS[mid]) return json(res, 200, MISSIONS[mid]);
      if (p.startsWith("/api/missions/")) return json(res, 404, { error: "not found" });
      if (p === "/healthz") return json(res, 200, { status: bridge.health.core === "up" ? "ok" : "down", mock: true });

      // ---- admin API (architecture 8.4 v1; internal/admin is the real one) ----
      if (p.startsWith("/api/admin/")) {
        const body = req.method === "POST" ? await readBody(req) : {};
        const fail = (code, c, extra = {}) => json(res, code, { error: { code: c, message: c, ...extra } });
        if (req.method !== "POST") return fail(405, "METHOD");
        bridge.log.push({ at: Date.now(), t: `admin:${p.slice(11)}` });
        const authed = admin.token && req.headers.authorization === `Bearer ${admin.token}`;
        switch (p) {
          case "/api/admin/login":
            if (!process.env.MOCK_PIN) return fail(503, "NO_PIN");
            if (Date.now() < admin.lockedUntil) return fail(429, "LOCKED", { retryAfterS: 60 });
            if (body.pin !== process.env.MOCK_PIN) {
              admin.fails++;
              if (admin.fails >= 5) {
                admin.fails = 0;
                admin.lockedUntil = Date.now() + 60_000;
                return fail(429, "LOCKED", { retryAfterS: 60 });
              }
              return fail(401, "BAD_PIN");
            }
            admin.fails = 0;
            admin.token = "f".repeat(32);
            return json(res, 200, { token: admin.token, expiresInS: 600 });
          case "/api/admin/logout":
            admin.token = "";
            res.writeHead(204);
            return res.end();
          case "/api/admin/restart-core":
            if (!authed) return fail(401, "TOKEN");
            bridge.stopAttract();
            bridge.endSession();
            return json(res, 200, { ok: true });
          case "/api/admin/original-ui":
            if (!authed) return fail(401, "TOKEN");
            if (!bridge.config.originalUi?.available) return fail(409, "UNAVAILABLE", { reason: bridge.config.originalUi?.reason ?? "disabled" });
            bridge.stopAttract();
            bridge.endSession();
            return json(res, 202, { ok: true, mode: "interactive", id: "3f9a1c2e" });
        }
        return fail(404, "NOT_FOUND");
      }

      // ---- test control (dev only) ----
      if (p.startsWith("/__mock/")) {
        const body = req.method === "POST" ? await readBody(req) : {};
        switch (p) {
          case "/__mock/log":
            return json(res, 200, bridge.log);
          case "/__mock/reset":
            bridge.reset();
            Object.assign(admin, { token: "", fails: 0, lockedUntil: 0 });
            return json(res, 200, { ok: true });
          case "/__mock/fault":
            bridge.fault(body);
            return json(res, 200, { ok: true });
          case "/__mock/drop":
            bridge.drop(body.ms ?? 7000);
            return json(res, 200, { ok: true });
          case "/__mock/config":
            bridge.setConfig(body);
            return json(res, 200, { ok: true });
          case "/__mock/missions":
            bridge.missionsAvailable = body.available !== false;
            return json(res, 200, { ok: true });
          case "/__mock/speed":
            bridge.speedMs = { ...bridge.speedMs, ...body };
            return json(res, 200, { ok: true });
          case "/__mock/sieve":
            bridge.sieveMs = { ...bridge.sieveMs, ...body };
            return json(res, 200, { ok: true });
          case "/__mock/hop":
            bridge.hopMs = body.ms ?? bridge.hopMs;
            return json(res, 200, { ok: true });
          case "/__mock/frames":
            bridge.framesPaused = body.paused === true;
            return json(res, 200, { ok: true });
          case "/__mock/attract":
            bridge.attractHoldMs = body.holdMs ?? bridge.attractHoldMs;
            return json(res, 200, { ok: true });
          case "/__mock/session":
            return json(res, 200, { session: bridge.sessionInfo(), stdin: bridge.session?.stdin ?? [], machine: bridge.session?.machine ?? null });
        }
        return json(res, 404, { error: "unknown control" });
      }

      // ---- static files from src/web ----
      let rel = p === "/" ? "/index.html" : p;
      const file = normalize(join(webRoot, rel));
      if (!file.startsWith(webRoot) || rel.includes("node_modules") || rel.startsWith("/scripts")) {
        res.writeHead(404);
        return res.end();
      }
      const st = await stat(file).catch(() => null);
      if (!st || !st.isFile()) {
        res.writeHead(404);
        return res.end("not found");
      }
      res.writeHead(200, { "content-type": TYPES[extname(file)] || "application/octet-stream", "cache-control": "no-store" });
      res.end(await readFile(file));
    } catch (e) {
      res.writeHead(500, { "content-type": "text/plain" });
      res.end(String(e?.message || e));
    }
  });

  const wss = new WebSocketServer({ noServer: true });
  server.on("upgrade", (req, socket, head) => {
    const url = new URL(req.url, `http://${req.headers.host}`);
    if (url.pathname !== "/ws" || Date.now() < bridge.refuseUntil) {
      socket.destroy();
      return;
    }
    wss.handleUpgrade(req, socket, head, (ws) => bridge.accept(ws));
  });

  return new Promise((resolve) => {
    server.listen(port, host, () => {
      resolve({
        url: `http://${host}:${port}/`,
        bridge,
        close: () =>
          new Promise((r) => {
            bridge.close();
            for (const c of wss.clients) c.terminate();
            server.close(() => r());
          }),
      });
    });
  });
}

const isMain = process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];
if (isMain) {
  const { url } = await startDevServer();
  console.log(`ENIAC kiosk UI (MOCK bridge, dev only): ${url}`);
  console.log("Open in Chrome at 1920x1080 with DevTools touch emulation.");
}
