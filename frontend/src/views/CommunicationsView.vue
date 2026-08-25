<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useCommunicationsStore } from '../stores/communications';
import { CHANNELS, INTERACTION_DIRECTIONS } from '../types';
import type { Channel, InteractionDirection } from '../types';

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
</script>

<template>
  <section>
    <h2>Communications</h2>

    <div class="customer-picker">
      <label for="customer-select">Customer</label>
      <select id="customer-select" data-testid="customer-select" @change="onSelectCustomer">
        <option v-for="customer in store.customers" :key="customer.id" :value="customer.id">
          {{ customer.name }}
        </option>
      </select>
    </div>

    <div v-if="store.error" class="panel panel-error" data-testid="communications-error">
      {{ store.error }}
    </div>

    <form class="interaction-form" data-testid="interaction-form" @submit.prevent="onSubmit">
      <h3>Create or receive an interaction</h3>
      <div class="form-row">
        <label for="channel-select">Channel</label>
        <select id="channel-select" v-model="channel" data-testid="channel-select">
          <option v-for="value in CHANNELS" :key="value" :value="value">{{ value }}</option>
        </select>
      </div>
      <div class="form-row">
        <label for="direction-select">Direction</label>
        <select id="direction-select" v-model="direction" data-testid="direction-select">
          <option v-for="value in INTERACTION_DIRECTIONS" :key="value" :value="value">{{ value }}</option>
        </select>
      </div>
      <div class="form-row">
        <label for="ticket-select">Ticket (optional)</label>
        <select id="ticket-select" v-model="ticketId" data-testid="ticket-select">
          <option value="">Not associated yet</option>
          <option v-for="ticket in store.ticketsForSelectedCustomer" :key="ticket.id" :value="ticket.id">
            {{ ticketLabel(ticket) }}
          </option>
        </select>
      </div>
      <div class="form-row">
        <label for="subject-input">Subject</label>
        <input id="subject-input" v-model="subject" data-testid="subject-input" type="text" />
      </div>
      <div class="form-row">
        <label for="body-input">Message</label>
        <textarea id="body-input" v-model="body" data-testid="body-input" required></textarea>
      </div>
      <button class="btn btn-primary" type="submit" data-testid="submit-interaction">Save interaction</button>
    </form>

    <div class="timeline">
      <h3>Unified timeline</h3>
      <p v-if="!hasTickets" class="hint">This customer has no tickets yet — new interactions start unassociated.</p>
      <p v-if="store.loading" data-testid="timeline-loading">Loading timeline…</p>
      <ul v-else data-testid="timeline-list">
        <li v-for="interaction in store.timeline" :key="interaction.id" class="timeline-item" data-testid="timeline-item">
          <span class="badge">{{ interaction.channel }}</span>
          <span class="direction">{{ interaction.direction }}</span>
          <span class="occurred-at">{{ formatOccurredAt(interaction.occurredAt) }}</span>
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
            <button class="btn btn-primary" type="button" data-testid="associate-button" @click="onAssociate(interaction.id)">
              Associate
            </button>
          </div>
        </li>
      </ul>
    </div>
  </section>
</template>

<style scoped>
section {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.customer-picker,
.form-row {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  margin-bottom: 0.75rem;
}

.interaction-form,
.timeline {
  background-color: var(--surface-color);
  border: 1px solid var(--border-color);
  border-radius: 8px;
  padding: 1.25rem;
}

.panel-error {
  background-color: var(--color-down-bg);
  color: var(--color-down);
  padding: 1rem 1.25rem;
  border-radius: 8px;
}

.hint {
  color: var(--text-muted);
}

.timeline-item {
  border-bottom: 1px solid var(--border-color);
  padding: 0.75rem 0;
}

.badge {
  display: inline-block;
  padding: 0.2rem 0.6rem;
  border-radius: 9999px;
  background-color: #eff6ff;
  color: #2563eb;
  font-size: 0.8rem;
  font-weight: 600;
  margin-right: 0.5rem;
}

.direction,
.occurred-at {
  color: var(--text-muted);
  font-size: 0.85rem;
}

.associate-row {
  display: flex;
  gap: 0.5rem;
  align-items: center;
  margin-top: 0.5rem;
}
</style>
