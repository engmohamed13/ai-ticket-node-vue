import { randomUUID } from 'node:crypto';
import type { ChannelAdapter, ChannelMessage, ChannelMessageInput, InteractionDirection } from './types';

const buildMessage = (input: ChannelMessageInput, direction: InteractionDirection): ChannelMessage => ({
  ...input,
  channel: 'LIVE_CHAT',
  direction,
  externalRef: `chat-${randomUUID()}`
});

export const liveChatAdapter: ChannelAdapter = {
  channel: 'LIVE_CHAT',
  deliver: (input) => buildMessage(input, 'OUTBOUND'),
  simulateInbound: (input) => buildMessage(input, 'INBOUND')
};
