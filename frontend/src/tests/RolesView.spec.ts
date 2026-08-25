import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import RolesView from '../views/RolesView.vue';
import { useAuthStore } from '../stores/auth';
import { fetchPermissions, fetchRoles, setRolePermissions } from '../services/users.service';

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

const mockedFetchRoles = fetchRoles as unknown as ReturnType<typeof vi.fn>;
const mockedFetchPermissions = fetchPermissions as unknown as ReturnType<typeof vi.fn>;
const mockedSetRolePermissions = setRolePermissions as unknown as ReturnType<typeof vi.fn>;

const rolesFixture = [
  { id: 1, key: 'SYSTEM_ADMINISTRATOR', name: 'System Administrator', description: null, permissions: ['users:read', 'users:manage'] },
  { id: 4, key: 'SUPPORT_AGENT', name: 'Support Agent', description: null, permissions: ['tickets:read'] }
];

const permissionsFixture = [
  { id: 1, key: 'users:read', description: 'View users' },
  { id: 2, key: 'users:manage', description: 'Manage users' },
  { id: 3, key: 'tickets:read', description: 'View tickets' }
];

describe('RolesView', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
  });

  it('renders one role card per role and one checkbox per permission', async () => {
    mockedFetchRoles.mockResolvedValue(rolesFixture);
    mockedFetchPermissions.mockResolvedValue(permissionsFixture);

    const auth = useAuthStore();
    auth.token = 'jwt';
    auth.user = { id: 1, name: 'Admin', email: 'admin@crm.local', isActive: true, roleKey: 'SYSTEM_ADMINISTRATOR', roleName: 'System Administrator', permissions: ['roles:read', 'roles:manage'], customerId: null, department: null, branch: null };

    const wrapper = mount(RolesView);
    await flushPromises();

    const cards = wrapper.findAll('[data-testid="role-card"]');
    expect(cards).toHaveLength(2);
    expect(wrapper.findAll('[data-testid="permission-checkbox"]')).toHaveLength(6);
  });

  it('pre-checks checkboxes to match each role permissions array', async () => {
    mockedFetchRoles.mockResolvedValue(rolesFixture);
    mockedFetchPermissions.mockResolvedValue(permissionsFixture);

    const auth = useAuthStore();
    auth.token = 'jwt';
    auth.user = { id: 1, name: 'Admin', email: 'admin@crm.local', isActive: true, roleKey: 'SYSTEM_ADMINISTRATOR', roleName: 'System Administrator', permissions: ['roles:read', 'roles:manage'], customerId: null, department: null, branch: null };

    const wrapper = mount(RolesView);
    await flushPromises();

    const cards = wrapper.findAll('[data-testid="role-card"]');
    const adminCheckboxes = cards[0].findAll('[data-testid="permission-checkbox"]');
    expect((adminCheckboxes[0].element as HTMLInputElement).checked).toBe(true); // users:read
    expect((adminCheckboxes[1].element as HTMLInputElement).checked).toBe(true); // users:manage
    expect((adminCheckboxes[2].element as HTMLInputElement).checked).toBe(false); // tickets:read

    const agentCheckboxes = cards[1].findAll('[data-testid="permission-checkbox"]');
    expect((agentCheckboxes[0].element as HTMLInputElement).checked).toBe(false);
    expect((agentCheckboxes[2].element as HTMLInputElement).checked).toBe(true);
  });

  it('with roles:manage, toggling and saving calls setRolePermissions with the updated list', async () => {
    mockedFetchRoles.mockResolvedValue(rolesFixture);
    mockedFetchPermissions.mockResolvedValue(permissionsFixture);
    mockedSetRolePermissions.mockResolvedValue(rolesFixture[1]);

    const auth = useAuthStore();
    auth.token = 'jwt';
    auth.user = { id: 1, name: 'Admin', email: 'admin@crm.local', isActive: true, roleKey: 'SYSTEM_ADMINISTRATOR', roleName: 'System Administrator', permissions: ['roles:read', 'roles:manage'], customerId: null, department: null, branch: null };

    const wrapper = mount(RolesView);
    await flushPromises();

    const cards = wrapper.findAll('[data-testid="role-card"]');
    const agentCheckboxes = cards[1].findAll('[data-testid="permission-checkbox"]');
    await agentCheckboxes[0].setValue(true); // check users:read on Support Agent

    await cards[1].find('[data-testid="save-role-button"]').trigger('click');
    await flushPromises();

    expect(mockedSetRolePermissions).toHaveBeenCalledWith(4, ['tickets:read', 'users:read']);
  });

  it('without roles:manage, checkboxes are disabled and no save button renders', async () => {
    mockedFetchRoles.mockResolvedValue(rolesFixture);
    mockedFetchPermissions.mockResolvedValue(permissionsFixture);

    const auth = useAuthStore();
    auth.token = 'jwt';
    auth.user = { id: 1, name: 'Manager', email: 'manager@crm.local', isActive: true, roleKey: 'CRM_MANAGER', roleName: 'CRM Manager', permissions: ['roles:read'], customerId: null, department: null, branch: null };

    const wrapper = mount(RolesView);
    await flushPromises();

    const checkboxes = wrapper.findAll('[data-testid="permission-checkbox"]');
    for (const checkbox of checkboxes) {
      expect((checkbox.element as HTMLInputElement).disabled).toBe(true);
    }
    expect(wrapper.find('[data-testid="save-role-button"]').exists()).toBe(false);
  });

  it('renders the admin warning only on the SYSTEM_ADMINISTRATOR card', async () => {
    mockedFetchRoles.mockResolvedValue(rolesFixture);
    mockedFetchPermissions.mockResolvedValue(permissionsFixture);

    const auth = useAuthStore();
    auth.token = 'jwt';
    auth.user = { id: 1, name: 'Admin', email: 'admin@crm.local', isActive: true, roleKey: 'SYSTEM_ADMINISTRATOR', roleName: 'System Administrator', permissions: ['roles:read', 'roles:manage'], customerId: null, department: null, branch: null };

    const wrapper = mount(RolesView);
    await flushPromises();

    const cards = wrapper.findAll('[data-testid="role-card"]');
    expect(cards[0].find('[data-testid="admin-role-warning"]').exists()).toBe(true);
    expect(cards[1].find('[data-testid="admin-role-warning"]').exists()).toBe(false);
  });
});
