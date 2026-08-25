import { Request, Response } from 'express';
import {
  createBranch,
  createDepartment,
  listBranches,
  listDepartments
} from '../services/orgUnit.service';
import { ok } from '../utils/apiResponse';

export const listBranchesHandler = async (_req: Request, res: Response): Promise<void> => {
  res.json(ok(await listBranches()));
};

export const createBranchHandler = async (req: Request, res: Response): Promise<void> => {
  const branch = await createBranch(req.body);
  res.status(201).json(ok(branch, 'Branch created'));
};

export const listDepartmentsHandler = async (req: Request, res: Response): Promise<void> => {
  const { branchId } = req.query as unknown as { branchId?: number };
  res.json(ok(await listDepartments(branchId)));
};

export const createDepartmentHandler = async (req: Request, res: Response): Promise<void> => {
  const department = await createDepartment(req.body);
  res.status(201).json(ok(department, 'Department created'));
};
