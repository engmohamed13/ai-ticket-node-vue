import { describe, it, expect } from 'vitest';
import router from '../router';

describe('router', () => {
  it('resolves / to the dashboard route', () => {
    expect(router.resolve('/').name).toBe('dashboard');
  });

  it('resolves /health to the system-health route', () => {
    expect(router.resolve('/health').name).toBe('system-health');
  });

  it('resolves /communications to the communications route', () => {
    expect(router.resolve('/communications').name).toBe('communications');
  });

  it('resolves an unknown path to the not-found route', () => {
    expect(router.resolve('/no/such/path').name).toBe('not-found');
  });

  it('resolves /login to the login route', () => {
    expect(router.resolve('/login').name).toBe('login');
  });

  it('resolves /users to the users route', () => {
    expect(router.resolve('/users').name).toBe('users');
  });

  it('resolves /customers to the customers route', () => {
    expect(router.resolve('/customers').name).toBe('customers');
  });

  it('resolves /customers/42 to the customer-detail route', () => {
    const resolved = router.resolve('/customers/42');
    expect(resolved.name).toBe('customer-detail');
    expect(resolved.params.id).toBe('42');
  });

  it('resolves /portal to the customer portal route', () => {
    expect(router.resolve('/portal').name).toBe('portal');
  });

  it('resolves /portal/tickets/42 to the portal-ticket-detail route', () => {
    const resolved = router.resolve('/portal/tickets/42');
    expect(resolved.name).toBe('portal-ticket-detail');
    expect(resolved.params.id).toBe('42');
  });

  it('resolves /dashboard/management to the management-dashboard route', () => {
    expect(router.resolve('/dashboard/management').name).toBe('management-dashboard');
  });

  it('resolves /kb to the knowledge base route', () => {
    expect(router.resolve('/kb').name).toBe('kb');
  });

  it('resolves the /kb/articles alias to the same browse route', () => {
    expect(router.resolve('/kb/articles').name).toBe('kb');
  });

  it('resolves /kb/articles/42 to the kb-article route', () => {
    const resolved = router.resolve('/kb/articles/42');
    expect(resolved.name).toBe('kb-article');
    expect(resolved.params.id).toBe('42');
  });

  it('resolves /kb/manage to the kb-manage route', () => {
    expect(router.resolve('/kb/manage').name).toBe('kb-manage');
  });

  it('resolves /roles to the roles route', () => {
    expect(router.resolve('/roles').name).toBe('roles');
  });

  it('resolves /forbidden to the forbidden route', () => {
    expect(router.resolve('/forbidden').name).toBe('forbidden');
  });
});
