import { AuthError, type ApiClient } from "../api-client";
import { SMPPGateway, type SMPPConfig } from "./gateway";

interface DeviceConfig {
  id: string;
  name: string;
  smppHost: string;
  smppPort: number;
  smppSystemId: string;
  smppPassword: string;
  channels: { id: string; phoneNumber: string }[];
}

export class ConnectionManager {
  private gateways = new Map<string, SMPPGateway>();
  private deviceNames = new Map<string, string>();
  private refreshInterval: ReturnType<typeof setInterval> | null = null;
  private syncRetryTimer: ReturnType<typeof setTimeout> | null = null;
  private offlineCheckInterval: ReturnType<typeof setInterval> | null = null;
  private initialSyncDone = false;
  private hadDevices = false;
  private offlineSince = new Map<string, Date>();
  private alertSent = new Set<string>();
  private cachedSettings = { timeoutSeconds: 30, alertEmail: null as string | null };
  private settingsLastFetched = 0;

  constructor(private readonly apiClient: ApiClient) {}

  async start(): Promise<void> {
    await this.syncDevices();
    this.initialSyncDone = true;

    await this.fetchSettings();

    this.refreshInterval = setInterval(() => void this.syncWithRetry(), 60_000);

    this.offlineCheckInterval = setInterval(() => {
      void this.checkOfflineDevices();
    }, 10_000);
  }

  getGateway(deviceId: string): SMPPGateway | undefined {
    return this.gateways.get(deviceId);
  }

  getAllGateways(): Map<string, SMPPGateway> {
    return this.gateways;
  }

  async shutdown(): Promise<void> {
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
      this.refreshInterval = null;
    }
    if (this.syncRetryTimer) {
      clearTimeout(this.syncRetryTimer);
      this.syncRetryTimer = null;
    }
    if (this.offlineCheckInterval) {
      clearInterval(this.offlineCheckInterval);
      this.offlineCheckInterval = null;
    }

