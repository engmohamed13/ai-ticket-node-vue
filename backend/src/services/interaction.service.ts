import { getChannelAdapter } from '../channels/registry';
import type { Channel, InteractionDirection } from '../channels/types';
import { prisma } from '../db/prisma';
import { AppError } from '../utils/AppError';

export interface CreateInteractionInput {
  channel: Channel;
  direction: InteractionDirection;
  customerId: number;
  ticketId?: number;
  subject?: string;
  body: string;
}

const assertTicketBelongsToCustomer = async (ticketId: number, customerId: number): Promise<void> => {
  const ticket = await prisma.ticket.findUnique({ where: { id: ticketId } });
  if (!ticket) throw new AppError(404, `Ticket ${ticketId} not found`);
  if (ticket.customerId !== customerId) {
    throw new AppError(400, `Ticket ${ticketId} does not belong to customer ${customerId}`);
  }
};

export const createInteraction = async (input: CreateInteractionInput) => {
  const customer = await prisma.customer.findUnique({ where: { id: input.customerId } });
  if (!customer) throw new AppError(404, `Customer ${input.customerId} not found`);

  if (input.ticketId !== undefined) {
    await assertTicketBelongsToCustomer(input.ticketId, input.customerId);
  }

  const adapter = getChannelAdapter(input.channel);
  const message =
    input.direction === 'INBOUND'
      ? adapter.simulateInbound({ subject: input.subject ?? null, body: input.body })
      : adapter.deliver({ subject: input.subject ?? null, body: input.body });

  return prisma.interaction.create({
    data: { ...message, customerId: input.customerId, ticketId: input.ticketId ?? null }
  });
};

export const getInteractionById = async (id: number) => {
  const interaction = await prisma.interaction.findUnique({ where: { id } });
  if (!interaction) throw new AppError(404, `Interaction ${id} not found`);
  return interaction;
};

export const associateInteractionWithTicket = async (interactionId: number, ticketId: number) => {
  const interaction = await getInteractionById(interactionId);
  await assertTicketBelongsToCustomer(ticketId, interaction.customerId);

  return prisma.interaction.update({ where: { id: interactionId }, data: { ticketId } });
};
