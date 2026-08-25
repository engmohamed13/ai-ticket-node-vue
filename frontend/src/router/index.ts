import { createRouter, createWebHistory } from 'vue-router';
import CommunicationsView from '../views/CommunicationsView.vue';
import DashboardView from '../views/DashboardView.vue';
import SystemHealthView from '../views/SystemHealthView.vue';
import NotFoundView from '../views/NotFoundView.vue';

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'dashboard',
      component: DashboardView
    },
    {
      path: '/health',
      name: 'system-health',
      component: SystemHealthView
    },
    {
      path: '/communications',
      name: 'communications',
      component: CommunicationsView
    },
    {
      path: '/:pathMatch(.*)*',
      name: 'not-found',
      component: NotFoundView
    }
  ]
});

export default router;
