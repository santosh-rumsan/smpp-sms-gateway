import { Hono } from "hono";
import { cors } from "hono/cors";
import { serve } from "@hono/node-server";

import type { ConnectionManager } from "./smpp/connection-manager";

export function startHttpServer(
  connectionManager: ConnectionManager,
  port: number,
): void {
  const app = new Hono();

  app.use("*", cors());

  app.get("/health", (c) => {
    const gateways: Record<string, boolean> = {};
    for (const [id, gw] of connectionManager.getAllGateways()) {
      gateways[id] = gw.isConnected;
    }

    return c.json({
      ok: true,
      ts: Date.now(),
      gateways,
    });
  });

  serve({ fetch: app.fetch, port }, () => {
    console.log(`SMPP HTTP server listening on port ${port}`);
  });
}