    for (const [id, gw] of this.gateways) {
      console.log(`Shutting down device ${id}...`);
      gw.shutdown();
      await this.apiClient.updateDeviceChannelStatus(id, false);
      await this.apiClient.updateGatewayStatus(id, false);
    }
    this.gateways.clear();
  }

  private async fetchSettings(): Promise<void> {
    try {
      const raw = await this.apiClient.getSettings();
      const timeout = parseInt(raw['offline_timeout_seconds'] ?? '', 10);
      this.cachedSettings = {
        timeoutSeconds: isNaN(timeout) ? 30 : timeout,
        alertEmail: raw['offline_alert_email'] ?? null,
      };
      this.settingsLastFetched = Date.now();
    } catch {
      // keep defaults
    }
  }

  private async checkOfflineDevices(): Promise<void> {
    if (Date.now() - this.settingsLastFetched > 60_000) {
      await this.fetchSettings();
    }

    if (!this.cachedSettings.alertEmail) return;

    const now = Date.now();
    const timeoutMs = this.cachedSettings.timeoutSeconds * 1000;

    for (const [id, gw] of this.gateways) {
      if (gw.isConnected) {
        this.offlineSince.delete(id);
        this.alertSent.delete(id);
      } else {
        if (!this.offlineSince.has(id)) {
          this.offlineSince.set(id, new Date());
        }
        const since = this.offlineSince.get(id)!.getTime();
        if (!this.alertSent.has(id) && now - since >= timeoutMs) {
          this.alertSent.add(id);
          try {
            await this.apiClient.sendOfflineAlert(id);
            console.log(`[Gateway] Offline alert sent for device ${id}`);
          } catch (err) {
            const detail = err instanceof Error ? err.message : String(err);
            console.error(`[Gateway] Failed to send offline alert for device ${id}: ${detail}`);
          }
        }
      }
    }
  }

  private async syncWithRetry(): Promise<void> {
    try {
      await this.syncDevices();
      // Cancel any pending retry timer on success
      if (this.syncRetryTimer) {
        clearTimeout(this.syncRetryTimer);
        this.syncRetryTimer = null;
      }
    } catch (err) {
      const detail = err instanceof Error ? err.message : String(err);
      console.warn(`[Gateway] Device sync failed: ${detail}. Retrying in 10s.`);
      if (!this.syncRetryTimer) {
        this.syncRetryTimer = setTimeout(() => {
          this.syncRetryTimer = null;
          void this.syncWithRetry();
        }, 10_000);
      }
    }
  }

  private async syncDevices(): Promise<void> {
    let devices: DeviceConfig[];
    try {
      devices = await this.apiClient.getDevices();
    } catch (err) {
      if (err instanceof AuthError) throw err;
      const detail = err instanceof Error ? err.message : String(err);
      console.error(`[Gateway] Failed to fetch devices: ${detail}`);
      throw err;
    }

    const activeIds = new Set(devices.map((d) => d.id));

    for (const [id, gw] of this.gateways) {
      if (!activeIds.has(id)) {
        console.log(`Device ${id} removed, disconnecting...`);
        gw.shutdown();
        this.gateways.delete(id);
        this.deviceNames.delete(id);
        await this.apiClient.updateDeviceChannelStatus(id, false);
        await this.apiClient.updateGatewayStatus(id, false);
      }
    }

    for (const device of devices) {
      if (this.gateways.has(device.id)) continue;

      const config: SMPPConfig = {
        deviceId: device.id,
        host: device.smppHost,
        port: device.smppPort,
        systemId: device.smppSystemId,
        password: device.smppPassword,
      };

      const gw = new SMPPGateway(
        config,
        this.apiClient,
        () => void this.onGatewayConnect(device.id),
        () => void this.onGatewayDisconnect(device.id),
      );
      this.gateways.set(device.id, gw);
      this.deviceNames.set(device.id, device.name);

      try {
        await gw.connect();
        console.log(`Device ${device.id} (${device.name}) connected.`);
        await this.apiClient.updateDeviceChannelStatus(device.id, true);
        await this.apiClient.updateGatewayStatus(device.id, true);
      } catch (err) {
        console.error(`Failed to connect device ${device.id}:`, err);
        await this.apiClient.updateDeviceChannelStatus(device.id, false);
        await this.apiClient.updateGatewayStatus(device.id, false);
      }
    }

    if (!this.initialSyncDone) {
      this.logConnectionSummary(devices);
    } else if (!this.hadDevices && devices.length > 0) {
      console.log(`\n[Gateway] New devices detected! ${devices.length} device(s) now configured.`);
      this.logConnectionSummary(devices);
    }

    this.hadDevices = devices.length > 0;
  }

  private async onGatewayConnect(deviceId: string): Promise<void> {
    const name = this.deviceNames.get(deviceId) ?? deviceId;
    console.log(`[Gateway] Device ${name} reconnected.`);
    try {
      await this.apiClient.updateDeviceChannelStatus(deviceId, true);
      await this.apiClient.updateGatewayStatus(deviceId, true);
      await this.apiClient.logConnectionEvent(deviceId, "smpp_connected", name);
    } catch (err) {
      const detail = err instanceof Error ? err.message : String(err);
      console.error(`[Gateway] Failed to update status on reconnect for ${deviceId}: ${detail}`);
    }
  }

  private async onGatewayDisconnect(deviceId: string): Promise<void> {
    const name = this.deviceNames.get(deviceId) ?? deviceId;
    console.warn(`[Gateway] Device ${name} disconnected.`);
    try {
      await this.apiClient.updateDeviceChannelStatus(deviceId, false);
      await this.apiClient.updateGatewayStatus(deviceId, false);
      await this.apiClient.logConnectionEvent(deviceId, "smpp_disconnected", name);
    } catch (err) {
      const detail = err instanceof Error ? err.message : String(err);
      console.error(`[Gateway] Failed to update status on disconnect for ${deviceId}: ${detail}`);
    }
  }

  private logConnectionSummary(devices: DeviceConfig[]): void {
    console.log("\n" + "=".repeat(60));
    console.log("  SMPP Gateway — Connection Summary");
    console.log("=".repeat(60));

    if (devices.length === 0) {
      console.log("  No devices configured.");
      console.log("  Watching for new devices (syncs every 60s)...");
      console.log("=".repeat(60) + "\n");
      return;
    }

    for (const device of devices) {
      const gw = this.gateways.get(device.id);
      const status = gw?.isConnected ? "CONNECTED" : "DISCONNECTED";
      const channels = device.channels
        .map((ch) => ch.phoneNumber)
        .join(", ");

      console.log(`  Device: ${device.name}`);
      console.log(`    Host:     ${device.smppHost}:${device.smppPort}`);
      console.log(`    Status:   ${status}`);
      console.log(`    Channels: ${channels || "none"}`);
      console.log("");
    }

    const connected = devices.filter(
      (d) => this.gateways.get(d.id)?.isConnected,
    ).length;
    console.log(`  Total: ${devices.length} | Connected: ${connected} | Failed: ${devices.length - connected}`);
    console.log("=".repeat(60) + "\n");
  }
}
