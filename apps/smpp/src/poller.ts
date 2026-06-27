import { AuthError, type ApiClient } from "./api-client";
import type { ConnectionManager } from "./smpp/connection-manager";

export class MessagePoller {
  private interval: ReturnType<typeof setInterval> | null = null;
  private processing = false;

  constructor(
    private readonly apiClient: ApiClient,
    private readonly connectionManager: ConnectionManager,
    private readonly pollIntervalMs = 3000,
  ) {}

  start(): void {
    console.log(`Poller started (every ${this.pollIntervalMs}ms)`);
    this.interval = setInterval(() => void this.poll(), this.pollIntervalMs);
  }

  stop(): void {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }
  }

  private async poll(): Promise<void> {
    if (this.processing) return;
    this.processing = true;

    try {
      const pending = await this.apiClient.getPendingMessages();

      for (const msg of pending) {
        try {
          const gw = msg.deviceId
            ? this.connectionManager.getGateway(msg.deviceId)
            : this.findGatewayForMessage();

          if (!gw || !gw.isConnected) {
            console.warn(
              `No connected gateway for message ${msg.id} (device: ${msg.deviceId})`,
            );
            continue;
          }

          const result = await gw.sendMessage(
            msg.sourceAddr,
            msg.destinationAddr,
            msg.content,
          );

          await this.apiClient.markMessageSent(msg.id, result.messageId);
          console.log(
            `Message ${msg.id} sent via SMPP (smppId: ${result.messageId})`,
          );
        } catch (err) {
          const detail =
            err instanceof Error ? err.message : "Unknown error";
          console.error(`Failed to send message ${msg.id}:`, detail);
          await this.apiClient.markMessageFailed(msg.id, detail);
        }
      }
    } catch (err) {
      if (err instanceof AuthError) {
        console.error("Poller stopped: API authentication failed. Fix your API_KEY and restart.");
        this.stop();
        return;
      }
      const detail = err instanceof Error ? err.message : String(err);
      console.warn(`[Poller] API unreachable — ${detail}. Will retry next cycle.`);
    } finally {
      this.processing = false;
    }
  }

  private findGatewayForMessage() {
    for (const [, gw] of this.connectionManager.getAllGateways()) {
      if (gw.isConnected) return gw;
    }
    return undefined;
  }
}
