import { createRouter, createWebHistory } from 'vue-router';
import CommunicationsView from '../views/CommunicationsView.vue';
import CustomerDetailView from '../views/CustomerDetailView.vue';
import CustomersView from '../views/CustomersView.vue';
import DashboardView from '../views/DashboardView.vue';
import ForbiddenView from '../views/ForbiddenView.vue';
import LoginView from '../views/LoginView.vue';
import NotFoundView from '../views/NotFoundView.vue';
import RolesView from '../views/RolesView.vue';
import SystemHealthView from '../views/SystemHealthView.vue';
import UsersView from '../views/UsersView.vue';
import { useAuthStore } from '../stores/auth';
import type { Permission } from '../types';

declare module 'vue-router' {
  interface RouteMeta {
    /** Reachable without a session. */
    public?: boolean;
    /** Permission the signed-in user must hold to enter. */
    permission?: Permission;
    /** Sidebar label; absent means the route is not listed in the sidebar. */
    navLabel?: string;
  }
}

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/login',
      name: 'login',
      component: LoginView,
      meta: { public: true }
    },
    {
      path: '/',
      name: 'dashboard',
      component: DashboardView,
      meta: { navLabel: 'Dashboard' }
    },
    {
      path: '/health',
      name: 'system-health',
      component: SystemHealthView,
      meta: { navLabel: 'System Health' }
    },
    {
      path: '/communications',
      name: 'communications',
      component: CommunicationsView,
      meta: { navLabel: 'Communications', permission: 'interactions:read' }
    },
    {
      path: '/customers',
      name: 'customers',
      component: CustomersView,
      meta: { navLabel: 'Customers', permission: 'customers:read' }
    },
    {
      path: '/customers/:id',
      name: 'customer-detail',
      component: CustomerDetailView,
      meta: { permission: 'customers:read' }
    },
    {
      path: '/users',
      name: 'users',
      component: UsersView,
      meta: { navLabel: 'Users', permission: 'users:read' }
    },
    {
      path: '/roles',
      name: 'roles',
      component: RolesView,
      meta: { navLabel: 'Roles & Permissions', permission: 'roles:read' }
    },
    {
      path: '/forbidden',
      name: 'forbidden',
      component: ForbiddenView
    },
    {
      path: '/:pathMatch(.*)*',
      name: 'not-found',
      component: NotFoundView
    }
  ]
});

router.beforeEach((to) => {
  const auth = useAuthStore();
  auth.restore();

  if (to.meta.public) {
    // An already-signed-in user has no business on the login screen.
    return auth.isAuthenticated && to.name === 'login' ? { name: 'dashboard' } : true;
  }

  if (!auth.isAuthenticated) {
    return { name: 'login', query: { redirect: to.fullPath } };
  }

  if (to.meta.permission && !auth.can(to.meta.permission)) {
    return { name: 'forbidden' };
  }

  return true;
});

export default router;
