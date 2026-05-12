<template>
  <div class="page">
    <h1>學生端</h1>
    <p class="subtitle">Student Page</p>

    <div class="search-card">
      <label>請輸入學生名稱</label>
      <input
        v-model="studentName"
        type="text"
        placeholder="例如：王小明"
        @keyup.enter="searchSchedules"
      />

      <button @click="searchSchedules">
        查詢課程
      </button>
    </div>

    <div v-if="searched && schedules.length === 0" class="empty">
      查無課程資料
    </div>

    <div class="list">
      <div
        v-for="item in schedules"
        :key="item.id"
        class="card"
      >
        <h2>{{ item.courseTitle }}</h2>

        <p>日期：{{ item.date }}</p>
        <p>時間：{{ item.startTime }} - {{ item.endTime }}</p>
        <p>學校：{{ item.schoolName }}</p>
        <p>老師：{{ item.teacherName }}</p>

        <a
          v-if="item.meetUrl"
          :href="item.meetUrl"
          target="_blank"
          class="meet-btn"
        >
          進入 Google Meet
        </a>

        <button class="online-btn" @click="studentOnline(item)">
          我已上線
        </button>

        <p class="status">
          目前狀態：{{ statusText(item) }}
        </p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'

const studentName = ref('')
const schedules = ref([])
const searched = ref(false)

function searchSchedules() {
  const all = JSON.parse(localStorage.getItem('schedules') || '[]')

  schedules.value = all.filter(item =>
    item.studentName.includes(studentName.value.trim())
  )

  searched.value = true
}

function studentOnline(item) {
  const all = JSON.parse(localStorage.getItem('schedules') || '[]')

  const target = all.find(schedule => schedule.id === item.id)

  if (target) {
    target.studentOnline = true
    target.studentOnlineAt = new Date().toISOString()
  }

  localStorage.setItem('schedules', JSON.stringify(all))

  item.studentOnline = true
  item.studentOnlineAt = new Date().toISOString()
}

function statusText(item) {
  if (item.classCompleted) return '課程完成'
  if (item.studentOnline && item.teacherOnline) return '課程已開始'
  if (item.studentOnline && !item.teacherOnline) return '你已上線，等待老師'
  if (!item.studentOnline && item.teacherOnline) return '老師已上線，等待你'
  if (item.meetUrl) return 'Meet 已建立'
  return '尚未開始'
}
</script>

<style scoped>
.page {
  min-height: 100vh;
  background: #f4f7fb;
  padding: 30px;
  box-sizing: border-box;
}

h1 {
  margin: 0;
  color: #111827;
}

.subtitle {
  margin-top: 8px;
  color: #6b7280;
}

.search-card,
.card {
  background: white;
  border-radius: 20px;
  padding: 24px;
  margin-top: 24px;
  box-shadow: 0 8px 20px rgba(0,0,0,0.06);
}

label {
  display: block;
  margin-bottom: 8px;
  color: #374151;
}

input {
  width: 100%;
  padding: 14px;
  border-radius: 12px;
  border: 1px solid #d1d5db;
  font-size: 15px;
  box-sizing: border-box;
  margin-bottom: 16px;
}

button,
.meet-btn {
  display: inline-block;
  border: none;
  text-decoration: none;
  background: #2563eb;
  color: white;
  padding: 12px 18px;
  border-radius: 12px;
  cursor: pointer;
  font-size: 15px;
  margin-right: 10px;
  margin-top: 10px;
}

button:hover,
.meet-btn:hover {
  background: #1d4ed8;
}

.online-btn {
  background: #16a34a;
}

.online-btn:hover {
  background: #15803d;
}

.card h2 {
  margin-top: 0;
  color: #111827;
}

.card p {
  color: #374151;
}

.status {
  margin-top: 16px;
  font-weight: bold;
}

.empty {
  background: white;
  padding: 30px;
  border-radius: 20px;
  text-align: center;
  margin-top: 24px;
  color: #6b7280;
}
</style>