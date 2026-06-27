const PATTERN =
  /^id:(?<messageId>[\w-]+)\ssub:(?<sub>\d+)\sdlvrd:(?<dlvrd>\d+).+stat:(?<stat>\w+)/;

export class InvalidMessageFormatError extends Error {}
export class UnsupportedDeliveryStatusError extends Error {}

const STATUS_MAP: Record<string, string> = {
  DELIVERED: "delivered",
  DELIVRD: "delivered",
  ENROUTE: "sent",
  UNDELIVERABLE: "failed",
  UNDELIV: "failed",
};

export class SMPPDeliveryReceipt {
  constructor(
    public messageId: string,
    public status: string,
  ) {}

  static parse(message: string): SMPPDeliveryReceipt {
    const matches = message.match(PATTERN);

    if (!matches?.groups) {
      throw new InvalidMessageFormatError("Invalid Delivery Message Format");
    }

    const { messageId, stat } = matches.groups;
    const status = STATUS_MAP[stat!];

    if (!status) {
      throw new UnsupportedDeliveryStatusError(
        `Unsupported Delivery Status: ${stat}`,
      );
    }

    return new SMPPDeliveryReceipt(messageId!, status);
  }
}
