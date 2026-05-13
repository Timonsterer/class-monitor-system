<template>
  <div class="page">
    <div class="topbar">
      <div>
        <h1>報表匯出</h1>
        <p class="subtitle">Firebase Online Report</p>
      </div>

      <router-link to="/admin" class="back-btn">
        返回首頁
      </router-link>
    </div>

    <div v-if="loading" class="loading">
      Firebase 資料讀取中...
    </div>

    <div class="card">
      <div class="action-grid">
        <button class="export-btn" :disabled="loading" @click="exportExcel">
          匯出美化 Excel
        </button>

        <button class="clean-btn" :disabled="loading" @click="removeDuplicates">
          刪除重複
        </button>

        <button class="danger-btn" :disabled="loading" @click="deleteAll">
          一鍵刪除全部
        </button>
      </div>

      <p class="hint">
        目前共 {{ schedules.length }} 筆排課資料
      </p>

      <p v-if="message" class="message">
        {{ message }}
      </p>
    </div>

    <div v-if="!loading && schedules.length === 0" class="empty">
      目前尚無報表資料
    </div>

    <div v-else class="table-wrap">
      <table>
        <thead>
          <tr>
            <th>日期</th>
            <th>時間</th>
            <th>機構</th>
            <th>老師</th>
            <th>學生</th>
            <th>課程</th>
            <th>Meet</th>
            <th>狀態</th>
          </tr>
        </thead>

        <tbody>
          <tr v-for="item in schedules" :key="item.id">
            <td>{{ item.date }}</td>
            <td>{{ item.startTime }} - {{ item.endTime }}</td>
            <td>{{ item.schoolName }}</td>
            <td>{{ item.teacherName }}</td>
            <td>{{ item.studentName }}</td>
            <td>{{ item.courseTitle || item.courseName }}</td>
            <td>{{ item.meetUrl || '尚未建立' }}</td>
            <td>{{ statusText(item) }}</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import ExcelJS from 'exceljs'
import { saveAs } from 'file-saver'
import {
  getSchedules,
  deleteAllSchedules,
  removeDuplicateSchedules
} from '@/services/scheduleService'

const schedules = ref([])
const loading = ref(false)
const message = ref('')

onMounted(() => {
  loadSchedules()
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

function statusText(item) {
  if (item.classCompleted) return '課程完成'
  if (item.studentOnline && item.teacherOnline) return '課程開始'
  if (item.studentOnline && !item.teacherOnline) return '學生已上線，等待老師'
  if (item.teacherOnline && !item.studentOnline) return '老師已上線，等待學生'
  if (item.meetUrl) return 'Meet 已建立'
  return '尚未開始'
}

function getWeekday(dateText) {
  if (!dateText) return ''

  const days = [
    '星期日',
    '星期一',
    '星期二',
    '星期三',
    '星期四',
    '星期五',
    '星期六'
  ]

  return days[new Date(dateText).getDay()]
}

function borderStyle() {
  return {
    top: { style: 'thin', color: { argb: 'FFD1D5DB' } },
    left: { style: 'thin', color: { argb: 'FFD1D5DB' } },
    bottom: { style: 'thin', color: { argb: 'FFD1D5DB' } },
    right: { style: 'thin', color: { argb: 'FFD1D5DB' } }
  }
}

async function removeDuplicates() {
  const yes = window.confirm('確定要刪除 Firebase 裡面的重複排課資料嗎？')

  if (!yes) return

  loading.value = true
  message.value = ''

  try {
    const before = schedules.value.length

    await removeDuplicateSchedules()
    await loadSchedules()

    const after = schedules.value.length

    message.value = `已刪除 ${before - after} 筆重複資料`
  } catch (error) {
    console.error(error)
    message.value = '刪除重複資料失敗'
  } finally {
    loading.value = false
  }
}

async function deleteAll() {
  const password = window.prompt('請輸入刪除密碼')

  if (password !== '123456') {
    alert('密碼錯誤，已取消刪除')
    return
  }

  const yes = window.confirm('確定要刪除 Firebase 裡全部排課資料嗎？此動作無法還原。')

  if (!yes) return

  loading.value = true
  message.value = ''

  try {
    await deleteAllSchedules()

    schedules.value = []
    message.value = '已刪除全部排課資料'
  } catch (error) {
    console.error(error)
    message.value = '刪除全部資料失敗'
  } finally {
    loading.value = false
  }
}

function groupSchedules() {
  const sorted = [...schedules.value].sort((a, b) => {
    const keyA = [
      a.schoolName || '',
      a.date || '',
      a.startTime || '',
      a.endTime || '',
      a.teacherName || '',
      a.studentName || ''
    ].join('|')

    const keyB = [
      b.schoolName || '',
      b.date || '',
      b.startTime || '',
      b.endTime || '',
      b.teacherName || '',
      b.studentName || ''
    ].join('|')

    return keyA.localeCompare(keyB)
  })

  const groups = {}

  sorted.forEach(item => {
    const key = [
      item.schoolName || '未填機構',
      item.date || '未填日期',
      item.startTime || '未填開始時間',
      item.endTime || '未填結束時間'
    ].join('|')

    if (!groups[key]) {
      groups[key] = {
        schoolName: item.schoolName || '未填機構',
        date: item.date || '',
        startTime: item.startTime || '',
        endTime: item.endTime || '',
        items: []
      }
    }

    groups[key].items.push(item)
  })

  return Object.values(groups)
}

async function exportExcel() {
  if (schedules.value.length === 0) {
    alert('目前沒有資料可以匯出')
    return
  }

  const workbook = new ExcelJS.Workbook()
  const sheet = workbook.addWorksheet('排課報表')

  sheet.columns = [
    { header: '老師', key: 'teacher', width: 18 },
    { header: '學生', key: 'student', width: 18 },
    { header: '課程', key: 'course', width: 24 },
    { header: 'Meet', key: 'meet', width: 42 },
    { header: '狀態', key: 'status', width: 18 }
  ]

  const titleRow = sheet.addRow(['排課總表'])
  titleRow.height = 32
  sheet.mergeCells(`A${titleRow.number}:E${titleRow.number}`)

  titleRow.getCell(1).font = {
    bold: true,
    size: 18,
    color: { argb: 'FFFFFFFF' },
    name: 'Microsoft JhengHei'
  }

  titleRow.getCell(1).alignment = {
    horizontal: 'center',
    vertical: 'middle'
  }

  titleRow.getCell(1).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF1F2937' }
  }

  sheet.addRow([])

  const groups = groupSchedules()

  groups.forEach(group => {
    const groupRow = sheet.addRow([
      `${group.schoolName}｜${group.date} ${getWeekday(group.date)}｜${group.startTime} - ${group.endTime}`
    ])

    sheet.mergeCells(`A${groupRow.number}:E${groupRow.number}`)

    groupRow.height = 28

    groupRow.getCell(1).font = {
      bold: true,
      size: 13,
      color: { argb: 'FF000000' },
      name: 'Microsoft JhengHei'
    }

    groupRow.getCell(1).alignment = {
      horizontal: 'center',
      vertical: 'middle'
    }

    groupRow.getCell(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFFACC15' }
    }

    groupRow.getCell(1).border = borderStyle()

    const headerRow = sheet.addRow([
      '老師',
      '學生',
      '課程',
      'Meet',
      '狀態'
    ])

    headerRow.eachCell(cell => {
      cell.font = {
        bold: true,
        color: { argb: 'FF111827' },
        name: 'Microsoft JhengHei'
      }

      cell.alignment = {
        horizontal: 'center',
        vertical: 'middle'
      }

      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFE5E7EB' }
      }

      cell.border = borderStyle()
    })

    group.items.forEach(item => {
      const row = sheet.addRow([
        item.teacherName || '',
        item.studentName || '',
        item.courseTitle || item.courseName || '',
        item.meetUrl || '',
        statusText(item)
      ])

      row.eachCell(cell => {
        cell.font = {
          name: 'Microsoft JhengHei'
        }

        cell.alignment = {
          vertical: 'middle',
          wrapText: true
        }

        cell.border = borderStyle()
      })

      row.getCell(1).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFDBEAFE' }
      }

      row.getCell(2).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFFEF3C7' }
      }

      row.getCell(5).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: item.classCompleted
          ? { argb: 'FFDCFCE7' }
          : { argb: 'FFFEE2E2' }
      }
    })

    sheet.addRow([])
  })

  sheet.views = [
    {
      state: 'frozen',
      ySplit: 3
    }
  ]

  const buffer = await workbook.xlsx.writeBuffer()

  saveAs(
    new Blob([buffer]),
    `排課報表-${new Date().toISOString().slice(0, 10)}.xlsx`
  )
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
  margin-bottom: 25px;
  gap: 16px;
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
  white-space: nowrap;
}

