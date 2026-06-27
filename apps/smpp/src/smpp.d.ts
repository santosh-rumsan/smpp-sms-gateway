declare module "smpp" {
  interface SmppConfig {
    url: string;
    auto_enquire_link_period?: number;
    debug?: boolean;
  }

  interface SmppSession {
    bind_transceiver(
      params: { system_id: string; password: string },
      callback: (pdu: any) => void,
    ): void;
    submit_sm(params: any, callback: (pdu: any) => void): void;
    on(event: string, handler: (...args: any[]) => void): void;
    close(): void;
    connect(): void;
    socket: {
      on(event: string, handler: (...args: any[]) => void): void;
    };
  }

  function connect(config: SmppConfig, callback: () => void): SmppSession;

  const ESM_CLASS: {
    MC_DELIVERY_RECEIPT: number;
  };
}
