import { ApiClient, AuthError } from "./api-client";
import { MessagePoller } from "./poller";
import { startHttpServer } from "./server";
import { ConnectionManager } from "./smpp/connection-manager";

const API_URL = process.env.API_URL ?? "http://localhost:6061";
const API_KEY = process.env.API_KEY ?? "";
const HTTP_PORT = Number(process.env.HTTP_PORT ?? "6062");
const RETRY_DELAY_MS = 10_000;

if (!API_KEY) {
  console.error("API_KEY environment variable is required");
  process.exit(1);
}

const apiClient = new ApiClient(API_URL, API_KEY);
const connectionManager = new ConnectionManager(apiClient);
const poller = new MessagePoller(apiClient, connectionManager);

async function main() {
  console.log("Starting SMPP Gateway...");
  console.log(`API URL: ${API_URL}`);

  await connectionManager.start();
  poller.start();
  startHttpServer(connectionManager, HTTP_PORT);
}

async function shutdown() {
  console.log("Shutting down...");
  poller.stop();
  await connectionManager.shutdown();
  process.exit(0);
}

process.on("SIGTERM", () => void shutdown());
process.on("SIGINT", () => void shutdown());

process.on("uncaughtException", (err) => {
  console.error(`[Gateway] Uncaught exception: ${err.message}. Gateway continues running.`);
});

process.on("unhandledRejection", (reason) => {
  const msg = reason instanceof Error ? reason.message : String(reason);
  console.error(`[Gateway] Unhandled rejection: ${msg}. Gateway continues running.`);
});

async function startWithRetry() {
  while (true) {
    try {
      await main();
      return;
    } catch (err) {
      if (err instanceof AuthError) {
        console.error("\n" + "=".repeat(60));
        console.error("  ERROR: API Authentication Failed (401)");
        console.error("=".repeat(60));
        console.error(`\n  The SMPP gateway could not authenticate with the API.`);
        console.error(`  API URL: ${API_URL}\n`);
        console.error("  How to fix:");
        console.error("    1. Check that API_KEY is set in your .env file");
        console.error("    2. Verify the key matches one configured in the API");
        console.error("    3. Restart the gateway after updating the key\n");
        console.error("=".repeat(60) + "\n");
        process.exit(1);
      }
      const detail = err instanceof Error ? err.message : String(err);
      console.error(`[Gateway] Startup failed: ${detail}. Retrying in ${RETRY_DELAY_MS / 1000}s...`);
      await new Promise((r) => setTimeout(r, RETRY_DELAY_MS));
    }
  }
}

void startWithRetry();
