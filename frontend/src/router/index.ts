import { createRouter, createWebHistory } from 'vue-router';
import CommunicationsView from '../views/CommunicationsView.vue';
import CustomerPortalTicketDetailView from '../views/CustomerPortalTicketDetailView.vue';
import CustomerPortalView from '../views/CustomerPortalView.vue';
import CustomerDetailView from '../views/CustomerDetailView.vue';
import CustomersView from '../views/CustomersView.vue';
import DashboardView from '../views/DashboardView.vue';
import ForbiddenView from '../views/ForbiddenView.vue';
import KnowledgeBaseArticleView from '../views/KnowledgeBaseArticleView.vue';
import KnowledgeBaseManageView from '../views/KnowledgeBaseManageView.vue';
import KnowledgeBaseView from '../views/KnowledgeBaseView.vue';
import LoginView from '../views/LoginView.vue';
import ManagementDashboardView from '../views/ManagementDashboardView.vue';
import NotFoundView from '../views/NotFoundView.vue';
import RolesView from '../views/RolesView.vue';
import SystemHealthView from '../views/SystemHealthView.vue';
import TicketDetailView from '../views/TicketDetailView.vue';
import TicketsView from '../views/TicketsView.vue';
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
    /**
     * Customer-portal route. Staff hold `tickets:read` too, so a permission alone cannot
     * express "the customer's own view" — this flag checks the role instead, mirroring the
     * backend's `isCustomerScoped` (backend/src/auth/scope.ts).
     */
    customerOnly?: boolean;
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
      path: '/tickets',
      name: 'tickets',
      component: TicketsView,
      meta: { navLabel: 'Tickets', permission: 'tickets:read' }
    },
    {
      path: '/tickets/:id',
      name: 'ticket-detail',
      component: TicketDetailView,
      meta: { permission: 'tickets:read' }
    },
    {
      path: '/dashboard/management',
      name: 'management-dashboard',
      component: ManagementDashboardView,
      meta: { navLabel: 'Reports', permission: 'reports:read' }
    },
    {
      // `/kb/articles` is the same browse-and-search screen, so it is an alias rather than a
      // second near-identical view.
      path: '/kb',
      alias: '/kb/articles',
      name: 'kb',
      component: KnowledgeBaseView,
      meta: { navLabel: 'Knowledge Base', permission: 'kb:read' }
    },
    {
      path: '/kb/manage',
      name: 'kb-manage',
      component: KnowledgeBaseManageView,
      meta: { permission: 'kb:manage' }
    },
    {
      path: '/kb/articles/:id',
      name: 'kb-article',
      component: KnowledgeBaseArticleView,
      meta: { permission: 'kb:read' }
    },
    {
      path: '/portal',
      name: 'portal',
      component: CustomerPortalView,
      meta: { navLabel: 'My Tickets', permission: 'tickets:read', customerOnly: true }
    },
    {
      path: '/portal/tickets/:id',
      name: 'portal-ticket-detail',
      component: CustomerPortalTicketDetailView,
      meta: { permission: 'tickets:read', customerOnly: true }
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

  if (to.meta.customerOnly && auth.user?.roleKey !== 'CUSTOMER') {
    return { name: 'forbidden' };
  }

  return true;
});

export default router;
