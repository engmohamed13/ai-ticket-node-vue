import { emailAdapter } from './email.adapter';
import { liveChatAdapter } from './liveChat.adapter';
import { smsAdapter } from './sms.adapter';
import type { Channel, ChannelAdapter } from './types';
import { webFormAdapter } from './webForm.adapter';
import { whatsappAdapter } from './whatsapp.adapter';

export const channelAdapters: Record<Channel, ChannelAdapter> = {
  EMAIL: emailAdapter,
  WHATSAPP: whatsappAdapter,
  LIVE_CHAT: liveChatAdapter,
  SMS: smsAdapter,
  WEB_FORM: webFormAdapter
};

export const getChannelAdapter = (channel: Channel): ChannelAdapter => channelAdapters[channel];
