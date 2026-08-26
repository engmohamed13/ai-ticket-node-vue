import { describe, it, expect, beforeEach } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { createRouter, createWebHistory } from 'vue-router';
import AppSidebar from '../components/AppSidebar.vue';
import { useAuthStore } from '../stores/auth';
import CommunicationsView from '../views/CommunicationsView.vue';
import CustomerPortalView from '../views/CustomerPortalView.vue';
import DashboardView from '../views/DashboardView.vue';
import ForbiddenView from '../views/ForbiddenView.vue';
import LoginView from '../views/LoginView.vue';
import NotFoundView from '../views/NotFoundView.vue';
import RolesView from '../views/RolesView.vue';
import SystemHealthView from '../views/SystemHealthView.vue';
import UsersView from '../views/UsersView.vue';

const buildRouter = () =>
  createRouter({
    history: createWebHistory(),
    routes: [
      { path: '/login', name: 'login', component: LoginView, meta: { public: true } },
      { path: '/', name: 'dashboard', component: DashboardView, meta: { navLabel: 'Dashboard' } },
      { path: '/health', name: 'system-health', component: SystemHealthView, meta: { navLabel: 'System Health' } },
      {
        path: '/communications',
        name: 'communications',
        component: CommunicationsView,
        meta: { navLabel: 'Communications', permission: 'interactions:read' }
      },
      { path: '/users', name: 'users', component: UsersView, meta: { navLabel: 'Users', permission: 'users:read' } },
      {
        path: '/roles',
        name: 'roles',
        component: RolesView,
        meta: { navLabel: 'Roles & Permissions', permission: 'roles:read' }
      },
      {
        path: '/portal',
        name: 'portal',
        component: CustomerPortalView,
        meta: { navLabel: 'My Tickets', permission: 'tickets:read', customerOnly: true }
      },
      { path: '/forbidden', name: 'forbidden', component: ForbiddenView },
      { path: '/:pathMatch(.*)*', name: 'not-found', component: NotFoundView }
    ]
  });

describe('AppSidebar', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  it('renders Users and Roles links for a full-permission administrator', async () => {
    const router = buildRouter();
    await router.push('/');
    await router.isReady();

    const auth = useAuthStore();
    auth.token = 'jwt';
    auth.user = {
      id: 1,
      name: 'Admin',
      email: 'admin@crm.local',
      isActive: true,
      roleKey: 'SYSTEM_ADMINISTRATOR',
      roleName: 'System Administrator',
      permissions: [
        'users:read',
        'users:manage',
        'roles:read',
        'roles:manage',
        'interactions:read'
      ],
      customerId: null,
      department: null,
      branch: null
    };

    const wrapper = mount(AppSidebar, { global: { plugins: [router] } });
    await flushPromises();

    const labels = wrapper.findAll('[data-testid="sidebar-link"]').map((link) => link.text());
    expect(labels).toContain('Users');
    expect(labels).toContain('Roles & Permissions');
  });

  it('renders only Dashboard, System Health, and Communications for a Support Agent', async () => {
    const router = buildRouter();
    await router.push('/');
    await router.isReady();

    const auth = useAuthStore();
    auth.token = 'jwt';
    auth.user = {
      id: 2,
      name: 'Agent',
      email: 'agent@crm.local',
      isActive: true,
      roleKey: 'SUPPORT_AGENT',
      roleName: 'Support Agent',
      permissions: ['customers:read', 'tickets:read', 'interactions:read', 'interactions:create', 'interactions:associate'],
      customerId: null,
      department: null,
      branch: null
    };

    const wrapper = mount(AppSidebar, { global: { plugins: [router] } });
    await flushPromises();

    const labels = wrapper.findAll('[data-testid="sidebar-link"]').map((link) => link.text());
    expect(labels).toEqual(['Dashboard', 'System Health', 'Communications']);
    expect(labels).not.toContain('Users');
    expect(labels).not.toContain('Roles & Permissions');
  });

  it('never renders a link to login, forbidden, or not-found', async () => {
    const router = buildRouter();
    await router.push('/');
    await router.isReady();

    const auth = useAuthStore();
    auth.token = 'jwt';
    auth.user = {
      id: 1,
      name: 'Admin',
      email: 'admin@crm.local',
      isActive: true,
      roleKey: 'SYSTEM_ADMINISTRATOR',
      roleName: 'System Administrator',
      permissions: ['users:read', 'roles:read', 'interactions:read'],
      customerId: null,
      department: null,
      branch: null
    };

    const wrapper = mount(AppSidebar, { global: { plugins: [router] } });
    await flushPromises();

    const targets = wrapper.findAll('[data-testid="sidebar-link"]').map((link) => link.attributes('href'));
    expect(targets.some((href) => href?.includes('login'))).toBe(false);
    expect(targets.some((href) => href?.includes('forbidden'))).toBe(false);
  });

  it('lists My Tickets for a CUSTOMER-role user', async () => {
    const router = buildRouter();
    await router.push('/');
    await router.isReady();

    const auth = useAuthStore();
    auth.token = 'jwt';
    auth.user = {
      id: 3,
      name: 'Demo Customer',
      email: 'demo.customer@example.com',
      isActive: true,
      roleKey: 'CUSTOMER',
      roleName: 'Customer',
      permissions: ['tickets:read', 'interactions:read', 'feedback:read', 'feedback:write'],
      customerId: 10,
      department: null,
      branch: null
    };

    const wrapper = mount(AppSidebar, { global: { plugins: [router] } });
    await flushPromises();

    const labels = wrapper.findAll('[data-testid="sidebar-link"]').map((link) => link.text());
    expect(labels).toContain('My Tickets');
  });

  it('hides My Tickets from staff even though they hold tickets:read', async () => {
    const router = buildRouter();
    await router.push('/');
    await router.isReady();

    const auth = useAuthStore();
    auth.token = 'jwt';
    auth.user = {
      id: 2,
      name: 'Agent',
      email: 'agent@crm.local',
      isActive: true,
      roleKey: 'SUPPORT_AGENT',
      roleName: 'Support Agent',
      permissions: ['tickets:read', 'tickets:manage', 'interactions:read'],
      customerId: null,
      department: null,
      branch: null
    };

    const wrapper = mount(AppSidebar, { global: { plugins: [router] } });
    await flushPromises();

    const labels = wrapper.findAll('[data-testid="sidebar-link"]').map((link) => link.text());
    expect(labels).not.toContain('My Tickets');
  });
});
