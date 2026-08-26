import api from './api';
import type {
  ApiResponse,
  CreateTicketPayload,
  Interaction,
  Ticket,
  TicketAttachment,
  TicketCategory,
  TicketComment,
  TicketDetail,
  TicketPriority,
  TicketStatus,
  UpdateTicketPayload
} from '../types';

export interface TicketListFilter {
  customerId?: number;
  status?: TicketStatus;
  priority?: TicketPriority;
  categoryId?: number;
  assignedToUserId?: number;
  /** Dashboard "My Tickets" tab — the backend resolves this against the caller's own id. */
  assignedToMe?: boolean;
  unassigned?: boolean;
}

export const fetchTickets = async (filter: TicketListFilter = {}): Promise<Ticket[]> => {
  const response = await api.get<ApiResponse<Ticket[]>>('/tickets', {
    params: {
      customerId: filter.customerId,
      status: filter.status,
      priority: filter.priority,
      categoryId: filter.categoryId,
      assignedToUserId: filter.assignedToUserId,
      // The API validates these as the strings 'true' / 'false', so only send them when set.
      assignedToMe: filter.assignedToMe ? 'true' : undefined,
      unassigned: filter.unassigned ? 'true' : undefined
    }
  });
  return response.data.data ?? [];
};

export const fetchTicket = async (id: number): Promise<TicketDetail> => {
  const response = await api.get<ApiResponse<TicketDetail>>(`/tickets/${id}`);
  if (!response.data.data) throw new Error(response.data.message || 'Ticket not found');
  return response.data.data;
};

export const fetchTicketCategories = async (): Promise<TicketCategory[]> => {
  const response = await api.get<ApiResponse<TicketCategory[]>>('/tickets/categories');
  return response.data.data ?? [];
};

export const createTicket = async (payload: CreateTicketPayload): Promise<Ticket> => {
  const response = await api.post<ApiResponse<Ticket>>('/tickets', payload);
  if (!response.data.data) throw new Error(response.data.message || 'Unable to create the ticket');
  return response.data.data;
};

export const updateTicket = async (id: number, payload: UpdateTicketPayload): Promise<Ticket> => {
  const response = await api.patch<ApiResponse<Ticket>>(`/tickets/${id}`, payload);
  if (!response.data.data) throw new Error(response.data.message || 'Unable to update the ticket');
  return response.data.data;
};

/** `null` unassigns the ticket. */
export const assignTicket = async (id: number, assignedToUserId: number | null): Promise<Ticket> => {
  const response = await api.patch<ApiResponse<Ticket>>(`/tickets/${id}/assign`, { assignedToUserId });
  if (!response.data.data) throw new Error(response.data.message || 'Unable to assign the ticket');
  return response.data.data;
};

export const fetchTicketTimeline = async (ticketId: number): Promise<Interaction[]> => {
  const response = await api.get<ApiResponse<Interaction[]>>(`/tickets/${ticketId}/timeline`);
  return response.data.data ?? [];
};

export const addTicketComment = async (ticketId: number, body: string): Promise<TicketComment> => {
  const response = await api.post<ApiResponse<TicketComment>>(`/tickets/${ticketId}/comments`, { body });
  if (!response.data.data) throw new Error(response.data.message || 'Unable to add the comment');
  return response.data.data;
};

export const uploadTicketAttachment = async (ticketId: number, file: File): Promise<TicketAttachment> => {
  const formData = new FormData();
  formData.append('file', file);
  const response = await api.post<ApiResponse<TicketAttachment>>(
    `/tickets/${ticketId}/attachments`,
    formData,
    // Override the api.ts instance default of 'application/json': setting Content-Type
    // to undefined lets the browser generate the correct multipart boundary itself.
    { headers: { 'Content-Type': undefined } }
  );
  if (!response.data.data) throw new Error(response.data.message || 'Unable to upload the attachment');
  return response.data.data;
};

export const deleteTicketAttachment = async (ticketId: number, attachmentId: number): Promise<void> => {
  await api.delete<ApiResponse<null>>(`/tickets/${ticketId}/attachments/${attachmentId}`);
};

export const downloadTicketAttachment = async (
  ticketId: number,
  attachmentId: number,
  fileName: string
): Promise<void> => {
  const response = await api.get<Blob>(`/tickets/${ticketId}/attachments/${attachmentId}/download`, {
    responseType: 'blob'
  });
  const url = URL.createObjectURL(response.data);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  link.click();
  URL.revokeObjectURL(url);
};
