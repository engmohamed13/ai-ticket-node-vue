import { Request, Response } from 'express';
import { listPermissions, listRoles, setRolePermissions } from '../services/role.service';
import { ok } from '../utils/apiResponse';

export const listRolesHandler = async (_req: Request, res: Response): Promise<void> => {
  res.json(ok(await listRoles()));
};

export const listPermissionsHandler = async (_req: Request, res: Response): Promise<void> => {
  res.json(ok(await listPermissions()));
};

export const setRolePermissionsHandler = async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params as unknown as { id: number };
  const { permissions } = req.body as { permissions: string[] };
  res.json(ok(await setRolePermissions(id, permissions), 'Role permissions updated'));
};
