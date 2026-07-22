<script setup lang="ts">
import { computed } from 'vue';
import { useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import { setLanguage } from '../i18n';

const router = useRouter();
const { locale, t } = useI18n();

const currentLang = computed(() => locale.value as 'en' | 'ar');

const changeLang = (event: Event) => {
  const selected = (event.target as HTMLSelectElement).value as 'en' | 'ar';
  setLanguage(selected);
};

const logout = () => {
  localStorage.removeItem('token');
  router.push('/login');
};
</script>

<template>
  <header class="app-header">
    <div class="header-container">
      <div class="logo" @click="router.push('/')">
        <span class="logo-icon">🎫</span>
        <span class="logo-text">{{ t('common.appName') }}</span>
      </div>

      <div class="header-actions">
        <div class="lang-switcher">
          <span class="lang-icon">🌐</span>
          <select :value="currentLang" @change="changeLang" class="lang-select">
            <option value="en">English</option>
            <option value="ar">العربية</option>
          </select>
        </div>

        <div class="user-profile">
          <span class="user-avatar">👤</span>
          <span class="user-name">{{ t('common.adminUser') }}</span>
        </div>

        <button @click="logout" class="btn btn-logout" :title="t('common.logout')">
          <span>{{ t('common.logout') }}</span>
          <span class="logout-icon">🚪</span>
        </button>
      </div>
    </div>
  </header>
</template>

<style scoped>
.app-header {
  height: 64px;
  background-color: #ffffff;
  border-bottom: 1px solid #e2e8f0;
  box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.04);
  position: sticky;
  top: 0;
  z-index: 100;
  width: 100%;
}

.header-container {
  height: 100%;
  padding: 0 1.5rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.logo {
  display: flex;
  align-items: center;
  gap: 0.625rem;
  cursor: pointer;
  user-select: none;
}

.logo-icon {
  font-size: 1.5rem;
}

.logo-text {
  font-size: 1.2rem;
  font-weight: 700;
  color: #1e293b;
  letter-spacing: -0.02em;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 1.25rem;
}

.lang-switcher {
  display: flex;
  align-items: center;
  gap: 0.35rem;
  background-color: #f8fafc;
  padding: 0.35rem 0.6rem;
  border-radius: 8px;
  border: 1px solid #e2e8f0;
}

.lang-icon {
  font-size: 0.95rem;
}

.lang-select {
  border: none;
  background: transparent;
  font-size: 0.875rem;
  font-weight: 600;
  color: #334155;
  cursor: pointer;
  outline: none;
  font-family: inherit;
}

.user-profile {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.35rem 0.75rem;
  background-color: #f1f5f9;
  border-radius: 8px;
  font-size: 0.875rem;
  font-weight: 600;
  color: #334155;
}

.user-avatar {
  font-size: 1rem;
}

.btn-logout {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  background-color: #fef2f2;
  color: #dc2626;
  border: 1px solid #fecaca;
  padding: 0.45rem 0.85rem;
  border-radius: 8px;
  font-weight: 600;
  font-size: 0.875rem;
  cursor: pointer;
  transition: all 0.2s ease;
  font-family: inherit;
}

.btn-logout:hover {
  background-color: #fee2e2;
  color: #b91c1c;
  border-color: #fca5a5;
}

.logout-icon {
  font-size: 0.95rem;
}

@media (max-width: 640px) {
  .user-name {
    display: none;
  }
}
</style>
