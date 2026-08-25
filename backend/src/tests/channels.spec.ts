import { CHANNELS } from '../channels/types';
import { channelAdapters, getChannelAdapter } from '../channels/registry';
import { emailAdapter } from '../channels/email.adapter';
import { whatsappAdapter } from '../channels/whatsapp.adapter';
import { liveChatAdapter } from '../channels/liveChat.adapter';
import { smsAdapter } from '../channels/sms.adapter';
import { webFormAdapter } from '../channels/webForm.adapter';

const ADAPTERS = [emailAdapter, whatsappAdapter, liveChatAdapter, smsAdapter, webFormAdapter];

describe('Channel adapters', () => {
  it('each adapter deliver returns OUTBOUND with correct channel prefix', () => {
    const tests = [
      { adapter: emailAdapter, prefix: 'email-' },
      { adapter: whatsappAdapter, prefix: 'wa-' },
      { adapter: liveChatAdapter, prefix: 'chat-' },
      { adapter: smsAdapter, prefix: 'sms-' },
      { adapter: webFormAdapter, prefix: 'webform-' }
    ];

    for (const test of tests) {
      const message = test.adapter.deliver({ body: 'hi' });
      expect(message.direction).toBe('OUTBOUND');
      expect(message.externalRef).toMatch(new RegExp(`^${test.prefix}`));
      expect(message.channel).toBe(test.adapter.channel);
    }
  });

  it('each adapter simulateInbound returns INBOUND with correct channel prefix', () => {
    const tests = [
      { adapter: emailAdapter, prefix: 'email-' },
      { adapter: whatsappAdapter, prefix: 'wa-' },
      { adapter: liveChatAdapter, prefix: 'chat-' },
      { adapter: smsAdapter, prefix: 'sms-' },
      { adapter: webFormAdapter, prefix: 'webform-' }
    ];

    for (const test of tests) {
      const message = test.adapter.simulateInbound({ body: 'hi' });
      expect(message.direction).toBe('INBOUND');
      expect(message.externalRef).toMatch(new RegExp(`^${test.prefix}`));
      expect(message.channel).toBe(test.adapter.channel);
    }
  });

  it('channelAdapters has exactly five keys matching CHANNELS', () => {
    const adapterKeys = Object.keys(channelAdapters);
    expect(adapterKeys).toHaveLength(5);
    expect(adapterKeys).toEqual(expect.arrayContaining(CHANNELS));
  });

  it('getChannelAdapter returns the correct adapter for each channel', () => {
    for (const adapter of ADAPTERS) {
      expect(getChannelAdapter(adapter.channel)).toBe(channelAdapters[adapter.channel]);
    }
  });

  it('multiple deliver calls produce different externalRef values', () => {
    const ref1 = emailAdapter.deliver({ body: 'hi' }).externalRef;
    const ref2 = emailAdapter.deliver({ body: 'hi' }).externalRef;
    expect(ref1).not.toBe(ref2);
    expect(ref1).toMatch(/^email-/);
    expect(ref2).toMatch(/^email-/);
  });
});
