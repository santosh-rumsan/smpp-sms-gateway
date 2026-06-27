import smpp from "smpp";

import type { ApiClient } from "../api-client";
import {
  InvalidMessageFormatError,
  SMPPDeliveryReceipt,
  UnsupportedDeliveryStatusError,
} from "./delivery-receipts";

export interface SMPPConfig {
  deviceId: string;
  host: string;
  port: number;
  systemId: string;
  password: string;
}

const RECONNECT_DELAY_MS = 10_000;

export class SMPPGateway {
  private session: any;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private isShuttingDown = false;
  isConnected = false;

  constructor(
    private readonly config: SMPPConfig,
    private readonly apiClient: ApiClient,
    private readonly onConnect?: () => void,
    private readonly onDisconnect?: () => void,
  ) {}

  async connect(): Promise<void> {
    console.log(
      `[${this.config.deviceId}] Connecting to ${this.config.host}:${this.config.port}...`,
    );
    await this.createSession();
    this.setupReconnection();
    this.setupMessageHandler();
  }

  async sendMessage(
    source: string,
    destination: string,
    content: string,
  ): Promise<{ messageId: string; commandStatus: number }> {
    if (!this.isConnected) {
      throw new Error(
        `SMPP Gateway ${this.config.deviceId} is not connected.`,
      );
    }

    return new Promise((resolve, reject) => {
      this.session.submit_sm(
        {
          registered_delivery: 1,
          source_addr: source,
          destination_addr: destination,
          short_message: content,
        },
        (pdu: any) => {
          if (pdu.command_status === 0) {
            console.log(
              `[${this.config.deviceId}] Message sent: ${pdu.message_id}`,
            );
            resolve({
              messageId: pdu.message_id,
              commandStatus: pdu.command_status,
            });
          } else {
            console.error(
              `[${this.config.deviceId}] Send failed: status ${pdu.command_status}`,
            );
            reject(
              new Error(`Failed to send message: ${pdu.command_status}`),
            );
          }
        },
      );
    });
  }

  shutdown(): void {
    this.isShuttingDown = true;
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.session) {
      try {
        this.session.close();
        console.log(`[${this.config.deviceId}] Session closed.`);
      } catch (err) {
        console.error(`[${this.config.deviceId}] Error closing session:`, err);
      }
    }
    this.isConnected = false;
  }

  private createSession(): Promise<void> {
    const { host, port, systemId, password } = this.config;

    return new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error(`[${this.config.deviceId}] Connection timed out`));
      }, 15_000);

      this.session = smpp.connect(
        {
          url: `smpp://${host}:${port}`,
          auto_enquire_link_period: 10000,
          debug: false,
        },
        () => {
          console.log(
            `[${this.config.deviceId}] Connected, binding transceiver...`,
          );
          this.session.bind_transceiver(
            { system_id: systemId, password },
            (pdu: any) => {
              clearTimeout(timeout);
              if (pdu.command_status !== 0) {
                console.error(
                  `[${this.config.deviceId}] Bind failed: ${pdu.command_status}`,
                );
                reject(
                  new Error(`Bind failed: ${pdu.command_status}`),
                );
                return;
              }
              console.log(
                `[${this.config.deviceId}] Bound as transceiver.`,
              );
              this.isConnected = true;
              resolve();
            },
          );
        },
      );

      this.session.on("error", (err: any) => {
        clearTimeout(timeout);
        reject(err);
      });
    });
  }

  private setupMessageHandler(): void {
    this.session.on("deliver_sm", async (pdu: any) => {
      const rawMessage = pdu.message_payload
        ? pdu.message_payload.message
        : pdu.short_message.message;

      if (pdu.esm_class === smpp.ESM_CLASS.MC_DELIVERY_RECEIPT) {
        try {
          const receipt = SMPPDeliveryReceipt.parse(rawMessage);
          console.log(
            `[${this.config.deviceId}] Delivery receipt: ${receipt.messageId} -> ${receipt.status}`,
          );
          await this.apiClient.updateMessageStatus(
            receipt.messageId,
            receipt.status,
          );
        } catch (err) {
          if (
            err instanceof InvalidMessageFormatError ||
            err instanceof UnsupportedDeliveryStatusError
          ) {
            console.warn(
              `[${this.config.deviceId}] Unsupported delivery receipt: ${rawMessage}`,
            );
          }
        }
      } else {
        console.log(
          `[${this.config.deviceId}] Incoming SMS: ${pdu.source_addr} -> ${pdu.destination_addr}`,
        );
        try {
          await this.apiClient.saveIncomingMessage({
            sourceAddr: pdu.source_addr,
            destinationAddr: pdu.destination_addr,
            content: rawMessage,
            deviceId: this.config.deviceId,
          });
        } catch (err) {
          console.error(
            `[${this.config.deviceId}] Failed to save incoming message:`,
            err,
          );
        }
      }
    });
  }

  private setupReconnection(): void {
    this.session.on("error", (err: any) => {
      console.error(
        `[${this.config.deviceId}] Session error: ${err.message}`,
      );
    });

    this.session.socket.on("close", () => {
      if (this.isShuttingDown) return;

      if (this.isConnected) {
        this.isConnected = false;
        console.warn(
          `[${this.config.deviceId}] Connection lost. Reconnecting in ${RECONNECT_DELAY_MS / 1000}s...`,
        );
        this.onDisconnect?.();
      }

      this.scheduleReconnect();
    });
  }

  private scheduleReconnect(): void {
    if (this.reconnectTimer || this.isShuttingDown) return;

    this.reconnectTimer = setTimeout(async () => {
      this.reconnectTimer = null;
      if (this.isShuttingDown) return;

      console.log(`[${this.config.deviceId}] Attempting reconnect...`);
      try {
        try { this.session?.close(); } catch {}
        await this.createSession();
        this.setupReconnection();
        this.setupMessageHandler();
        console.log(`[${this.config.deviceId}] Reconnected successfully.`);
        this.onConnect?.();
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        console.warn(
          `[${this.config.deviceId}] Reconnect failed: ${msg}. Retrying in ${RECONNECT_DELAY_MS / 1000}s...`,
        );
        this.scheduleReconnect();
      }
    }, RECONNECT_DELAY_MS);
  }
}
