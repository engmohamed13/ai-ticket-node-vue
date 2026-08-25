<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useCommunicationsStore } from '../stores/communications';
import { CHANNELS, INTERACTION_DIRECTIONS } from '../types';
import type { Channel, InteractionDirection } from '../types';
import PageHeader from '../components/ui/PageHeader.vue';
import AlertBanner from '../components/ui/AlertBanner.vue';
import StatusBadge from '../components/ui/StatusBadge.vue';
import LoadingState from '../components/ui/LoadingState.vue';
import EmptyState from '../components/ui/EmptyState.vue';

const store = useCommunicationsStore();

const channel = ref<Channel>('EMAIL');
const direction = ref<InteractionDirection>('INBOUND');
const ticketId = ref<string>('');
const subject = ref('');
const body = ref('');

const associateTargets = ref<Record<number, string>>({});

onMounted(async () => {
  await store.loadCustomers();
  if (store.customers.length > 0) {
    await store.selectCustomer(store.customers[0].id);
  }
});

const onSelectCustomer = async (event: Event): Promise<void> => {
  const customerId = Number((event.target as HTMLSelectElement).value);
  await store.selectCustomer(customerId);
};

const onSubmit = async (): Promise<void> => {
  if (store.selectedCustomerId === null || body.value.trim().length === 0) return;
  await store.submitInteraction({
    channel: channel.value,
    direction: direction.value,
    customerId: store.selectedCustomerId,
    ticketId: ticketId.value === '' ? undefined : Number(ticketId.value),
    subject: subject.value.trim() === '' ? undefined : subject.value.trim(),
    body: body.value.trim()
  });
  subject.value = '';
  body.value = '';
};

const onAssociate = async (interactionId: number): Promise<void> => {
  const target = associateTargets.value[interactionId];
  if (!target) return;
  await store.associate(interactionId, Number(target));
};

const formatOccurredAt = (occurredAt: string): string => new Date(occurredAt).toLocaleString();
const ticketLabel = (ticket: { id: number; subject: string }) => `#${ticket.id} — ${ticket.subject}`;
const hasTickets = computed(() => store.ticketsForSelectedCustomer.length > 0);
const isTimelineEmpty = computed(() => !store.loading && store.timeline.length === 0);

const directionVariant = (value: string) => (value === 'INBOUND' ? 'info' : 'primary');
</script>

<template>
  <section class="view">
    <PageHeader title="Communications" subtitle="A unified inbox across every channel, per customer." />

    <div class="card card-padded customer-picker">
      <div class="form-field">
        <label for="customer-select">Customer</label>
        <select id="customer-select" data-testid="customer-select" @change="onSelectCustomer">
          <option v-for="customer in store.customers" :key="customer.id" :value="customer.id">
            {{ customer.name }}
          </option>
        </select>
      </div>
    </div>

    <AlertBanner v-if="store.error" variant="error" data-testid="communications-error">
      {{ store.error }}
    </AlertBanner>

    <div class="card">
      <div class="card-header">
        <h3 class="card-title">Create or receive an interaction</h3>
      </div>
      <form class="card-padded" data-testid="interaction-form" @submit.prevent="onSubmit">
        <div class="form-grid">
          <div class="form-field">
            <label for="channel-select">Channel</label>
            <select id="channel-select" v-model="channel" data-testid="channel-select">
              <option v-for="value in CHANNELS" :key="value" :value="value">{{ value }}</option>
            </select>
          </div>
          <div class="form-field">
            <label for="direction-select">Direction</label>
            <select id="direction-select" v-model="direction" data-testid="direction-select">
              <option v-for="value in INTERACTION_DIRECTIONS" :key="value" :value="value">{{ value }}</option>
            </select>
          </div>
          <div class="form-field field-span-2">
            <label for="ticket-select">Ticket (optional)</label>
            <select id="ticket-select" v-model="ticketId" data-testid="ticket-select">
              <option value="">Not associated yet</option>
              <option v-for="ticket in store.ticketsForSelectedCustomer" :key="ticket.id" :value="ticket.id">
                {{ ticketLabel(ticket) }}
              </option>
            </select>
            <span v-if="!hasTickets" class="field-hint">This customer has no tickets yet — new interactions start unassociated.</span>
          </div>
          <div class="form-field field-span-2">
            <label for="subject-input">Subject</label>
            <input id="subject-input" v-model="subject" data-testid="subject-input" type="text" placeholder="Optional subject line" />
          </div>
          <div class="form-field field-span-2">
            <label for="body-input">Message</label>
            <textarea id="body-input" v-model="body" data-testid="body-input" rows="4" required></textarea>
          </div>
        </div>
        <div class="form-actions">
          <button class="btn btn-primary" type="submit" data-testid="submit-interaction">Save interaction</button>
        </div>
      </form>
    </div>

    <div class="card">
      <div class="card-header">
        <h3 class="card-title">Unified timeline</h3>
      </div>
      <div class="card-padded timeline-body">
        <LoadingState v-if="store.loading" data-testid="timeline-loading">Loading timeline…</LoadingState>
        <EmptyState
          v-else-if="isTimelineEmpty"
          title="No interactions yet"
          description="Interactions with this customer will appear here as they come in."
        />
        <ul v-else class="timeline" data-testid="timeline-list">
          <li v-for="interaction in store.timeline" :key="interaction.id" class="timeline-item" data-testid="timeline-item">
            <div class="timeline-meta">
              <StatusBadge variant="primary" class="channel-badge">{{ interaction.channel }}</StatusBadge>
              <StatusBadge :variant="directionVariant(interaction.direction)" class="direction">{{ interaction.direction }}</StatusBadge>
              <span class="occurred-at">{{ formatOccurredAt(interaction.occurredAt) }}</span>
            </div>
            <p class="body">{{ interaction.body }}</p>
            <p v-if="interaction.ticketId" class="ticket-link" data-testid="timeline-ticket-link">
              Ticket #{{ interaction.ticketId }}
            </p>
            <div v-else class="associate-row">
              <select v-model="associateTargets[interaction.id]" data-testid="associate-select">
                <option value="">Associate with a ticket…</option>
                <option v-for="ticket in store.ticketsForSelectedCustomer" :key="ticket.id" :value="ticket.id">
                  {{ ticketLabel(ticket) }}
                </option>
              </select>
              <button class="btn btn-secondary btn-sm" type="button" data-testid="associate-button" @click="onAssociate(interaction.id)">
                Associate
              </button>
            </div>
          </li>
        </ul>
      </div>
    </div>
  </section>
</template>

<style scoped>
.customer-picker {
  max-width: 360px;
}

.customer-picker .form-field {
  margin-bottom: 0;
}

.timeline-body {
  padding-top: var(--space-4);
}

.timeline {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
}

.timeline-item {
  border-bottom: 1px solid var(--border-color);
  padding: var(--space-3) 0;
}

.timeline-item:last-child {
  border-bottom: none;
  padding-bottom: 0;
}

.timeline-item:first-child {
  padding-top: 0;
}

.timeline-meta {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.4rem;
}

.occurred-at {
  color: var(--text-muted);
  font-size: var(--font-xs);
}

.body {
  color: var(--text-main);
  line-height: 1.55;
  font-size: var(--font-sm);
}

.ticket-link {
  margin-top: 0.4rem;
  font-size: var(--font-xs);
  font-weight: 600;
  color: var(--color-primary);
}

.associate-row {
  display: flex;
  gap: 0.5rem;
  align-items: center;
  margin-top: 0.6rem;
}

.associate-row select {
  max-width: 260px;
}
</style>
