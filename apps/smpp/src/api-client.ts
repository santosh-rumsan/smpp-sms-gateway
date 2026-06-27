export class AuthError extends Error {
  constructor(url: string) {
    super(`Authentication failed (401) calling ${url}`);
    this.name = "AuthError";
  }
}

interface IncomingMessage {
  sourceAddr: string;
  destinationAddr: string;
  content: string;
  deviceId?: string;
}

interface PendingMessage {
  id: string;
  channelId: string;
  sourceAddr: string;
  destinationAddr: string;
  content: string;
  deviceId: string | null;
}

interface DeviceConfig {
  id: string;
  name: string;
  smppHost: string;
  smppPort: number;
  smppSystemId: string;
  smppPassword: string;
  countryCode: string | null;
  channels: { id: string; phoneNumber: string }[];
}

export class ApiClient {
  constructor(
    private readonly baseUrl: string,
    private readonly apiKey: string,
  ) {}

  async saveIncomingMessage(data: IncomingMessage): Promise<void> {
    const res = await this.request("POST", "/internal/messages", data);
    if (!res.ok) {
      throw new Error(`Failed to save message: ${res.status}`);
    }
  }

  async getPendingMessages(): Promise<PendingMessage[]> {
    const res = await this.request("GET", "/internal/messages/pending");
    if (!res.ok) {
      throw new Error(`Failed to get pending messages: ${res.status}`);
    }
    const data = (await res.json()) as { messages: PendingMessage[] };
    return data.messages;
  }

  async markMessageSent(messageId: string, smppMessageId: string): Promise<void> {
    const res = await this.request("PATCH", `/internal/messages/${messageId}/sent`, {
      smppMessageId,
    });
    if (!res.ok) {
      throw new Error(`Failed to mark sent: ${res.status}`);
    }
  }

  async markMessageFailed(messageId: string, detail: string): Promise<void> {
    const res = await this.request("PATCH", `/internal/messages/status/${messageId}`, {
      status: "failed",
      statusDetail: detail,
    });
    if (!res.ok) {
      console.error(`Failed to mark message failed: ${res.status}`);
    }
  }

  async updateMessageStatus(smppMessageId: string, status: string): Promise<void> {
    const res = await this.request("PATCH", `/internal/messages/status/${smppMessageId}`, {
      status,
    });
    if (!res.ok) {
      console.error(`Failed to update status: ${res.status}`);
    }
  }

  async updateDeviceChannelStatus(deviceId: string, isActive: boolean): Promise<void> {
    const res = await this.request("PATCH", `/internal/devices/${deviceId}/channel-status`, {
      isActive,
    });
    if (!res.ok) {
      console.error(`Failed to update channel status for device ${deviceId}: ${res.status}`);
    }
  }

  async updateGatewayStatus(deviceId: string, connected: boolean): Promise<void> {
    const res = await this.request("PATCH", `/internal/devices/${deviceId}/gateway-status`, {
      connected,
    });
    if (!res.ok) {
      console.error(`Failed to update gateway status for device ${deviceId}: ${res.status}`);
    }
  }

  async getDevices(): Promise<DeviceConfig[]> {
    const res = await this.request("GET", "/internal/devices");
    if (!res.ok) {
      throw new Error(`Failed to get devices: ${res.status}`);
    }
    const data = (await res.json()) as { devices: DeviceConfig[] };
    return data.devices;
  }

  async getSettings(): Promise<Record<string, string>> {
    const res = await this.request("GET", "/internal/settings");
    if (!res.ok) return {};
    return res.json() as Promise<Record<string, string>>;
  }

  async logConnectionEvent(
    deviceId: string,
    type: "smpp_connected" | "smpp_disconnected",
    deviceName: string,
  ): Promise<void> {
    const res = await this.request("POST", `/internal/devices/${deviceId}/connection-event`, {
      type,
      deviceName,
    });
    if (!res.ok) {
      console.error(`Failed to log connection event: ${res.status}`);
    }
  }

  async sendOfflineAlert(deviceId: string): Promise<void> {
    const res = await this.request("POST", `/internal/devices/${deviceId}/offline-alert`);
    if (!res.ok) {
      console.error(`Failed to send offline alert for device ${deviceId}: ${res.status}`);
    }
  }

  private async request(
    method: string,
    path: string,
    body?: unknown,
  ): Promise<Response> {
    const url = `${this.baseUrl}${path}`;
    const headers: Record<string, string> = {
      "X-API-Key": this.apiKey,
    };

    if (body) {
      headers["Content-Type"] = "application/json";
    }

    const res = await fetch(url, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });

    if (res.status === 401) {
      throw new AuthError(url);
    }

    return res;
  }
}
