import { randomUUID } from 'node:crypto';
import type { ChannelAdapter, ChannelMessage, ChannelMessageInput, InteractionDirection } from './types';

const buildMessage = (input: ChannelMessageInput, direction: InteractionDirection): ChannelMessage => ({
  ...input,
  channel: 'EMAIL',
  direction,
  externalRef: `email-${randomUUID()}`
});

export const emailAdapter: ChannelAdapter = {
  channel: 'EMAIL',
  deliver: (input) => buildMessage(input, 'OUTBOUND'),
  simulateInbound: (input) => buildMessage(input, 'INBOUND')
};
