import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { useCustomersStore } from '../stores/customers';
import {
  addCustomerNote,
  createCustomer,
  deleteCustomerAttachment,
  downloadCustomerAttachment,
  fetchCustomer,
  fetchCustomerAttachments,
  fetchCustomerNotes,
  fetchCustomers,
  fetchCustomerTickets,
  fetchCustomerTimeline,
  updateCustomer,
  uploadCustomerAttachment
} from '../services/customers.service';

vi.mock('../services/customers.service', () => ({
  fetchCustomers: vi.fn(),
  fetchCustomer: vi.fn(),
  createCustomer: vi.fn(),
  updateCustomer: vi.fn(),
  fetchCustomerTickets: vi.fn(),
  fetchCustomerTimeline: vi.fn(),
  fetchCustomerNotes: vi.fn(),
  addCustomerNote: vi.fn(),
  fetchCustomerAttachments: vi.fn(),
  uploadCustomerAttachment: vi.fn(),
  deleteCustomerAttachment: vi.fn(),
  downloadCustomerAttachment: vi.fn()
}));

const mockedFetchCustomers = fetchCustomers as unknown as ReturnType<typeof vi.fn>;
const mockedFetchCustomer = fetchCustomer as unknown as ReturnType<typeof vi.fn>;
const mockedCreateCustomer = createCustomer as unknown as ReturnType<typeof vi.fn>;
const mockedUpdateCustomer = updateCustomer as unknown as ReturnType<typeof vi.fn>;
const mockedFetchCustomerTickets = fetchCustomerTickets as unknown as ReturnType<typeof vi.fn>;
const mockedFetchCustomerTimeline = fetchCustomerTimeline as unknown as ReturnType<typeof vi.fn>;
const mockedFetchCustomerNotes = fetchCustomerNotes as unknown as ReturnType<typeof vi.fn>;
const mockedAddCustomerNote = addCustomerNote as unknown as ReturnType<typeof vi.fn>;
const mockedFetchCustomerAttachments = fetchCustomerAttachments as unknown as ReturnType<typeof vi.fn>;
const mockedUploadCustomerAttachment = uploadCustomerAttachment as unknown as ReturnType<typeof vi.fn>;
const mockedDeleteCustomerAttachment = deleteCustomerAttachment as unknown as ReturnType<typeof vi.fn>;
const mockedDownloadCustomerAttachment = downloadCustomerAttachment as unknown as ReturnType<typeof vi.fn>;

const sampleCustomer = {
  id: 1,
  name: 'John',
  email: 'john@example.com',
  phone: null,
  company: null,
  address: null,
  city: null,
  country: null,
  status: 'ACTIVE' as const,
  createdAt: '2026-08-25T00:00:00Z',
  updatedAt: '2026-08-25T00:00:00Z'
};

