import { Request, Response } from 'express';
import {
  associateInteractionWithTicket,
  createInteraction,
  getInteractionById
} from '../services/interaction.service';
import { ok } from '../utils/apiResponse';

export const createInteractionHandler = async (req: Request, res: Response): Promise<void> => {
  const interaction = await createInteraction(req.body);
  res.status(201).json(ok(interaction, 'Interaction stored'));
};

export const getInteractionHandler = async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params as unknown as { id: number };
  const interaction = await getInteractionById(id);
  res.json(ok(interaction));
};

export const associateInteractionHandler = async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params as unknown as { id: number };
  const { ticketId } = req.body as { ticketId: number };
  const interaction = await associateInteractionWithTicket(id, ticketId);
  res.json(ok(interaction, 'Interaction associated with ticket'));
};
