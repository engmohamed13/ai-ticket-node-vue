<script setup lang="ts">
import { ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useAuthStore } from '../stores/auth';

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
    <form class="login-card" data-testid="login-form" @submit.prevent="onSubmit">
      <h1>CustomerSupportCRM</h1>
      <p class="subtitle">Sign in to continue</p>

      <div v-if="auth.error" class="panel-error" data-testid="login-error">{{ auth.error }}</div>

      <label for="login-email">Email</label>
      <input
        id="login-email"
        v-model="email"
        data-testid="login-email"
        type="email"
        autocomplete="username"
        required
      />

      <label for="login-password">Password</label>
      <input
        id="login-password"
        v-model="password"
        data-testid="login-password"
        type="password"
        autocomplete="current-password"
        required
      />

      <button class="btn btn-primary" type="submit" data-testid="login-submit" :disabled="auth.loading">
        {{ auth.loading ? 'Signing in…' : 'Sign in' }}
      </button>

      <!-- TODO: demo-only copy — remove this hint before any non-demo deployment. -->
      <p class="demo-hint">
        Demo accounts (password <code>Passw0rd!</code>): <code>admin@crm.local</code>,
        <code>manager@crm.local</code>, <code>supervisor@crm.local</code>,
        <code>agent@crm.local</code>, <code>reports@crm.local</code>,
        <code>demo.customer@example.com</code>
      </p>
    </form>
  </div>
</template>

<style scoped>
.login-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1.5rem;
}

.login-card {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  width: 100%;
  max-width: 380px;
  background-color: var(--surface-color);
  border: 1px solid var(--border-color);
  border-radius: 10px;
  padding: 2rem;
}

.subtitle {
  color: var(--text-muted);
  margin: 0 0 0.75rem;
}

.panel-error {
  background-color: var(--color-down-bg);
  color: var(--color-down);
  padding: 0.75rem 1rem;
  border-radius: 6px;
  margin-bottom: 0.5rem;
}

label {
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--text-muted);
}

input {
  padding: 0.6rem 0.75rem;
  border: 1px solid var(--border-color);
  border-radius: 6px;
  font-family: inherit;
  font-size: 0.95rem;
}

button {
  margin-top: 1rem;
}

.demo-hint {
  margin-top: 1.25rem;
  font-size: 0.75rem;
  line-height: 1.7;
  color: var(--text-muted);
}
</style>
