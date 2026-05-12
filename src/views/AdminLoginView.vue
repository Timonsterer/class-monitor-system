<template>
  <div class="login-page">
    <div class="login-card">
      <h1>排課監控系統</h1>
      <p class="subtitle">Admin Login</p>

      <input
        v-model="password"
        type="password"
        placeholder="請輸入管理密碼"
        class="input"
        @keyup.enter="login"
      />

      <button class="login-btn" @click="login">
        登入系統
      </button>

      <p v-if="error" class="error">
        密碼錯誤
      </p>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()

const password = ref('')
const error = ref(false)

// 第一版先寫死
const ADMIN_PASSWORD = '123456'

function login() {
  if (password.value === ADMIN_PASSWORD) {
    localStorage.setItem('admin_login', 'true')
    router.push('/admin')
  } else {
    error.value = true
  }
}
</script>

<style scoped>
.login-page {
  min-height: 100vh;
  background: #f4f7fb;
  display: flex;
  justify-content: center;
  align-items: center;
}

.login-card {
  width: 360px;
  background: white;
  padding: 40px;
  border-radius: 20px;
  box-shadow: 0 10px 30px rgba(0,0,0,0.08);
}

h1 {
  margin: 0;
  font-size: 28px;
  text-align: center;
  color: #1f2937;
}

.subtitle {
  text-align: center;
  color: #6b7280;
  margin-top: 10px;
  margin-bottom: 30px;
}

.input {
  width: 100%;
  padding: 14px;
  border: 1px solid #d1d5db;
  border-radius: 12px;
  font-size: 16px;
  margin-bottom: 20px;
  box-sizing: border-box;
}

.input:focus {
  outline: none;
  border-color: #2563eb;
}

.login-btn {
  width: 100%;
  padding: 14px;
  border: none;
  border-radius: 12px;
  background: #2563eb;
  color: white;
  font-size: 16px;
  cursor: pointer;
  transition: 0.2s;
}

.login-btn:hover {
  background: #1d4ed8;
}

.error {
  margin-top: 15px;
  text-align: center;
  color: red;
}
</style>