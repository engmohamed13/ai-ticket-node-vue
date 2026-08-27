import { createApp } from 'vue';
import { createPinia } from 'pinia';
import './style.css';
import App from './App.vue';
import router from './router';
import { onUnauthorized } from './services/authEvents';
import { useAuthStore } from './stores/auth';
import { applyDocumentLocale, createAppI18n, resolveInitialLocale } from './config/i18n';

const locale = resolveInitialLocale();
// Set `dir`/`lang` before the first paint so an Arabic session never renders LTR first.
applyDocumentLocale(locale);

const app = createApp(App);
app.use(createPinia());
app.use(createAppI18n(locale));
app.use(router);

// A 401 from any API call ends the session and returns to the login screen.
onUnauthorized(() => {
  useAuthStore().clear();
  if (router.currentRoute.value.name !== 'login') {
    void router.push({ name: 'login' });
  }
});

app.mount('#app');
