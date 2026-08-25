export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T | null;
}

export interface ApiHealth {
  status: 'ok';
  environment: string;
  uptimeSeconds: number;
  timestamp: string;
}

export interface DatabaseHealth {
  status: 'up' | 'down';
  latencyMs: number | null;
  schemaVersion: string | null;
  error: string | null;
}

export interface HealthPayload {
  status: 'ok' | 'degraded';
  api: ApiHealth;
  database: DatabaseHealth;
}

export const CHANNELS = ['EMAIL', 'WHATSAPP', 'LIVE_CHAT', 'SMS', 'WEB_FORM'] as const;
export type Channel = (typeof CHANNELS)[number];

export const INTERACTION_DIRECTIONS = ['INBOUND', 'OUTBOUND'] as const;
export type InteractionDirection = (typeof INTERACTION_DIRECTIONS)[number];

export interface Customer {
  id: number;
  name: string;
  email: string;
  phone: string | null;
  createdAt: string;
}

export interface Ticket {
  id: number;
  subject: string;
  status: string;
  customerId: number;
  createdAt: string;
  updatedAt: string;
}

export interface Interaction {
  id: number;
  channel: Channel;
  direction: InteractionDirection;
  subject: string | null;
  body: string;
  externalRef: string;
  customerId: number;
  ticketId: number | null;
  occurredAt: string;
  createdAt: string;
}

export interface CreateInteractionPayload {
  channel: Channel;
  direction: InteractionDirection;
  customerId: number;
  ticketId?: number;
  subject?: string;
  body: string;
}

export const PERMISSIONS = [
  'users:read',
  'users:manage',
  'roles:read',
  'roles:manage',
  'orgunits:read',
  'orgunits:manage',
  'customers:read',
  'tickets:read',
  'tickets:manage',
  'interactions:read',
  'interactions:create',
  'interactions:associate',
  'reports:read'
] as const;
export type Permission = (typeof PERMISSIONS)[number];

export const ROLES = [
  'SYSTEM_ADMINISTRATOR',
  'CRM_MANAGER',
  'SUPPORT_SUPERVISOR',
  'SUPPORT_AGENT',
  'CUSTOMER',
  'REPORTING_USER'
] as const;
export type RoleKey = (typeof ROLES)[number];

export interface AuthUser {
  id: number;
  name: string;
  email: string;
  isActive: boolean;
  roleKey: RoleKey;
  roleName: string;
  permissions: Permission[];
  customerId: number | null;
  department: { id: number; name: string } | null;
  branch: { id: number; name: string; code: string } | null;
}

export interface LoginPayload {
  email: string;
  password: string;
}

export interface LoginResult {
  token: string;
  user: AuthUser;
}

export interface CreateUserPayload {
  name: string;
  email: string;
  password: string;
  roleId: number;
  departmentId?: number;
  branchId?: number;
  customerId?: number;
}

export interface Role {
  id: number;
  key: RoleKey;
  name: string;
  description: string | null;
  permissions: Permission[];
}

export interface PermissionRecord {
  id: number;
  key: Permission;
  description: string;
}

export interface Branch {
  id: number;
  name: string;
  code: string;
  createdAt: string;
}

export interface Department {
  id: number;
  name: string;
  branchId: number;
  createdAt: string;
}
