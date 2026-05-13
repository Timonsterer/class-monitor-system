<template>
  <div class="page">
    <div class="topbar">
      <div>
        <h1>課程燈號監控</h1>
        <p class="subtitle">Firebase Online Monitor</p>
      </div>

      <div class="top-actions">
        <router-link to="/admin/import" class="import-btn">
          匯入排課
        </router-link>

        <router-link to="/admin" class="back-btn">
          返回首頁
        </router-link>
      </div>
    </div>

    <div v-if="loading" class="loading">
      Firebase 資料讀取中...
    </div>

    <div class="summary-grid">
      <button
        class="summary-card"
        :class="{ active: quickFilter === 'all' }"
        @click="quickFilter = 'all'"
      >
        <span>全部</span>
        <strong>{{ schedules.length }}</strong>
      </button>

      <button
        class="summary-card danger"
        :class="{ active: quickFilter === 'waiting' }"
        @click="quickFilter = 'waiting'"
      >
        <span>待處理</span>
        <strong>{{ waitingCount }}</strong>
      </button>

      <button
        class="summary-card blue"
        :class="{ active: quickFilter === 'started' }"
        @click="quickFilter = 'started'"
      >
        <span>進行中</span>
        <strong>{{ startedCount }}</strong>
      </button>

      <button
        class="summary-card green"
        :class="{ active: quickFilter === 'done' }"
        @click="quickFilter = 'done'"
      >
        <span>已完成</span>
        <strong>{{ doneCount }}</strong>
      </button>
    </div>

    <div class="filter-card">
      <div class="filter-row">
        <input
          v-model="keyword"
          type="text"
          placeholder="搜尋學生、老師、機構、課程、Meet..."
        />

        <input v-model="dateFilter" type="date" />

        <select v-model="statusFilter">
          <option value="">全部狀態</option>
          <option value="pending">尚未開始</option>
          <option value="meet">Meet 已建立</option>
          <option value="student">學生已上線</option>
          <option value="teacher">老師已上線</option>
          <option value="started">課程開始</option>
          <option value="done">課程完成</option>
        </select>
      </div>

      <div class="mini-summary">
        目前顯示 {{ filteredSchedules.length }} 筆
      </div>
    </div>

    <div v-if="!loading && filteredSchedules.length === 0" class="empty">
      目前沒有符合條件的排課資料
    </div>

    <div class="compact-list">
      <div
        v-for="item in filteredSchedules"
        :key="item.id"
        class="compact-card"
        :class="statusClass(item)"
      >
        <div class="compact-main">
          <div class="main-left">
            <div class="name-row">
              <h2>{{ item.studentName || '未填學生' }}</h2>

              <span class="status-badge" :class="statusClass(item)">
                {{ statusText(item) }}
              </span>
            </div>

            <div class="meta-row">
              <span>{{ item.date || '未填日期' }}</span>
              <span>{{ item.startTime || '--:--' }} - {{ item.endTime || '--:--' }}</span>
              <span>{{ item.teacherName || '未填老師' }}</span>
              <span>{{ item.schoolName || '未填機構' }}</span>
            </div>
          </div>

          <div class="lights-inline">
            <div class="light-box" :class="{ on: item.meetUrl }">
              <span class="dot red"></span>
              <small>Meet</small>
            </div>

            <div class="light-box" :class="{ on: item.studentOnline }">
              <span class="dot yellow"></span>
              <small>學生</small>
            </div>

            <div class="light-box" :class="{ on: item.teacherOnline }">
              <span class="dot blue"></span>
              <small>老師</small>
            </div>

            <div class="light-box" :class="{ on: item.classCompleted }">
              <span class="dot green"></span>
              <small>完成</small>
            </div>
          </div>

          <button class="toggle-btn" @click="toggleExpand(item.id)">
            {{ expandedId === item.id ? '收合' : '展開' }}
          </button>
        </div>

        <div v-if="expandedId === item.id" class="detail-panel">
          <div class="detail-grid">
            <div>
              <strong>機構</strong>
              <span>{{ item.schoolName || '未填' }}</span>
            </div>

            <div>
              <strong>課程</strong>
              <span>{{ item.courseTitle || item.courseName || '未填' }}</span>
            </div>

            <div>
              <strong>老師</strong>
              <span>{{ item.teacherName || '未填' }}</span>
            </div>

            <div>
              <strong>學生</strong>
              <span>{{ item.studentName || '未填' }}</span>
            </div>

            <div class="full">
              <strong>Google Meet</strong>
              <a v-if="item.meetUrl" :href="item.meetUrl" target="_blank">
                {{ item.meetUrl }}
              </a>
              <span v-else>尚未建立</span>
            </div>

            <div v-if="item.remarks" class="full">
              <strong>備註</strong>
              <span>{{ item.remarks }}</span>
            </div>
          </div>

          <div class="actions">
            <button
              :disabled="updatingId === item.id"
              @click="toggleStudent(item)"
            >
              {{ item.studentOnline ? '取消學生上線' : '學生上線' }}
            </button>

            <button
              :disabled="updatingId === item.id"
              @click="toggleTeacher(item)"
            >
              {{ item.teacherOnline ? '取消老師上線' : '老師上線' }}
            </button>

            <button
              class="complete-btn"
              :disabled="updatingId === item.id"
              @click="completeClass(item)"
            >
              課程完成
            </button>

            <button
              class="delete-btn"
              :disabled="updatingId === item.id"
              @click="removeOne(item.id)"
            >
              刪除
            </button>
          </div>
        </div>
      </div>
    </div>

    <p v-if="message" class="message">
      {{ message }}
    </p>
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import {
  deleteSchedule,
  getSchedules,
  updateSchedule
} from '@/services/scheduleService'

