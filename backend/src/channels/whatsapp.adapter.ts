import { randomUUID } from 'node:crypto';
import type { ChannelAdapter, ChannelMessage, ChannelMessageInput, InteractionDirection } from './types';

const buildMessage = (input: ChannelMessageInput, direction: InteractionDirection): ChannelMessage => ({
  ...input,
  channel: 'WHATSAPP',
  direction,
  externalRef: `wa-${randomUUID()}`
});

export const whatsappAdapter: ChannelAdapter = {
  channel: 'WHATSAPP',
  deliver: (input) => buildMessage(input, 'OUTBOUND'),
  simulateInbound: (input) => buildMessage(input, 'INBOUND')
};
