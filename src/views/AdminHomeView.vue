<template>
  <div class="page">
    <div class="topbar">
      <div>
        <h1>排課監控系統</h1>
        <p class="subtitle">
          Admin Dashboard
        </p>
      </div>

      <button class="logout-btn" @click="logout">
        登出
      </button>
    </div>

    <div class="grid">
      <router-link to="/admin/new" class="card">
        <div class="icon">📅</div>
        <h2>新增排課</h2>
        <p>建立新的課程排程</p>
      </router-link>

      <router-link to="/admin/monitor" class="card">
        <div class="icon">🟢</div>
        <h2>課程監控</h2>
        <p>查看即時燈號狀態</p>
      </router-link>

      <router-link to="/admin/report" class="card">
        <div class="icon">📊</div>
        <h2>報表中心</h2>
        <p>匯出排課紀錄</p>
      </router-link>
    </div>
  </div>
</template>

<script setup>
import { onMounted } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()

onMounted(() => {
  const login = localStorage.getItem('admin_login')

  if (login !== 'true') {
    router.push('/admin/login')
  }
})

function logout() {
  localStorage.removeItem('admin_login')
  router.push('/admin/login')
}
</script>

<style scoped>
.page {
  min-height: 100vh;
  background: #f4f7fb;
  padding: 30px;
  box-sizing: border-box;
}

.topbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 40px;
}

h1 {
  margin: 0;
  font-size: 32px;
  color: #111827;
}

.subtitle {
  margin-top: 8px;
  color: #6b7280;
}

.logout-btn {
  border: none;
  background: #ef4444;
  color: white;
  padding: 12px 20px;
  border-radius: 12px;
  cursor: pointer;
  font-size: 15px;
}

.logout-btn:hover {
  background: #dc2626;
}

.grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
  gap: 24px;
}

.card {
  background: white;
  border-radius: 20px;
  padding: 30px;
  text-decoration: none;
  color: #111827;
  box-shadow: 0 8px 20px rgba(0,0,0,0.06);
  transition: 0.2s;
}

.card:hover {
  transform: translateY(-4px);
}

.icon {
  font-size: 42px;
  margin-bottom: 20px;
}

.card h2 {
  margin: 0;
  margin-bottom: 10px;
}

.card p {
  margin: 0;
  color: #6b7280;
}
</style>