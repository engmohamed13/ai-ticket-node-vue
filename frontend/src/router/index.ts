import { createRouter, createWebHistory } from 'vue-router';
import LoginView from '../views/LoginView.vue';
import DashboardView from '../views/DashboardView.vue';
import TicketsView from '../views/TicketsView.vue';
import TicketCreateView from '../views/TicketCreateView.vue';
import TicketEditView from '../views/TicketEditView.vue';
import TicketCommentsView from '../views/TicketCommentsView.vue';

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/login',
      name: 'login',
      component: LoginView
    },
    {
      path: '/',
      name: 'home',
      component: DashboardView,
      meta: { requiresAuth: true }
    },
    {
      path: '/tickets',
      name: 'tickets',
      component: TicketsView,
      meta: { requiresAuth: true }
    },
    {
      path: '/tickets/new',
      name: 'create-ticket',
      component: TicketCreateView,
      meta: { requiresAuth: true }
    },
    {
      path: '/tickets/:id/edit',
      name: 'edit-ticket',
      component: TicketEditView,
      meta: { requiresAuth: true }
    },
    {
      path: '/tickets/:id/comments',
      name: 'ticket-comments',
      component: TicketCommentsView,
      meta: { requiresAuth: true }
    }
  ]
});

router.beforeEach((to, _from, next) => {
  const token = localStorage.getItem('token');
  if (to.meta.requiresAuth && !token) {
    next({ name: 'login' });
  } else if (to.name === 'login' && token) {
    next({ name: 'home' });
  } else {
    next();
  }
});

export default router;
