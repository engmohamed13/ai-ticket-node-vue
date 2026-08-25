import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import UsersView from '../views/UsersView.vue';
import { useAuthStore } from '../stores/auth';
import {
  createUser,
  deactivateUser,
  fetchBranches,
  fetchDepartments,
  fetchPermissions,
  fetchRoles,
  fetchUsers
} from '../services/users.service';

vi.mock('../services/users.service', () => ({
  fetchUsers: vi.fn(),
  fetchRoles: vi.fn(),
  fetchPermissions: vi.fn(),
  fetchBranches: vi.fn(),
  fetchDepartments: vi.fn(),
  createUser: vi.fn(),
  changeUserPassword: vi.fn(),
  deactivateUser: vi.fn(),
  setRolePermissions: vi.fn()
}));

const mockedFetchUsers = fetchUsers as unknown as ReturnType<typeof vi.fn>;
const mockedFetchRoles = fetchRoles as unknown as ReturnType<typeof vi.fn>;
const mockedFetchPermissions = fetchPermissions as unknown as ReturnType<typeof vi.fn>;
const mockedFetchBranches = fetchBranches as unknown as ReturnType<typeof vi.fn>;
const mockedFetchDepartments = fetchDepartments as unknown as ReturnType<typeof vi.fn>;
const mockedCreateUser = createUser as unknown as ReturnType<typeof vi.fn>;
const mockedDeactivateUser = deactivateUser as unknown as ReturnType<typeof vi.fn>;

const usersFixture = [
  { id: 1, name: 'Admin', email: 'admin@crm.local', isActive: true, roleKey: 'SYSTEM_ADMINISTRATOR', roleName: 'System Administrator', permissions: [], customerId: null, department: null, branch: null },
  { id: 2, name: 'Agent', email: 'agent@crm.local', isActive: true, roleKey: 'SUPPORT_AGENT', roleName: 'Support Agent', permissions: [], customerId: null, department: { id: 1, name: 'Support' }, branch: { id: 1, name: 'HQ', code: 'HQ' } }
];

const rolesFixture = [
  { id: 1, key: 'SYSTEM_ADMINISTRATOR', name: 'System Administrator', description: null, permissions: [] },
  { id: 4, key: 'CUSTOMER', name: 'Customer', description: null, permissions: [] }
];

const branchesFixture = [{ id: 1, name: 'HQ', code: 'HQ', createdAt: '2026-01-01' }];
const departmentsFixture = [
  { id: 1, name: 'Support HQ', branchId: 1, createdAt: '2026-01-01' },
  { id: 2, name: 'Support Riyadh', branchId: 2, createdAt: '2026-01-01' }
];

const setupCommonMocks = () => {
  mockedFetchUsers.mockResolvedValue(usersFixture);
  mockedFetchRoles.mockResolvedValue(rolesFixture);
  mockedFetchPermissions.mockResolvedValue([]);
  mockedFetchBranches.mockResolvedValue(branchesFixture);
  mockedFetchDepartments.mockResolvedValue(departmentsFixture);
};

