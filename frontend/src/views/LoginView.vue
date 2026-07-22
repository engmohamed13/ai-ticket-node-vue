<script setup lang="ts">
import { ref, computed } from 'vue';
import { useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import api from '../services/api';
import { setLanguage } from '../i18n';

const { t, locale } = useI18n();
const router = useRouter();

const email = ref('');
const password = ref('');
const loading = ref(false);
const error = ref('');

const currentLang = computed(() => locale.value as 'en' | 'ar');

const changeLang = (lang: 'en' | 'ar') => {
  setLanguage(lang);
};

const handleLogin = async () => {
  error.value = '';
  
  if (!email.value || !password.value) {
    error.value = t('login.requiredError');
    return;
  }

  loading.value = true;
  try {
    const response = await api.post('/auth/login', {
      email: email.value,
      password: password.value
    });
    
    if (response.data.success && response.data.data.token) {
      localStorage.setItem('token', response.data.data.token);
      router.push('/');
    } else {
      error.value = t('login.failedError');
    }
  } catch (err: any) {
    error.value = err.response?.data?.message || t('login.unexpectedError');
  } finally {
    loading.value = false;
  }
};
</script>

<template>
  <div class="login-wrapper">
    <div class="login-header-lang">
      <button 
        @click="changeLang('en')" 
        class="lang-btn" 
        :class="{ active: currentLang === 'en' }"
      >
        EN
      </button>
      <span class="lang-divider">|</span>
      <button 
        @click="changeLang('ar')" 
        class="lang-btn" 
        :class="{ active: currentLang === 'ar' }"
      >
        العربية
      </button>
    </div>

    <div class="login-card">
      <div class="logo-box">
        <span class="logo-icon">🎫</span>
        <h1>{{ t('login.title') }}</h1>
      </div>
      <p class="subtitle">{{ t('login.subtitle') }}</p>
      
      <form @submit.prevent="handleLogin" class="login-form">
        <div class="form-group">
          <label for="email">{{ t('login.email') }}</label>
          <input 
            type="email" 
            id="email" 
            v-model="email" 
            :placeholder="t('login.emailPlaceholder')"
            :disabled="loading"
            class="form-control"
          />
        </div>
        
        <div class="form-group">
          <label for="password">{{ t('login.password') }}</label>
          <input 
            type="password" 
            id="password" 
            v-model="password" 
            :placeholder="t('login.passwordPlaceholder')"
            :disabled="loading"
            class="form-control"
          />
        </div>

        <div v-if="error" class="alert alert-danger">
          ⚠️ {{ error }}
        </div>

        <button type="submit" :disabled="loading" class="btn btn-primary btn-block">
          <span v-if="loading" class="spinner spinner-sm"></span>
          {{ loading ? t('login.loggingIn') : t('login.loginBtn') }}
        </button>
      </form>
    </div>
  </div>
</template>

<style scoped>
.login-wrapper {
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  min-height: 100vh;
  background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%);
  padding: 1.5rem;
  position: relative;
}

.login-header-lang {
  position: absolute;
  top: 1.5rem;
  border-inline-end: 1.5rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  background: rgba(255, 255, 255, 0.8);
  padding: 0.4rem 0.8rem;
  border-radius: 20px;
  backdrop-filter: blur(8px);
  border: 1px solid #e2e8f0;
}

.lang-btn {
  background: transparent;
  border: none;
  font-size: 0.85rem;
  font-weight: 600;
  color: #64748b;
  cursor: pointer;
  padding: 0.2rem 0.4rem;
  border-radius: 4px;
  transition: all 0.2s ease;
  font-family: inherit;
}

.lang-btn.active {
  color: #2563eb;
  background-color: #eff6ff;
}

.lang-divider {
  color: #cbd5e1;
  font-size: 0.8rem;
}

.login-card {
  background: #ffffff;
  padding: 2.5rem;
  border-radius: 16px;
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.08), 0 8px 10px -6px rgba(0, 0, 0, 0.04);
  width: 100%;
  max-width: 420px;
  border: 1px solid #e2e8f0;
}

.logo-box {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.5rem;
}

.logo-icon {
  font-size: 2.5rem;
}

h1 {
  margin: 0;
  color: #0f172a;
  font-size: 1.75rem;
  font-weight: 700;
  text-align: center;
}

.subtitle {
  color: #64748b;
  text-align: center;
  margin-top: 0;
  margin-bottom: 2rem;
  font-size: 0.95rem;
}

.btn-block {
  width: 100%;
  padding: 0.75rem;
  font-size: 1rem;
  margin-top: 0.5rem;
}
</style>
