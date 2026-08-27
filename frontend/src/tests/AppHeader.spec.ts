import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import AppHeader from '../components/AppHeader.vue';
import { useAuthStore } from '../stores/auth';
import { useHealthStore } from '../stores/health';
import { applyDocumentLocale } from '../config/i18n';
import { i18n } from './setup';
import type { AuthUser } from '../types';

vi.mock('../services/auth.service', () => ({
  login: vi.fn(),
  logout: vi.fn().mockResolvedValue(undefined),
  fetchCurrentUser: vi.fn()
}));

vi.mock('../services/notifications.service', () => ({
  fetchNotifications: vi.fn().mockResolvedValue({ items: [], unreadCount: 0 }),
  markNotificationRead: vi.fn(),
  markAllNotificationsRead: vi.fn()
}));

// `useRouter()` reads from injection, so a `$router` mock will not reach it — the
// composable itself is stubbed instead.
const push = vi.fn();
vi.mock('vue-router', () => ({
  useRouter: () => ({ push }),
  useRoute: () => ({ name: 'dashboard', meta: {}, query: {} })
}));

const adminUser: AuthUser = {
  id: 1,
  name: 'Ada Lovelace',
  email: 'admin@crm.local',
  isActive: true,
  roleKey: 'SYSTEM_ADMINISTRATOR',
  roleName: 'System Administrator',
  permissions: ['users:read'],
  customerId: null,
  department: null,
  branch: null
};

const mountHeader = () =>
  mount(AppHeader, {
    global: {
      stubs: {
        RouterLink: { template: '<a><slot /></a>' },
        NotificationCenter: { template: '<div class="notification-center-stub" />' }
      }
    }
  });

describe('AppHeader', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
    localStorage.clear();
    i18n.global.locale.value = 'en';
    applyDocumentLocale('en');
  });

  afterEach(() => {
    i18n.global.locale.value = 'en';
    applyDocumentLocale('en');
  });

  it('renders the translated brand name', () => {
    const wrapper = mountHeader();
    expect(wrapper.find('.brand-name').text()).toBe('CustomerSupportCRM');
  });

  it('labels the nav toggle for assistive tech and emits toggle-nav on click', async () => {
    const wrapper = mountHeader();
    const toggle = wrapper.find('.nav-toggle');

    expect(toggle.attributes('aria-label')).toBe('Toggle navigation menu');

    await toggle.trigger('click');
    expect(wrapper.emitted('toggle-nav')).toHaveLength(1);
  });

  it('shows the health status pill from the health store', async () => {
    const health = useHealthStore();
    health.payload = {
      status: 'ok',
      api: { status: 'ok', environment: 'test', uptimeSeconds: 1, timestamp: 'now' },
      database: { status: 'up', latencyMs: 2, schemaVersion: '1', error: null }
    };
    const wrapper = mountHeader();
    await flushPromises();

    expect(wrapper.find('[data-testid="header-status-pill"]').text()).toBe('ok');
  });

  it('hides the user block and language switcher when signed out', () => {
    const wrapper = mountHeader();
    expect(wrapper.find('[data-testid="header-user"]').exists()).toBe(false);
    expect(wrapper.find('[data-testid="language-switcher"]').exists()).toBe(false);
  });

  it('shows the signed-in name, role, initials, and a language switcher', () => {
    const auth = useAuthStore();
    auth.token = 'jwt';
    auth.user = adminUser;

    const wrapper = mountHeader();

    expect(wrapper.find('[data-testid="header-user"]').exists()).toBe(true);
    expect(wrapper.text()).toContain('Ada Lovelace');
    expect(wrapper.find('[data-testid="header-role"]').text()).toBe('System Administrator');
    expect(wrapper.find('.user-avatar').text()).toBe('AL');
    expect(wrapper.find('[data-testid="language-switcher"]').exists()).toBe(true);
  });

  it('keeps the notification centre in the header', () => {
    const auth = useAuthStore();
    auth.token = 'jwt';
    auth.user = adminUser;

    const wrapper = mountHeader();
    expect(wrapper.find('.notification-center-stub').exists()).toBe(true);
  });

  it('renders a translated logout label', () => {
    const auth = useAuthStore();
    auth.token = 'jwt';
    auth.user = adminUser;

    const wrapper = mountHeader();
    expect(wrapper.find('[data-testid="logout-button"]').text()).toBe('Logout');
  });

  it('translates the header into Arabic when the locale changes', async () => {
    const auth = useAuthStore();
    auth.token = 'jwt';
    auth.user = adminUser;

    const wrapper = mountHeader();
    i18n.global.locale.value = 'ar';
    await flushPromises();

    expect(wrapper.find('.brand-name').text()).toBe('نظام دعم العملاء');
    expect(wrapper.find('[data-testid="logout-button"]').text()).toBe('تسجيل الخروج');
    expect(wrapper.find('.nav-toggle').attributes('aria-label')).toBe('إظهار أو إخفاء قائمة التنقل');
  });

  it('signs out and navigates to login when logout is clicked', async () => {
    const auth = useAuthStore();
    auth.token = 'jwt';
    auth.user = adminUser;
    const signOut = vi.spyOn(auth, 'signOut').mockResolvedValue(undefined);

    const wrapper = mountHeader();

    await wrapper.find('[data-testid="logout-button"]').trigger('click');
    await flushPromises();

    expect(signOut).toHaveBeenCalledTimes(1);
    expect(push).toHaveBeenCalledWith({ name: 'login' });
  });
});
