import { defineStore } from 'pinia';
import { computed, ref } from 'vue';
import { toErrorMessage } from '../services/apiError';
import {
  addCustomerNote,
  createCustomer,
  deleteCustomerAttachment,
  downloadCustomerAttachment,
  fetchCustomer,
  fetchCustomerAttachments,
  fetchCustomerNotes,
  fetchCustomerTickets,
  fetchCustomerTimeline,
  fetchCustomers,
  updateCustomer,
  uploadCustomerAttachment
} from '../services/customers.service';
import type { CustomerListFilter } from '../services/customers.service';
import type {
  Customer,
  CustomerAttachment,
  CustomerFormPayload,
  CustomerNote,
  Interaction,
  Ticket
} from '../types';

export const useCustomersStore = defineStore('customers', () => {
  const customers = ref<Customer[]>([]);
  const selectedCustomer = ref<Customer | null>(null);
  const notes = ref<CustomerNote[]>([]);
  const attachments = ref<CustomerAttachment[]>([]);
  const tickets = ref<Ticket[]>([]);
  const timeline = ref<Interaction[]>([]);
  const loading = ref(false);
  const detailLoading = ref(false);
  const error = ref<string | null>(null);
  const notice = ref<string | null>(null);

  const hasCustomers = computed(() => customers.value.length > 0);

  const loadCustomers = async (filter: CustomerListFilter = {}): Promise<void> => {
    loading.value = true;
    error.value = null;
    try {
      customers.value = await fetchCustomers(filter);
    } catch (cause) {
      error.value = toErrorMessage(cause, 'Unable to load customers');
    } finally {
      loading.value = false;
    }
  };

  const loadCustomerDetail = async (customerId: number): Promise<void> => {
    detailLoading.value = true;
    error.value = null;
    try {
      const [customer, customerNotes, customerAttachments, customerTickets, customerTimeline] =
        await Promise.all([
          fetchCustomer(customerId),
          fetchCustomerNotes(customerId),
          fetchCustomerAttachments(customerId),
          fetchCustomerTickets(customerId),
          fetchCustomerTimeline(customerId)
        ]);
      selectedCustomer.value = customer;
      notes.value = customerNotes;
      attachments.value = customerAttachments;
      tickets.value = customerTickets;
      timeline.value = customerTimeline;
    } catch (cause) {
      selectedCustomer.value = null;
      error.value = toErrorMessage(cause, 'Unable to load the customer profile');
    } finally {
      detailLoading.value = false;
    }
  };

  const submitCustomer = async (payload: CustomerFormPayload): Promise<boolean> => {
    error.value = null;
    notice.value = null;
    try {
      const created = await createCustomer(payload);
      customers.value = [...customers.value, created].sort((a, b) => a.name.localeCompare(b.name));
      notice.value = `Customer ${created.name} created`;
      return true;
    } catch (cause) {
      error.value = toErrorMessage(cause, 'Unable to create the customer');
      return false;
    }
  };

  const saveCustomer = async (customerId: number, payload: CustomerFormPayload): Promise<boolean> => {
    error.value = null;
    notice.value = null;
    try {
      const updated = await updateCustomer(customerId, payload);
      selectedCustomer.value = updated;
      notice.value = 'Customer updated';
      return true;
    } catch (cause) {
      error.value = toErrorMessage(cause, 'Unable to update the customer');
      return false;
    }
  };

  const submitNote = async (customerId: number, body: string): Promise<boolean> => {
    error.value = null;
    try {
      const created = await addCustomerNote(customerId, body);
      notes.value = [created, ...notes.value];
      return true;
    } catch (cause) {
      error.value = toErrorMessage(cause, 'Unable to add the note');
      return false;
    }
  };

  const submitAttachment = async (customerId: number, file: File): Promise<boolean> => {
    error.value = null;
    try {
      const created = await uploadCustomerAttachment(customerId, file);
      attachments.value = [created, ...attachments.value];
      return true;
    } catch (cause) {
      error.value = toErrorMessage(cause, 'Unable to upload the attachment');
      return false;
    }
  };

  const removeAttachment = async (customerId: number, attachmentId: number): Promise<boolean> => {
    error.value = null;
    try {
      await deleteCustomerAttachment(customerId, attachmentId);
      attachments.value = attachments.value.filter((entry) => entry.id !== attachmentId);
      return true;
    } catch (cause) {
      error.value = toErrorMessage(cause, 'Unable to delete the attachment');
      return false;
    }
  };

  const downloadAttachment = async (customerId: number, attachment: CustomerAttachment): Promise<void> => {
    try {
      await downloadCustomerAttachment(customerId, attachment.id, attachment.fileName);
    } catch (cause) {
      error.value = toErrorMessage(cause, 'Unable to download the attachment');
    }
  };

  return {
    customers,
    selectedCustomer,
    notes,
    attachments,
    tickets,
    timeline,
    loading,
    detailLoading,
    error,
    notice,
    hasCustomers,
    loadCustomers,
    loadCustomerDetail,
    submitCustomer,
    saveCustomer,
    submitNote,
    submitAttachment,
    removeAttachment,
    downloadAttachment
  };
});
