import { defineStore } from 'pinia';
import { computed, ref } from 'vue';
import {
  associateInteraction,
  createInteraction,
  fetchCustomerTimeline,
  fetchCustomers,
  fetchTickets
} from '../services/communications.service';
import type { CreateInteractionPayload, Customer, Interaction, Ticket } from '../types';

export const useCommunicationsStore = defineStore('communications', () => {
  const customers = ref<Customer[]>([]);
  const tickets = ref<Ticket[]>([]);
  const timeline = ref<Interaction[]>([]);
  const selectedCustomerId = ref<number | null>(null);
  const loading = ref(false);
  const error = ref<string | null>(null);

  const ticketsForSelectedCustomer = computed(() =>
    tickets.value.filter((ticket) => ticket.customerId === selectedCustomerId.value)
  );

  const loadCustomers = async (): Promise<void> => {
    customers.value = await fetchCustomers();
  };

  const selectCustomer = async (customerId: number): Promise<void> => {
    selectedCustomerId.value = customerId;
    loading.value = true;
    error.value = null;
    try {
      const [customerTickets, customerTimeline] = await Promise.all([
        fetchTickets(customerId),
        fetchCustomerTimeline(customerId)
      ]);
      tickets.value = customerTickets;
      timeline.value = customerTimeline;
    } catch (cause) {
      error.value = cause instanceof Error ? cause.message : 'Unable to load communications';
    } finally {
      loading.value = false;
    }
  };

  const submitInteraction = async (payload: CreateInteractionPayload): Promise<void> => {
    error.value = null;
    try {
      await createInteraction(payload);
      if (selectedCustomerId.value !== null) {
        timeline.value = await fetchCustomerTimeline(selectedCustomerId.value);
      }
    } catch (cause) {
      error.value = cause instanceof Error ? cause.message : 'Unable to store interaction';
    }
  };

  const associate = async (interactionId: number, ticketId: number): Promise<void> => {
    error.value = null;
    try {
      await associateInteraction(interactionId, ticketId);
      if (selectedCustomerId.value !== null) {
        timeline.value = await fetchCustomerTimeline(selectedCustomerId.value);
      }
    } catch (cause) {
      error.value = cause instanceof Error ? cause.message : 'Unable to associate interaction';
    }
  };

  return {
    customers,
    tickets,
    timeline,
    selectedCustomerId,
    loading,
    error,
    ticketsForSelectedCustomer,
    loadCustomers,
    selectCustomer,
    submitInteraction,
    associate
  };
});
