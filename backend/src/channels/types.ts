export const CHANNELS = ['EMAIL', 'WHATSAPP', 'LIVE_CHAT', 'SMS', 'WEB_FORM'] as const;
export type Channel = (typeof CHANNELS)[number];

export const INTERACTION_DIRECTIONS = ['INBOUND', 'OUTBOUND'] as const;
export type InteractionDirection = (typeof INTERACTION_DIRECTIONS)[number];

export interface ChannelMessageInput {
  subject?: string | null;
  body: string;
}

export interface ChannelMessage extends ChannelMessageInput {
  channel: Channel;
  direction: InteractionDirection;
  externalRef: string;
}

export interface ChannelAdapter {
  channel: Channel;
  /** Mock outbound send — an agent replying through this channel. Never calls a real external service. */
  deliver(input: ChannelMessageInput): ChannelMessage;
  /** Mock inbound receive — a customer reaching in through this channel. Never calls a real external service. */
  simulateInbound(input: ChannelMessageInput): ChannelMessage;
}