const schedules = ref([])
const keyword = ref('')
const dateFilter = ref('')
const statusFilter = ref('')
const quickFilter = ref('waiting')
const expandedId = ref(null)
const loading = ref(false)
const updatingId = ref('')
const message = ref('')

onMounted(() => {
  loadSchedules()
})

const filteredSchedules = computed(() => {
  let list = [...schedules.value]

  if (keyword.value.trim()) {
    const key = keyword.value.trim().toLowerCase()

    list = list.filter(item => {
      const text = [
        item.schoolName,
        item.teacherName,
        item.studentName,
        item.courseTitle,
        item.courseName,
        item.level,
        item.meetUrl,
        item.remarks,
        item.date,
        item.startTime,
        item.endTime
      ]
        .join(' ')
        .toLowerCase()

      return text.includes(key)
    })
  }

  if (dateFilter.value) {
    list = list.filter(item => item.date === dateFilter.value)
  }

  if (statusFilter.value) {
    list = list.filter(item => statusClass(item) === statusFilter.value)
  }

  if (quickFilter.value === 'waiting') {
    list = list.filter(item => !item.classCompleted)
  }

  if (quickFilter.value === 'started') {
    list = list.filter(item => item.studentOnline && item.teacherOnline && !item.classCompleted)
  }

  if (quickFilter.value === 'done') {
    list = list.filter(item => item.classCompleted)
  }

  return list.sort((a, b) => {
    const keyA = `${a.date || ''} ${a.startTime || ''} ${a.teacherName || ''} ${a.studentName || ''}`
    const keyB = `${b.date || ''} ${b.startTime || ''} ${b.teacherName || ''} ${b.studentName || ''}`

    return keyA.localeCompare(keyB)
  })
})

const waitingCount = computed(() => {
  return schedules.value.filter(item => !item.classCompleted).length
})

const startedCount = computed(() => {
  return schedules.value.filter(item => {
    return item.studentOnline && item.teacherOnline && !item.classCompleted
  }).length
})

const doneCount = computed(() => {
  return schedules.value.filter(item => item.classCompleted).length
})

async function loadSchedules() {
  loading.value = true
  message.value = ''

  try {
    schedules.value = await getSchedules()
  } catch (error) {
    console.error(error)
    message.value = 'Firebase 資料讀取失敗，請確認 firebase.js、.env 與 Firestore 權限'
  } finally {
    loading.value = false
  }
}

function toggleExpand(id) {
  expandedId.value = expandedId.value === id ? null : id
}

async function toggleStudent(item) {
  if (!item.id) return

  updatingId.value = item.id
  message.value = ''

  const nextValue = !item.studentOnline
  const now = new Date().toISOString()
  const shouldStart = nextValue && item.teacherOnline

  try {
    await updateSchedule(item.id, {
      studentOnline: nextValue,
      studentOnlineAt: nextValue ? now : '',
      classStarted: shouldStart,
      classStartedAt: shouldStart ? now : item.classStartedAt || ''
    })

    item.studentOnline = nextValue
    item.studentOnlineAt = nextValue ? now : ''
    item.classStarted = shouldStart

    if (shouldStart) {
      item.classStartedAt = now
    }
  } catch (error) {
    console.error(error)
    message.value = '更新學生上線狀態失敗'
  } finally {
    updatingId.value = ''
  }
}

async function toggleTeacher(item) {
  if (!item.id) return

  updatingId.value = item.id
  message.value = ''

  const nextValue = !item.teacherOnline
  const now = new Date().toISOString()
  const shouldStart = item.studentOnline && nextValue

  try {
    await updateSchedule(item.id, {
      teacherOnline: nextValue,
      teacherOnlineAt: nextValue ? now : '',
      classStarted: shouldStart,
      classStartedAt: shouldStart ? now : item.classStartedAt || ''
    })

    item.teacherOnline = nextValue
    item.teacherOnlineAt = nextValue ? now : ''
    item.classStarted = shouldStart

    if (shouldStart) {
      item.classStartedAt = now
    }
  } catch (error) {
    console.error(error)
    message.value = '更新老師上線狀態失敗'
  } finally {
    updatingId.value = ''
  }
}

