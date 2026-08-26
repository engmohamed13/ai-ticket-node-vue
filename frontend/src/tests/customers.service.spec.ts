import { describe, it, expect, vi, beforeEach } from 'vitest';
import api from '../services/api';
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

vi.mock('../services/api', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn()
  }
}));

const mockedGet = api.get as unknown as ReturnType<typeof vi.fn>;
const mockedPost = api.post as unknown as ReturnType<typeof vi.fn>;
const mockedPatch = api.patch as unknown as ReturnType<typeof vi.fn>;
const mockedDelete = api.delete as unknown as ReturnType<typeof vi.fn>;

const sampleCustomer = {
  id: 1,
  name: 'John',
  email: 'john@example.com',
  phone: null,
  company: null,
  address: null,
  city: null,
  country: null,
  status: 'ACTIVE',
  createdAt: '2026-08-25T00:00:00Z',
  updatedAt: '2026-08-25T00:00:00Z'
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe('fetchCustomers', () => {
  it('returns customer array and passes search/status params', async () => {
    mockedGet.mockResolvedValue({ data: { success: true, message: 'OK', data: [sampleCustomer] } });

    const result = await fetchCustomers({ search: 'acme', status: 'ACTIVE' });

    expect(result).toEqual([sampleCustomer]);
    expect(mockedGet).toHaveBeenCalledWith('/customers', { params: { search: 'acme', status: 'ACTIVE' } });
  });

  it('omits an empty search string', async () => {
    mockedGet.mockResolvedValue({ data: { success: true, message: 'OK', data: [] } });

    await fetchCustomers({ search: '' });

    expect(mockedGet).toHaveBeenCalledWith('/customers', { params: { search: undefined, status: undefined } });
  });

  it('returns empty array when data is null', async () => {
    mockedGet.mockResolvedValue({ data: { success: false, message: 'Error', data: null } });

    const result = await fetchCustomers();

    expect(result).toEqual([]);
  });
});

describe('fetchCustomer', () => {
  it('returns the customer on success', async () => {
    mockedGet.mockResolvedValue({ data: { success: true, message: 'OK', data: sampleCustomer } });

    const result = await fetchCustomer(1);

    expect(result).toEqual(sampleCustomer);
    expect(mockedGet).toHaveBeenCalledWith('/customers/1');
  });

  it('throws when data is null', async () => {
    mockedGet.mockResolvedValue({ data: { success: false, message: 'Not found', data: null } });

    await expect(fetchCustomer(999)).rejects.toThrow('Not found');
  });
});

describe('createCustomer', () => {
  it('posts the payload and returns the created customer', async () => {
    mockedPost.mockResolvedValue({ data: { success: true, message: 'Created', data: sampleCustomer } });

    const result = await createCustomer({ name: 'John', email: 'john@example.com' });

    expect(result).toEqual(sampleCustomer);
    expect(mockedPost).toHaveBeenCalledWith('/customers', { name: 'John', email: 'john@example.com' });
  });

  it('throws when data is null', async () => {
    mockedPost.mockResolvedValue({ data: { success: false, message: 'Duplicate', data: null } });

    await expect(createCustomer({ name: 'John', email: 'john@example.com' })).rejects.toThrow('Duplicate');
  });
});

describe('updateCustomer', () => {
  it('patches the payload and returns the updated customer', async () => {
    mockedPatch.mockResolvedValue({ data: { success: true, message: 'Updated', data: sampleCustomer } });

    const result = await updateCustomer(1, { name: 'John', email: 'john@example.com' });

    expect(result).toEqual(sampleCustomer);
    expect(mockedPatch).toHaveBeenCalledWith('/customers/1', { name: 'John', email: 'john@example.com' });
  });
});

describe('fetchCustomerTickets', () => {
  it('passes customerId as a query param', async () => {
    mockedGet.mockResolvedValue({ data: { success: true, message: 'OK', data: [] } });

    await fetchCustomerTickets(1);

    expect(mockedGet).toHaveBeenCalledWith('/tickets', { params: { customerId: 1 } });
  });
});

describe('fetchCustomerTimeline', () => {
  it('fetches the timeline for a customer', async () => {
    mockedGet.mockResolvedValue({ data: { success: true, message: 'OK', data: [] } });

    await fetchCustomerTimeline(1);

    expect(mockedGet).toHaveBeenCalledWith('/customers/1/timeline');
  });
});

describe('fetchCustomerNotes / addCustomerNote', () => {
  it('fetches notes for a customer', async () => {
    mockedGet.mockResolvedValue({ data: { success: true, message: 'OK', data: [] } });

    await fetchCustomerNotes(1);

    expect(mockedGet).toHaveBeenCalledWith('/customers/1/notes');
  });

  it('adds a note and returns it', async () => {
    const note = { id: 1, body: 'hi', customerId: 1, authorId: 1, author: { id: 1, name: 'Admin' }, createdAt: '2026-08-25T00:00:00Z' };
    mockedPost.mockResolvedValue({ data: { success: true, message: 'Added', data: note } });

    const result = await addCustomerNote(1, 'hi');

    expect(result).toEqual(note);
    expect(mockedPost).toHaveBeenCalledWith('/customers/1/notes', { body: 'hi' });
  });

  it('throws when note data is null', async () => {
    mockedPost.mockResolvedValue({ data: { success: false, message: 'Error', data: null } });

    await expect(addCustomerNote(1, 'hi')).rejects.toThrow('Error');
  });
});

describe('fetchCustomerAttachments / uploadCustomerAttachment', () => {
  it('fetches attachments for a customer', async () => {
    mockedGet.mockResolvedValue({ data: { success: true, message: 'OK', data: [] } });

    await fetchCustomerAttachments(1);

    expect(mockedGet).toHaveBeenCalledWith('/customers/1/attachments');
  });

  it('uploads a file as FormData with an undefined Content-Type override', async () => {
    const attachment = { id: 1, fileName: 'a.txt', mimeType: 'text/plain', sizeBytes: 3, customerId: 1, uploadedById: 1, createdAt: '2026-08-25T00:00:00Z' };
    mockedPost.mockResolvedValue({ data: { success: true, message: 'Uploaded', data: attachment } });
    const file = new File(['abc'], 'a.txt', { type: 'text/plain' });

    const result = await uploadCustomerAttachment(1, file);

    expect(result).toEqual(attachment);
    expect(mockedPost).toHaveBeenCalledWith('/customers/1/attachments', expect.any(FormData), {
      headers: { 'Content-Type': undefined }
    });
    const formData = mockedPost.mock.calls[0][1] as FormData;
    expect(formData.get('file')).toBe(file);
  });

  it('throws when attachment data is null', async () => {
    mockedPost.mockResolvedValue({ data: { success: false, message: 'Too large', data: null } });
    const file = new File(['abc'], 'a.txt', { type: 'text/plain' });

    await expect(uploadCustomerAttachment(1, file)).rejects.toThrow('Too large');
  });
});

describe('deleteCustomerAttachment', () => {
  it('sends a delete request', async () => {
    mockedDelete.mockResolvedValue({ data: { success: true, message: 'Deleted', data: null } });

    await deleteCustomerAttachment(1, 2);

    expect(mockedDelete).toHaveBeenCalledWith('/customers/1/attachments/2');
  });
});

describe('downloadCustomerAttachment', () => {
  it('creates and clicks a temporary anchor for the returned blob', async () => {
    const blob = new Blob(['content']);
    mockedGet.mockResolvedValue({ data: blob });

    const createObjectURL = vi.fn().mockReturnValue('blob:url');
    const revokeObjectURL = vi.fn();
    vi.stubGlobal('URL', { ...URL, createObjectURL, revokeObjectURL });

    const clickSpy = vi.fn();
    const originalCreateElement = document.createElement.bind(document);
    vi.spyOn(document, 'createElement').mockImplementation((tag: string) => {
      const element = originalCreateElement(tag);
      if (tag === 'a') element.click = clickSpy;
      return element;
    });

    await downloadCustomerAttachment(1, 2, 'file.txt');

    expect(mockedGet).toHaveBeenCalledWith('/customers/1/attachments/2/download', { responseType: 'blob' });
    expect(createObjectURL).toHaveBeenCalledWith(blob);
    expect(clickSpy).toHaveBeenCalled();
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:url');

    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });
});
