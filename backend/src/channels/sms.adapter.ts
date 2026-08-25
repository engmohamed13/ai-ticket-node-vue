import { randomUUID } from 'node:crypto';
import type { ChannelAdapter, ChannelMessage, ChannelMessageInput, InteractionDirection } from './types';

const buildMessage = (input: ChannelMessageInput, direction: InteractionDirection): ChannelMessage => ({
  ...input,
  channel: 'SMS',
  direction,
  externalRef: `sms-${randomUUID()}`
});

export const smsAdapter: ChannelAdapter = {
  channel: 'SMS',
  deliver: (input) => buildMessage(input, 'OUTBOUND'),
  simulateInbound: (input) => buildMessage(input, 'INBOUND')
};
