import { Request, Response } from 'express';
import { getAuth } from '../middleware/auth.middleware';
import { getAuthUserById, login } from '../services/auth.service';
import { ok } from '../utils/apiResponse';

export const loginHandler = async (req: Request, res: Response): Promise<void> => {
  const { email, password } = req.body as { email: string; password: string };
  const result = await login(email, password);
  res.json(ok(result, 'Login successful'));
};

export const logoutHandler = async (_req: Request, res: Response): Promise<void> => {
  res.json(ok(null, 'Logout successful'));
};

export const meHandler = async (req: Request, res: Response): Promise<void> => {
  const auth = getAuth(req);
  const user = await getAuthUserById(auth.userId);
  res.json(ok(user));
};