async function completeClass(item) {
  if (!item.id) return

  updatingId.value = item.id
  message.value = ''

  const now = new Date().toISOString()

  try {
    await updateSchedule(item.id, {
      classCompleted: true,
      classCompletedAt: now
    })

    item.classCompleted = true
    item.classCompletedAt = now
  } catch (error) {
    console.error(error)
    message.value = '更新課程完成狀態失敗'
  } finally {
    updatingId.value = ''
  }
}

async function removeOne(id) {
  const yes = window.confirm('確定要刪除這筆排課嗎？')

  if (!yes) return

  updatingId.value = id
  message.value = ''

  try {
    await deleteSchedule(id)

    schedules.value = schedules.value.filter(item => item.id !== id)

    if (expandedId.value === id) {
      expandedId.value = null
    }
  } catch (error) {
    console.error(error)
    message.value = '刪除失敗'
  } finally {
    updatingId.value = ''
  }
}

function statusText(item) {
  if (item.classCompleted) return '課程完成'
  if (item.studentOnline && item.teacherOnline) return '課程開始'
  if (item.studentOnline && !item.teacherOnline) return '學生已上線'
  if (item.teacherOnline && !item.studentOnline) return '老師已上線'
  if (item.meetUrl) return 'Meet 已建立'
  return '尚未開始'
}

function statusClass(item) {
  if (item.classCompleted) return 'done'
  if (item.studentOnline && item.teacherOnline) return 'started'
  if (item.studentOnline && !item.teacherOnline) return 'student'
  if (item.teacherOnline && !item.studentOnline) return 'teacher'
  if (item.meetUrl) return 'meet'
  return 'pending'
}
</script>

<style scoped>
.page {
  min-height: 100vh;
  background: #f4f7fb;
  padding: 24px;
  box-sizing: border-box;
}

.topbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 18px;
  gap: 16px;
}

h1 {
  margin: 0;
  color: #111827;
  font-size: 28px;
}

.subtitle {
  margin: 6px 0 0;
  color: #6b7280;
  font-size: 14px;
}

.top-actions {
  display: flex;
  gap: 10px;
}

.back-btn,
.import-btn {
  text-decoration: none;
  color: white;
  padding: 11px 16px;
  border-radius: 12px;
  white-space: nowrap;
  font-size: 14px;
  font-weight: bold;
}

.back-btn {
  background: #111827;
}

.import-btn {
  background: #2563eb;
}

.loading {
  background: #dbeafe;
  color: #1e40af;
  padding: 12px 16px;
  border-radius: 14px;
  margin-bottom: 14px;
  font-weight: bold;
}

.summary-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12px;
  margin-bottom: 14px;
}

.summary-card {
  border: 2px solid transparent;
  background: white;
  border-radius: 18px;
  padding: 14px;
  text-align: left;
  cursor: pointer;
  box-shadow: 0 6px 16px rgba(0,0,0,0.05);
}

.summary-card span {
  display: block;
  color: #6b7280;
  font-size: 13px;
  margin-bottom: 6px;
}

.summary-card strong {
  color: #111827;
  font-size: 28px;
}

.summary-card.active {
  border-color: #111827;
}

.summary-card.danger strong {
  color: #dc2626;
}

.summary-card.blue strong {
  color: #2563eb;
}

.summary-card.green strong {
  color: #16a34a;
}

.filter-card {
  background: white;
  border-radius: 18px;
  padding: 14px;
  margin-bottom: 14px;
  box-shadow: 0 6px 16px rgba(0,0,0,0.05);
}

.filter-row {
  display: grid;
  grid-template-columns: 2fr 1fr 1fr;
  gap: 10px;
}

input,
select {
  padding: 12px;
  border-radius: 12px;
  border: 1px solid #d1d5db;
  font-size: 14px;
  box-sizing: border-box;
}

input:focus,
select:focus {
  outline: none;
  border-color: #2563eb;
}

.mini-summary {
  margin-top: 10px;
  color: #6b7280;
  font-size: 13px;
}

.empty {
  background: white;
  padding: 34px;
  border-radius: 18px;
  text-align: center;
  color: #6b7280;
}

.compact-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.compact-card {
  background: white;
  border-radius: 18px;
  overflow: hidden;
  box-shadow: 0 6px 16px rgba(0,0,0,0.05);
  border-left: 6px solid #e5e7eb;
}

.compact-card.pending {
  border-left-color: #9ca3af;
}

.compact-card.meet {
  border-left-color: #ef4444;
}

