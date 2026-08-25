import { Request, Response } from 'express';
import { getAuth } from '../middleware/auth.middleware';
import {
  changeUserPassword,
  createUser,
  deactivateUser,
  getUserById,
  listUsers,
  updateUser
} from '../services/user.service';
import { ok } from '../utils/apiResponse';

export const listUsersHandler = async (_req: Request, res: Response): Promise<void> => {
  res.json(ok(await listUsers()));
};

export const getUserHandler = async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params as unknown as { id: number };
  res.json(ok(await getUserById(id)));
};

export const createUserHandler = async (req: Request, res: Response): Promise<void> => {
  const user = await createUser(req.body);
  res.status(201).json(ok(user, 'User created'));
};

export const updateUserHandler = async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params as unknown as { id: number };
  res.json(ok(await updateUser(id, req.body), 'User updated'));
};

export const changeUserPasswordHandler = async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params as unknown as { id: number };
  const { password } = req.body as { password: string };
  await changeUserPassword(id, password);
  res.json(ok(null, 'Password updated'));
};

export const deactivateUserHandler = async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params as unknown as { id: number };
  const auth = getAuth(req);
  res.json(ok(await deactivateUser(id, auth.userId), 'User deactivated'));
};