describe('UsersView', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
  });

  it('renders create form and one row per user when the signed-in user has users:manage', async () => {
    setupCommonMocks();
    const auth = useAuthStore();
    auth.token = 'jwt';
    auth.user = { id: 99, name: 'Me', email: 'me@crm.local', isActive: true, roleKey: 'SYSTEM_ADMINISTRATOR', roleName: 'System Administrator', permissions: ['users:read', 'users:manage'], customerId: null, department: null, branch: null };

    const wrapper = mount(UsersView);
    await flushPromises();

    expect(wrapper.find('[data-testid="create-user-form"]').exists()).toBe(true);
    expect(wrapper.findAll('[data-testid="user-row"]')).toHaveLength(2);
  });

  it('hides create form and shows readonly hint with only users:read', async () => {
    setupCommonMocks();
    const auth = useAuthStore();
    auth.token = 'jwt';
    auth.user = { id: 99, name: 'Manager', email: 'manager@crm.local', isActive: true, roleKey: 'CRM_MANAGER', roleName: 'CRM Manager', permissions: ['users:read'], customerId: null, department: null, branch: null };

    const wrapper = mount(UsersView);
    await flushPromises();

    expect(wrapper.find('[data-testid="create-user-form"]').exists()).toBe(false);
    expect(wrapper.find('[data-testid="deactivate-button"]').exists()).toBe(false);
    expect(wrapper.find('[data-testid="users-readonly-hint"]').exists()).toBe(true);
  });

  it('submits the create form with only the populated fields', async () => {
    setupCommonMocks();
    mockedCreateUser.mockResolvedValue({ id: 3, name: 'New Agent', email: 'new.agent@crm.local', isActive: true, roleKey: 'SYSTEM_ADMINISTRATOR', roleName: 'System Administrator', permissions: [], customerId: null, department: null, branch: null });

    const auth = useAuthStore();
    auth.token = 'jwt';
    auth.user = { id: 99, name: 'Me', email: 'me@crm.local', isActive: true, roleKey: 'SYSTEM_ADMINISTRATOR', roleName: 'System Administrator', permissions: ['users:read', 'users:manage'], customerId: null, department: null, branch: null };

    const wrapper = mount(UsersView);
    await flushPromises();

    await wrapper.find('[data-testid="user-name-input"]').setValue('New Agent');
    await wrapper.find('[data-testid="user-email-input"]').setValue('new.agent@crm.local');
    await wrapper.find('[data-testid="user-password-input"]').setValue('Passw0rd!');
    await wrapper.find('[data-testid="user-role-select"]').setValue('1');
    await wrapper.find('[data-testid="create-user-form"]').trigger('submit');
    await flushPromises();

    expect(mockedCreateUser).toHaveBeenCalledWith({
      name: 'New Agent',
      email: 'new.agent@crm.local',
      password: 'Passw0rd!',
      roleId: 1,
      departmentId: undefined,
      branchId: undefined,
      customerId: undefined
    });
  });

  it('reveals the customer id field only when the CUSTOMER role is selected', async () => {
    setupCommonMocks();
    const auth = useAuthStore();
    auth.token = 'jwt';
    auth.user = { id: 99, name: 'Me', email: 'me@crm.local', isActive: true, roleKey: 'SYSTEM_ADMINISTRATOR', roleName: 'System Administrator', permissions: ['users:read', 'users:manage'], customerId: null, department: null, branch: null };

    const wrapper = mount(UsersView);
    await flushPromises();

    expect(wrapper.find('[data-testid="user-customer-input"]').exists()).toBe(false);

    await wrapper.find('[data-testid="user-role-select"]').setValue('4');
    expect(wrapper.find('[data-testid="user-customer-input"]').exists()).toBe(true);

    await wrapper.find('[data-testid="user-role-select"]').setValue('1');
    expect(wrapper.find('[data-testid="user-customer-input"]').exists()).toBe(false);
  });

  it('narrows the department select to the chosen branch', async () => {
    setupCommonMocks();
    const auth = useAuthStore();
    auth.token = 'jwt';
    auth.user = { id: 99, name: 'Me', email: 'me@crm.local', isActive: true, roleKey: 'SYSTEM_ADMINISTRATOR', roleName: 'System Administrator', permissions: ['users:read', 'users:manage'], customerId: null, department: null, branch: null };

    const wrapper = mount(UsersView);
    await flushPromises();

    expect(wrapper.findAll('[data-testid="user-department-select"] option')).toHaveLength(3);

    await wrapper.find('[data-testid="user-branch-select"]').setValue('1');
    expect(wrapper.findAll('[data-testid="user-department-select"] option')).toHaveLength(2);
  });

  it('calls deactivateUser with the row id, disabling the button for the signed-in user', async () => {
    setupCommonMocks();
    mockedDeactivateUser.mockResolvedValue({ ...usersFixture[1], isActive: false });

    const auth = useAuthStore();
    auth.token = 'jwt';
    auth.user = { id: 1, name: 'Admin', email: 'admin@crm.local', isActive: true, roleKey: 'SYSTEM_ADMINISTRATOR', roleName: 'System Administrator', permissions: ['users:read', 'users:manage'], customerId: null, department: null, branch: null };

    const wrapper = mount(UsersView);
    await flushPromises();

    const deactivateButtons = wrapper.findAll('[data-testid="deactivate-button"]');
    expect((deactivateButtons[0].element as HTMLButtonElement).disabled).toBe(true);
    expect((deactivateButtons[1].element as HTMLButtonElement).disabled).toBe(false);

    await deactivateButtons[1].trigger('click');
    await flushPromises();

    expect(mockedDeactivateUser).toHaveBeenCalledWith(2);
  });

  it('renders the backend error message when fetchUsers rejects', async () => {
    mockedFetchUsers.mockRejectedValue(new Error('A user with email x already exists'));
    mockedFetchRoles.mockResolvedValue([]);
    mockedFetchPermissions.mockResolvedValue([]);
    mockedFetchBranches.mockResolvedValue([]);
    mockedFetchDepartments.mockResolvedValue([]);

    const auth = useAuthStore();
    auth.token = 'jwt';
    auth.user = { id: 99, name: 'Me', email: 'me@crm.local', isActive: true, roleKey: 'SYSTEM_ADMINISTRATOR', roleName: 'System Administrator', permissions: ['users:read', 'users:manage'], customerId: null, department: null, branch: null };

    const wrapper = mount(UsersView);
    await flushPromises();

    expect(wrapper.find('[data-testid="users-error"]').text()).toBe('A user with email x already exists');
  });
});
