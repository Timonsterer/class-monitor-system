<template>
  <div class="page">
    <div class="topbar">
      <div>
        <h1>新增排課</h1>
        <p class="subtitle">
          Create New Schedule
        </p>
      </div>

      <router-link to="/admin" class="back-btn">
        返回首頁
      </router-link>
    </div>

    <div class="form-card">
      <div class="form-grid">

        <div class="field">
          <label>學校名稱</label>
          <input v-model="form.schoolName" type="text" />
        </div>

        <div class="field">
          <label>老師名稱</label>
          <input v-model="form.teacherName" type="text" />
        </div>

        <div class="field">
          <label>學生名稱</label>
          <input v-model="form.studentName" type="text" />
        </div>

        <div class="field">
          <label>課程內容</label>
          <input v-model="form.courseTitle" type="text" />
        </div>

        <div class="field">
          <label>日期</label>
          <input v-model="form.date" type="date" />
        </div>

        <div class="field">
          <label>開始時間</label>
          <select v-model="form.startTime">
            <option
              v-for="time in timeOptions"
              :key="time"
              :value="time"
            >
              {{ time }}
            </option>
          </select>
        </div>

        <div class="field">
          <label>結束時間</label>
          <select v-model="form.endTime">
            <option
              v-for="time in timeOptions"
              :key="time"
              :value="time"
            >
              {{ time }}
            </option>
          </select>
        </div>

        <div class="field full">
          <label>Google Meet 連結</label>
          <input v-model="form.meetUrl" type="text" />
        </div>

      </div>

      <button class="save-btn" @click="saveSchedule">
        儲存排課
      </button>

      <p v-if="success" class="success">
        排課建立成功
      </p>
    </div>
  </div>
</template>

<script setup>
import { reactive, ref } from 'vue'

const success = ref(false)

const form = reactive({
  schoolName: '',
  teacherName: '',
  studentName: '',
  courseTitle: '',
  date: '',
  startTime: '07:00',
  endTime: '07:30',
  meetUrl: ''
})

const timeOptions = []

for (let hour = 7; hour <= 23; hour++) {
  timeOptions.push(`${String(hour).padStart(2, '0')}:00`)

  if (hour !== 23) {
    timeOptions.push(`${String(hour).padStart(2, '0')}:30`)
  }
}

function saveSchedule() {
  const schedules =
    JSON.parse(localStorage.getItem('schedules') || '[]')

  schedules.push({
    id: Date.now(),

    ...form,

    studentOnline: false,
    teacherOnline: false,
    classStarted: false,
    classCompleted: false,

    createdAt: new Date().toISOString()
  })

  localStorage.setItem(
    'schedules',
    JSON.stringify(schedules)
  )

  success.value = true

  form.schoolName = ''
  form.teacherName = ''
  form.studentName = ''
  form.courseTitle = ''
  form.date = ''
  form.startTime = '07:00'
  form.endTime = '07:30'
  form.meetUrl = ''
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
  margin-bottom: 30px;
}

h1 {
  margin: 0;
  color: #111827;
}

.subtitle {
  margin-top: 8px;
  color: #6b7280;
}

.back-btn {
  text-decoration: none;
  background: #111827;
  color: white;
  padding: 12px 20px;
  border-radius: 12px;
}

.form-card {
  background: white;
  border-radius: 20px;
  padding: 30px;
  box-shadow: 0 8px 20px rgba(0,0,0,0.06);
}

.form-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 20px;
}

.field {
  display: flex;
  flex-direction: column;
}

.field.full {
  grid-column: 1 / -1;
}

label {
  margin-bottom: 8px;
  color: #374151;
  font-size: 14px;
}

input,
select {
  padding: 14px;
  border-radius: 12px;
  border: 1px solid #d1d5db;
  font-size: 15px;
}

input:focus,
select:focus {
  outline: none;
  border-color: #2563eb;
}

.save-btn {
  margin-top: 30px;
  border: none;
  background: #2563eb;
  color: white;
  padding: 14px 24px;
  border-radius: 12px;
  cursor: pointer;
  font-size: 16px;
}

.save-btn:hover {
  background: #1d4ed8;
}

.success {
  margin-top: 20px;
  color: #16a34a;
  font-weight: bold;
}

@media (max-width: 768px) {
  .form-grid {
    grid-template-columns: 1fr;
  }
}
</style>