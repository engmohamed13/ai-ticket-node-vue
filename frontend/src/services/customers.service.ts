import api from './api';
import type {
  ApiResponse,
  Customer,
  CustomerAttachment,
  CustomerFormPayload,
  CustomerNote,
  CustomerStatus,
  Interaction,
  Ticket
} from '../types';

export interface CustomerListFilter {
  search?: string;
  status?: CustomerStatus;
}

export const fetchCustomers = async (filter: CustomerListFilter = {}): Promise<Customer[]> => {
  const response = await api.get<ApiResponse<Customer[]>>('/customers', {
    params: {
      search: filter.search && filter.search.length > 0 ? filter.search : undefined,
      status: filter.status
    }
  });
  return response.data.data ?? [];
};

export const fetchCustomer = async (id: number): Promise<Customer> => {
  const response = await api.get<ApiResponse<Customer>>(`/customers/${id}`);
  if (!response.data.data) throw new Error(response.data.message || 'Customer not found');
  return response.data.data;
};

export const createCustomer = async (payload: CustomerFormPayload): Promise<Customer> => {
  const response = await api.post<ApiResponse<Customer>>('/customers', payload);
  if (!response.data.data) throw new Error(response.data.message || 'Unable to create the customer');
  return response.data.data;
};

export const updateCustomer = async (id: number, payload: CustomerFormPayload): Promise<Customer> => {
  const response = await api.patch<ApiResponse<Customer>>(`/customers/${id}`, payload);
  if (!response.data.data) throw new Error(response.data.message || 'Unable to update the customer');
  return response.data.data;
};

export const fetchCustomerTickets = async (customerId: number): Promise<Ticket[]> => {
  const response = await api.get<ApiResponse<Ticket[]>>('/tickets', { params: { customerId } });
  return response.data.data ?? [];
};

export const fetchCustomerTimeline = async (customerId: number): Promise<Interaction[]> => {
  const response = await api.get<ApiResponse<Interaction[]>>(`/customers/${customerId}/timeline`);
  return response.data.data ?? [];
};

export const fetchCustomerNotes = async (customerId: number): Promise<CustomerNote[]> => {
  const response = await api.get<ApiResponse<CustomerNote[]>>(`/customers/${customerId}/notes`);
  return response.data.data ?? [];
};

export const addCustomerNote = async (customerId: number, body: string): Promise<CustomerNote> => {
  const response = await api.post<ApiResponse<CustomerNote>>(`/customers/${customerId}/notes`, { body });
  if (!response.data.data) throw new Error(response.data.message || 'Unable to add the note');
  return response.data.data;
};

export const fetchCustomerAttachments = async (customerId: number): Promise<CustomerAttachment[]> => {
  const response = await api.get<ApiResponse<CustomerAttachment[]>>(`/customers/${customerId}/attachments`);
  return response.data.data ?? [];
};

export const uploadCustomerAttachment = async (customerId: number, file: File): Promise<CustomerAttachment> => {
  const formData = new FormData();
  formData.append('file', file);
  const response = await api.post<ApiResponse<CustomerAttachment>>(
    `/customers/${customerId}/attachments`,
    formData,
    // Override the api.ts instance default of 'application/json': setting Content-Type
    // to undefined lets the browser generate the correct multipart boundary itself.
    { headers: { 'Content-Type': undefined } }
  );
  if (!response.data.data) throw new Error(response.data.message || 'Unable to upload the attachment');
  return response.data.data;
};

export const deleteCustomerAttachment = async (customerId: number, attachmentId: number): Promise<void> => {
  await api.delete<ApiResponse<null>>(`/customers/${customerId}/attachments/${attachmentId}`);
};

export const downloadCustomerAttachment = async (
  customerId: number,
  attachmentId: number,
  fileName: string
): Promise<void> => {
  const response = await api.get<Blob>(`/customers/${customerId}/attachments/${attachmentId}/download`, {
    responseType: 'blob'
  });
  const url = URL.createObjectURL(response.data);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  link.click();
  URL.revokeObjectURL(url);
};
