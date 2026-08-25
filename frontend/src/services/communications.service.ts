import api from './api';
import type {
  ApiResponse,
  Customer,
  Interaction,
  CreateInteractionPayload,
  Ticket
} from '../types';

export const fetchCustomers = async (): Promise<Customer[]> => {
  const response = await api.get<ApiResponse<Customer[]>>('/customers');
  return response.data.data ?? [];
};

export const fetchTickets = async (customerId?: number): Promise<Ticket[]> => {
  const response = await api.get<ApiResponse<Ticket[]>>('/tickets', {
    params: customerId === undefined ? undefined : { customerId }
  });
  return response.data.data ?? [];
};

export const fetchCustomerTimeline = async (customerId: number): Promise<Interaction[]> => {
  const response = await api.get<ApiResponse<Interaction[]>>(`/customers/${customerId}/timeline`);
  return response.data.data ?? [];
};

export const createInteraction = async (payload: CreateInteractionPayload): Promise<Interaction> => {
  const response = await api.post<ApiResponse<Interaction>>('/interactions', payload);
  if (!response.data.data) throw new Error(response.data.message || 'Empty interaction response');
  return response.data.data;
};

export const associateInteraction = async (interactionId: number, ticketId: number): Promise<Interaction> => {
  const response = await api.patch<ApiResponse<Interaction>>(`/interactions/${interactionId}/associate`, {
    ticketId
  });
  if (!response.data.data) throw new Error(response.data.message || 'Empty interaction response');
  return response.data.data;
};