.compact-card.student {
  border-left-color: #facc15;
}

.compact-card.teacher {
  border-left-color: #3b82f6;
}

.compact-card.started {
  border-left-color: #22c55e;
}

.compact-card.done {
  border-left-color: #111827;
  opacity: 0.78;
}

.compact-main {
  display: grid;
  grid-template-columns: 1fr auto auto;
  gap: 14px;
  align-items: center;
  padding: 14px;
}

.name-row {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 6px;
  flex-wrap: wrap;
}

.name-row h2 {
  margin: 0;
  color: #111827;
  font-size: 18px;
}

.meta-row {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  color: #6b7280;
  font-size: 13px;
}

.meta-row span {
  background: #f3f4f6;
  padding: 4px 8px;
  border-radius: 999px;
}

.status-badge {
  white-space: nowrap;
  padding: 5px 10px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: bold;
}

.status-badge.pending {
  background: #e5e7eb;
  color: #374151;
}

.status-badge.meet {
  background: #fee2e2;
  color: #991b1b;
}

.status-badge.student {
  background: #fef3c7;
  color: #92400e;
}

.status-badge.teacher {
  background: #dbeafe;
  color: #1e40af;
}

.status-badge.started {
  background: #dcfce7;
  color: #166534;
}

.status-badge.done {
  background: #111827;
  color: white;
}

.lights-inline {
  display: grid;
  grid-template-columns: repeat(4, 58px);
  gap: 6px;
}

.light-box {
  background: #f3f4f6;
  border-radius: 12px;
  padding: 7px 4px;
  text-align: center;
  opacity: 0.45;
}

.light-box.on {
  opacity: 1;
}

.dot {
  width: 13px;
  height: 13px;
  display: block;
  border-radius: 50%;
  background: #d1d5db;
  margin: 0 auto 4px;
}

.light-box.on .dot.red {
  background: #ef4444;
  box-shadow: 0 0 8px #ef4444;
}

.light-box.on .dot.yellow {
  background: #facc15;
  box-shadow: 0 0 8px #facc15;
}

.light-box.on .dot.blue {
  background: #3b82f6;
  box-shadow: 0 0 8px #3b82f6;
}

.light-box.on .dot.green {
  background: #22c55e;
  box-shadow: 0 0 8px #22c55e;
}

.light-box small {
  color: #374151;
  font-size: 11px;
}

.toggle-btn {
  border: none;
  background: #111827;
  color: white;
  padding: 10px 13px;
  border-radius: 12px;
  cursor: pointer;
  font-size: 13px;
}

.detail-panel {
  border-top: 1px solid #e5e7eb;
  padding: 14px;
  background: #f9fafb;
}

.detail-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 10px;
  margin-bottom: 12px;
}

.detail-grid div {
  background: white;
  padding: 11px;
  border-radius: 13px;
}

.detail-grid .full {
  grid-column: 1 / -1;
}

.detail-grid strong {
  display: block;
  margin-bottom: 5px;
  color: #374151;
  font-size: 13px;
}

.detail-grid span,
.detail-grid a {
  color: #111827;
  word-break: break-all;
  font-size: 14px;
}

.actions {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 8px;
}

.actions button {
  border: none;
  background: #2563eb;
  color: white;
  padding: 11px 8px;
  border-radius: 12px;
  cursor: pointer;
  font-size: 13px;
  font-weight: bold;
}

.actions button:hover {
  background: #1d4ed8;
}

.actions button:disabled {
  background: #9ca3af;
  cursor: not-allowed;
}

.actions .complete-btn {
  background: #16a34a;
}

.actions .complete-btn:hover {
  background: #15803d;
}

.actions .delete-btn {
  background: #ef4444;
}

.actions .delete-btn:hover {
  background: #dc2626;
}

.message {
  margin-top: 16px;
  color: #dc2626;
  font-weight: bold;
}

@media (max-width: 900px) {
  .topbar {
    flex-direction: column;
    align-items: stretch;
  }

  .top-actions {
    display: grid;
    grid-template-columns: 1fr 1fr;
  }

  .back-btn,
  .import-btn {
    text-align: center;
  }

  .summary-grid {
    grid-template-columns: 1fr 1fr;
  }

  .filter-row {
    grid-template-columns: 1fr;
  }

  .compact-main {
    grid-template-columns: 1fr;
  }

  .lights-inline {
    grid-template-columns: repeat(4, 1fr);
  }

  .detail-grid {
    grid-template-columns: 1fr 1fr;
  }

  .actions {
    grid-template-columns: 1fr 1fr;
  }
}

@media (max-width: 520px) {
  .page {
    padding: 16px;
  }

  .summary-grid,
  .detail-grid,
  .actions {
    grid-template-columns: 1fr;
  }

  .lights-inline {
    grid-template-columns: 1fr 1fr;
  }
}
</style>