describe('useCustomersStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
  });

  it('loads customers', async () => {
    mockedFetchCustomers.mockResolvedValue([sampleCustomer]);

    const store = useCustomersStore();
    await store.loadCustomers();

    expect(store.customers).toEqual([sampleCustomer]);
    expect(store.loading).toBe(false);
  });

  it('sets error when loadCustomers fails', async () => {
    mockedFetchCustomers.mockRejectedValue(new Error('boom'));

    const store = useCustomersStore();
    await store.loadCustomers();

    expect(store.error).toBe('boom');
  });

  it('loadCustomerDetail populates all five refs on success', async () => {
    const note = { id: 1, body: 'hi', customerId: 1, authorId: 1, author: { id: 1, name: 'Admin' }, createdAt: '2026-08-25T00:00:00Z' };
    const attachment = { id: 1, fileName: 'a.txt', mimeType: 'text/plain', sizeBytes: 3, customerId: 1, uploadedById: 1, createdAt: '2026-08-25T00:00:00Z' };
    const ticket = { id: 1, subject: 'Test', status: 'Open', customerId: 1, createdAt: '2026-08-25T00:00:00Z', updatedAt: '2026-08-25T00:00:00Z' };
    const interaction = { id: 1, channel: 'EMAIL' as const, direction: 'INBOUND' as const, subject: null, body: 'hi', externalRef: 'email-1', customerId: 1, ticketId: null, occurredAt: '2026-08-25T00:00:00Z', createdAt: '2026-08-25T00:00:00Z' };

    mockedFetchCustomer.mockResolvedValue(sampleCustomer);
    mockedFetchCustomerNotes.mockResolvedValue([note]);
    mockedFetchCustomerAttachments.mockResolvedValue([attachment]);
    mockedFetchCustomerTickets.mockResolvedValue([ticket]);
    mockedFetchCustomerTimeline.mockResolvedValue([interaction]);

    const store = useCustomersStore();
    await store.loadCustomerDetail(1);

    expect(store.selectedCustomer).toEqual(sampleCustomer);
    expect(store.notes).toEqual([note]);
    expect(store.attachments).toEqual([attachment]);
    expect(store.tickets).toEqual([ticket]);
    expect(store.timeline).toEqual([interaction]);
    expect(store.detailLoading).toBe(false);
  });

  it('loadCustomerDetail resets selectedCustomer and sets error on failure', async () => {
    mockedFetchCustomer.mockRejectedValue(new Error('not found'));
    mockedFetchCustomerNotes.mockResolvedValue([]);
    mockedFetchCustomerAttachments.mockResolvedValue([]);
    mockedFetchCustomerTickets.mockResolvedValue([]);
    mockedFetchCustomerTimeline.mockResolvedValue([]);

    const store = useCustomersStore();
    store.selectedCustomer = sampleCustomer;
    await store.loadCustomerDetail(999);

    expect(store.selectedCustomer).toBeNull();
    expect(store.error).toBe('not found');
  });

  it('submitCustomer adds and sorts the created customer, returning true', async () => {
    mockedCreateCustomer.mockResolvedValue(sampleCustomer);

    const store = useCustomersStore();
    const result = await store.submitCustomer({ name: 'John', email: 'john@example.com' });

    expect(result).toBe(true);
    expect(store.customers).toEqual([sampleCustomer]);
    expect(store.notice).toBe('Customer John created');
  });

  it('submitCustomer returns false and sets error on failure', async () => {
    mockedCreateCustomer.mockRejectedValue(new Error('Duplicate email'));

    const store = useCustomersStore();
    const result = await store.submitCustomer({ name: 'John', email: 'john@example.com' });

    expect(result).toBe(false);
    expect(store.error).toBe('Duplicate email');
  });

  it('saveCustomer updates selectedCustomer, returning true', async () => {
    const updated = { ...sampleCustomer, name: 'Johnny' };
    mockedUpdateCustomer.mockResolvedValue(updated);

    const store = useCustomersStore();
    const result = await store.saveCustomer(1, { name: 'Johnny', email: 'john@example.com' });

    expect(result).toBe(true);
    expect(store.selectedCustomer).toEqual(updated);
  });

  it('submitNote prepends the created note, returning true', async () => {
    const note = { id: 1, body: 'hi', customerId: 1, authorId: 1, author: { id: 1, name: 'Admin' }, createdAt: '2026-08-25T00:00:00Z' };
    mockedAddCustomerNote.mockResolvedValue(note);

    const store = useCustomersStore();
    const result = await store.submitNote(1, 'hi');

    expect(result).toBe(true);
    expect(store.notes).toEqual([note]);
  });

  it('submitAttachment prepends the created attachment, returning true', async () => {
    const attachment = { id: 1, fileName: 'a.txt', mimeType: 'text/plain', sizeBytes: 3, customerId: 1, uploadedById: 1, createdAt: '2026-08-25T00:00:00Z' };
    mockedUploadCustomerAttachment.mockResolvedValue(attachment);

    const store = useCustomersStore();
    const result = await store.submitAttachment(1, new File(['abc'], 'a.txt'));

    expect(result).toBe(true);
    expect(store.attachments).toEqual([attachment]);
  });

  it('removeAttachment filters out the deleted attachment, returning true', async () => {
    mockedDeleteCustomerAttachment.mockResolvedValue(undefined);

    const store = useCustomersStore();
    store.attachments = [
      { id: 1, fileName: 'a.txt', mimeType: 'text/plain', sizeBytes: 3, customerId: 1, uploadedById: 1, createdAt: '2026-08-25T00:00:00Z' }
    ];
    const result = await store.removeAttachment(1, 1);

    expect(result).toBe(true);
    expect(store.attachments).toEqual([]);
  });

  it('downloadAttachment delegates to the service and sets error on failure', async () => {
    mockedDownloadCustomerAttachment.mockRejectedValue(new Error('gone'));

    const store = useCustomersStore();
    await store.downloadAttachment(1, {
      id: 1,
      fileName: 'a.txt',
      mimeType: 'text/plain',
      sizeBytes: 3,
      customerId: 1,
      uploadedById: 1,
      createdAt: '2026-08-25T00:00:00Z'
    });

    expect(store.error).toBe('gone');
  });
});