.loading {
  background: #dbeafe;
  color: #1e40af;
  padding: 12px 16px;
  border-radius: 14px;
  margin-bottom: 14px;
  font-weight: bold;
}

.card {
  background: white;
  padding: 24px;
  border-radius: 20px;
  margin-bottom: 24px;
  box-shadow: 0 8px 20px rgba(0,0,0,0.06);
}

.action-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
}

.export-btn,
.clean-btn,
.danger-btn {
  border: none;
  color: white;
  padding: 14px 18px;
  border-radius: 12px;
  cursor: pointer;
  font-size: 15px;
  font-weight: bold;
}

.export-btn {
  background: #16a34a;
}

.export-btn:hover {
  background: #15803d;
}

.clean-btn {
  background: #2563eb;
}

.clean-btn:hover {
  background: #1d4ed8;
}

.danger-btn {
  background: #ef4444;
}

.danger-btn:hover {
  background: #dc2626;
}

button:disabled {
  background: #9ca3af;
  cursor: not-allowed;
}

.hint {
  margin: 14px 0 0;
  color: #6b7280;
}

.message {
  margin: 12px 0 0;
  color: #2563eb;
  font-weight: bold;
}

.empty {
  background: white;
  padding: 40px;
  border-radius: 20px;
  text-align: center;
  color: #6b7280;
}

.table-wrap {
  overflow-x: auto;
  background: white;
  border-radius: 20px;
  box-shadow: 0 8px 20px rgba(0,0,0,0.06);
}

table {
  width: 100%;
  border-collapse: collapse;
  min-width: 1000px;
}

th,
td {
  padding: 14px;
  border-bottom: 1px solid #e5e7eb;
  text-align: left;
  font-size: 14px;
}

th {
  background: #f9fafb;
  color: #374151;
}

td {
  color: #111827;
  word-break: break-word;
}

@media (max-width: 768px) {
  .page {
    padding: 18px;
  }

  .topbar {
    flex-direction: column;
    align-items: stretch;
  }

  .back-btn {
    text-align: center;
  }

  .action-grid {
    grid-template-columns: 1fr;
  }

  .export-btn,
  .clean-btn,
  .danger-btn {
    width: 100%;
  }
}
</style>