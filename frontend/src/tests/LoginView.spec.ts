import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { createRouter, createWebHistory } from 'vue-router';
import LoginView from '../views/LoginView.vue';
import { login } from '../services/auth.service';

vi.mock('../services/auth.service', () => ({
  login: vi.fn(),
  logout: vi.fn(),
  fetchCurrentUser: vi.fn()
}));

const mockedLogin = login as unknown as ReturnType<typeof vi.fn>;

const mountLogin = async (initialPath = '/login') => {
  const router = createRouter({
    history: createWebHistory(),
    routes: [
      { path: '/login', name: 'login', component: LoginView },
      { path: '/', name: 'dashboard', component: { template: '<div>dashboard</div>' } },
      { path: '/users', name: 'users', component: { template: '<div>users</div>' } }
    ]
  });
  await router.push(initialPath);
  await router.isReady();

  const wrapper = mount(LoginView, { global: { plugins: [router] } });
  await flushPromises();
  return { wrapper, router };
};

describe('LoginView', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    localStorage.clear();
    vi.clearAllMocks();
  });

  it('submits trimmed email and password to login', async () => {
    mockedLogin.mockResolvedValue({
      token: 'jwt-123',
      user: {
        id: 1,
        name: 'Admin',
        email: 'admin@crm.local',
        isActive: true,
        roleKey: 'SYSTEM_ADMINISTRATOR',
        roleName: 'System Administrator',
        permissions: [],
        customerId: null,
        department: null,
        branch: null
      }
    });

    const { wrapper } = await mountLogin();

    await wrapper.find('[data-testid="login-email"]').setValue('  admin@crm.local  ');
    await wrapper.find('[data-testid="login-password"]').setValue('Passw0rd!');
    await wrapper.find('[data-testid="login-form"]').trigger('submit');
    await flushPromises();

    expect(mockedLogin).toHaveBeenCalledWith({ email: 'admin@crm.local', password: 'Passw0rd!' });
  });

  it('renders the backend error message and clears the password on failure', async () => {
    const { AxiosError } = await import('axios');
    mockedLogin.mockRejectedValue(
      new AxiosError('Request failed with status code 401', undefined, undefined, undefined, {
        status: 401,
        data: { success: false, message: 'Invalid email or password', data: null },
        statusText: 'Unauthorized',
        headers: {},
        config: {} as never
      })
    );

    const { wrapper } = await mountLogin();

    await wrapper.find('[data-testid="login-email"]').setValue('admin@crm.local');
    await wrapper.find('[data-testid="login-password"]').setValue('wrong');
    await wrapper.find('[data-testid="login-form"]').trigger('submit');
    await flushPromises();

    expect(wrapper.find('[data-testid="login-error"]').text()).toBe('Invalid email or password');
    expect((wrapper.find('[data-testid="login-password"]').element as HTMLInputElement).value).toBe('');
  });

  it('disables the submit button while loading', async () => {
    let resolveLogin: (value: unknown) => void = () => {};
    mockedLogin.mockReturnValue(
      new Promise((resolve) => {
        resolveLogin = resolve;
      })
    );

    const { wrapper } = await mountLogin();

    await wrapper.find('[data-testid="login-email"]').setValue('admin@crm.local');
    await wrapper.find('[data-testid="login-password"]').setValue('Passw0rd!');
    await wrapper.find('[data-testid="login-form"]').trigger('submit');
    await flushPromises();

    expect((wrapper.find('[data-testid="login-submit"]').element as HTMLButtonElement).disabled).toBe(true);

    resolveLogin({
      token: 'jwt-1',
      user: {
        id: 1,
        name: 'Admin',
        email: 'admin@crm.local',
        isActive: true,
        roleKey: 'SYSTEM_ADMINISTRATOR',
        roleName: 'System Administrator',
        permissions: [],
        customerId: null,
        department: null,
        branch: null
      }
    });
    await flushPromises();
  });

  it('does not call login when the password is empty', async () => {
    const { wrapper } = await mountLogin();

    await wrapper.find('[data-testid="login-email"]').setValue('admin@crm.local');
    await wrapper.find('[data-testid="login-form"]').trigger('submit');
    await flushPromises();

    expect(mockedLogin).not.toHaveBeenCalled();
  });
});
