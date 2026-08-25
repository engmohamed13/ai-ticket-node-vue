<script setup lang="ts">
import { ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useAuthStore } from '../stores/auth';
import AlertBanner from '../components/ui/AlertBanner.vue';

const auth = useAuthStore();
const router = useRouter();
const route = useRoute();

const email = ref('');
const password = ref('');

const onSubmit = async (): Promise<void> => {
  if (email.value.trim().length === 0 || password.value.length === 0) return;
  const signedIn = await auth.signIn({ email: email.value.trim(), password: password.value });
  if (!signedIn) {
    password.value = '';
    return;
  }
  const redirect = typeof route.query.redirect === 'string' ? route.query.redirect : '/';
  await router.replace(redirect);
};
</script>

<template>
  <div class="login-page">
    <form class="login-card card" data-testid="login-form" @submit.prevent="onSubmit">
      <div class="login-brand">
        <span class="brand-mark" aria-hidden="true">CS</span>
        <h1>CustomerSupportCRM</h1>
      </div>
      <p class="subtitle">Sign in to continue to your workspace</p>

      <AlertBanner v-if="auth.error" variant="error" data-testid="login-error">{{ auth.error }}</AlertBanner>

      <div class="form-field">
        <label for="login-email">Email</label>
        <input
          id="login-email"
          v-model="email"
          data-testid="login-email"
          type="email"
          autocomplete="username"
          placeholder="you@company.com"
          required
        />
      </div>

      <div class="form-field">
        <label for="login-password">Password</label>
        <input
          id="login-password"
          v-model="password"
          data-testid="login-password"
          type="password"
          autocomplete="current-password"
          placeholder="••••••••"
          required
        />
      </div>

      <button class="btn btn-primary login-submit" type="submit" data-testid="login-submit" :disabled="auth.loading">
        <span v-if="auth.loading" class="spinner" aria-hidden="true"></span>
        {{ auth.loading ? 'Signing in…' : 'Sign in' }}
      </button>

      <!-- TODO: demo-only copy — remove this hint before any non-demo deployment. -->
      <div class="demo-hint">
        <strong>Demo accounts</strong> (password <code>Passw0rd!</code>)
        <p>
          <code>admin@crm.local</code>, <code>manager@crm.local</code>, <code>supervisor@crm.local</code>,
          <code>agent@crm.local</code>, <code>reports@crm.local</code>, <code>demo.customer@example.com</code>
        </p>
      </div>
    </form>
  </div>
</template>

<style scoped>
.login-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: var(--space-5);
  background-color: var(--surface-sunken);
}

.login-card {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
  width: 100%;
  max-width: 400px;
  padding: var(--space-8) var(--space-6);
}

.login-brand {
  display: flex;
  align-items: center;
  gap: 0.65rem;
}

.login-brand h1 {
  font-size: var(--font-xl);
}

.brand-mark {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 34px;
  height: 34px;
  border-radius: var(--radius-sm);
  background-color: var(--color-primary);
  color: #ffffff;
  font-size: 0.75rem;
  font-weight: 700;
  flex-shrink: 0;
}

.subtitle {
  color: var(--text-muted);
  font-size: var(--font-sm);
  margin: -0.5rem 0 0.25rem;
}

.login-submit {
  margin-top: 0.5rem;
  width: 100%;
}

.demo-hint {
  margin-top: var(--space-3);
  padding-top: var(--space-4);
  border-top: 1px solid var(--border-color);
  font-size: var(--font-xs);
  line-height: 1.7;
  color: var(--text-muted);
}

.demo-hint strong {
  color: var(--text-main);
}

.demo-hint p {
  margin-top: 0.25rem;
}
</style>
