<template>
  <div class="page">
    <div class="topbar">
      <div>
        <h1>匯入排課</h1>
        <p class="subtitle">本地解析後，再確認上傳 Firebase</p>
      </div>

      <router-link to="/admin" class="back-btn">
        返回首頁
      </router-link>
    </div>

    <div class="status-card">
      <div>
        <strong>流程</strong>
        <p>PDF / 文字 → 本地解析 → 預覽確認 → 上傳 Firebase</p>
      </div>

      <div class="status-pill">
        已解析 {{ parsedList.length }} 筆
      </div>
    </div>

    <div class="card">
      <label>上傳 PDF 排課表</label>

      <input
        type="file"
        accept="application/pdf"
        class="file-input"
        :disabled="loading || saving"
        @change="handlePdfUpload"
      />

      <p class="hint">
        PDF 只會在本地瀏覽器解析，不會直接上傳 Firebase。
      </p>

      <div v-if="loading" class="loading">
        PDF 本地解析中，請稍候...
      </div>
    </div>

    <div class="card">
      <label>或手動貼上 PDF / Excel 文字</label>

      <textarea
        v-model="rawText"
        :disabled="loading || saving"
        placeholder="請貼上排課文字..."
      ></textarea>

      <div class="actions">
        <button
          :disabled="loading || saving"
          @click="parseText"
        >
          本地解析預覽
        </button>

        <button
          class="save-btn"
          :disabled="parsedList.length === 0 || saving || loading"
          @click="confirmUpload"
        >
          {{ saving ? '正在上傳 Firebase...' : `確認上傳 Firebase（${parsedList.length} 筆）` }}
        </button>

        <button
          class="clear-btn"
          :disabled="loading || saving"
          @click="clearAll"
        >
          清空
        </button>
      </div>

      <p v-if="message" class="message">
        {{ message }}
      </p>
    </div>

    <div v-if="parsedList.length > 0" class="table-card">
      <div class="preview-head">
        <div>
          <h2>本地解析結果預覽</h2>
          <p>確認無誤後，再按「確認上傳 Firebase」。</p>
        </div>

        <button
          class="save-btn small"
          :disabled="saving"
          @click="confirmUpload"
        >
          上傳 Firebase
        </button>
      </div>

      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>日期</th>
              <th>時間</th>
              <th>老師</th>
              <th>學生</th>
              <th>程度</th>
              <th>課程</th>
              <th>機構</th>
              <th>Meet</th>
              <th>備註</th>
            </tr>
          </thead>

          <tbody>
            <tr v-for="item in parsedList" :key="item.tempId">
              <td>{{ item.date }}</td>
              <td>{{ item.startTime }} - {{ item.endTime }}</td>
              <td>{{ item.teacherName }}</td>
              <td>{{ item.studentName }}</td>
              <td>{{ item.level }}</td>
              <td>{{ item.courseTitle }}</td>
              <td>{{ item.schoolName }}</td>
              <td class="link-cell">{{ item.meetUrl }}</td>
              <td>{{ item.remarks }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <div v-if="saving" class="saving-mask">
      <div class="saving-box">
        <strong>正在上傳 Firebase</strong>
        <p>請不要重複點擊或關閉頁面。</p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import * as pdfjsLib from 'pdfjs-dist'
import pdfWorker from 'pdfjs-dist/build/pdf.worker.mjs?url'
import { importSchedules } from '@/services/scheduleService'

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker

const rawText = ref('')
const parsedList = ref([])
const message = ref('')
const loading = ref(false)
const saving = ref(false)

async function handlePdfUpload(event) {
  const file = event.target.files[0]

  if (!file) return

  if (file.type !== 'application/pdf') {
    message.value = '請上傳 PDF 檔案'
    return
  }

  loading.value = true
  message.value = ''
  parsedList.value = []

  try {
    const arrayBuffer = await file.arrayBuffer()

    const pdf = await pdfjsLib.getDocument({
      data: arrayBuffer
    }).promise

    let fullText = ''

    for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber++) {
      const page = await pdf.getPage(pageNumber)
      const content = await page.getTextContent()

      const pageText = content.items
        .map(item => item.str)
        .join('\n')

      fullText += '\n' + pageText
    }

    rawText.value = fullText.trim()
    parseText()

    message.value = `PDF 本地解析完成，共 ${parsedList.value.length} 筆。確認後再上傳 Firebase。`
  } catch (error) {
    console.error(error)
    message.value = 'PDF 讀取失敗，請確認 PDF 是否含有可選取文字'
  } finally {
    loading.value = false
    event.target.value = ''
  }
}

function parseText() {
  message.value = ''
  parsedList.value = []

  const text = rawText.value
    .replace(/\r/g, '')
    .replace(/\u00A0/g, ' ')
    .replace(/（/g, '(')
    .replace(/）/g, ')')
    .trim()

  if (!text) {
    message.value = '請先上傳 PDF 或貼上排課文字'
    return
  }

  const lines = text
    .split('\n')
    .map(line => line.trim())
    .filter(Boolean)

  const rows = []
  let current = []

  for (const line of lines) {
    if (isDateLine(line)) {
      if (current.length > 0) {
        rows.push(current)
      }

      current = [line]
    } else {
      if (current.length > 0) {
        current.push(line)
      }
    }
  }

  if (current.length > 0) {
    rows.push(current)
  }

  parsedList.value = rows
    .map((row, index) => parseRow(row, index))
    .filter(Boolean)

  if (parsedList.value.length === 0) {
    message.value = '沒有解析到資料，請確認內容是否包含日期、老師、時間、學生與 Meet 連結'
  } else {
    message.value = `本地成功解析 ${parsedList.value.length} 筆，尚未上傳 Firebase`
  }
}

function isDateLine(line) {
  return /^\d{1,2}\/\d{1,2}\/\d{2,4}$/.test(line)
}

function parseRow(row, index) {
  const text = row
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim()

  const dateMatch = text.match(/\d{1,2}\/\d{1,2}\/\d{2,4}/)
  const timeMatch = text.match(/\d{1,2}:\d{2}\s*(AM|PM)\s*-\s*\d{1,2}:\d{2}\s*(AM|PM)/i)
  const meetMatch = text.match(/https:\/\/meet\.google\.com\/[^\s]+/i)

  if (!dateMatch || !timeMatch) {
    return null
  }

  const date = convertDate(dateMatch[0])
  const { startTime, endTime } = convertTimeRange(timeMatch[0])

  const teacherName = getTeacherName(text)
  const meetUrl = meetMatch ? cleanMeetUrl(meetMatch[0]) : ''

  let content = text
    .replace(dateMatch[0], ' ')
    .replace(teacherName, ' ')
    .replace(timeMatch[0], ' ')
    .replace(meetUrl, ' ')
    .replace(/https:\/\/meet\.google\.com\/[^\s]+/i, ' ')
    .replace(/[a-z]{3}-[a-z]{4}-[a-z]{3}/i, ' ')
    .replace(/\(Classroom[^)]*\)/gi, ' ')
    .replace(/\(Classrrom[^)]*\)/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim()

  const schoolName = getSchoolName(content)

  if (schoolName) {
    content = content
      .replace(new RegExp(escapeRegExp(schoolName), 'i'), ' ')
      .replace(/\s+/g, ' ')
      .trim()
  }

  const level = getLevel(content)

  let studentName = ''
  let courseTitle = ''

  if (level) {
    const parts = content.split(new RegExp(escapeRegExp(level), 'i'))

    studentName = cleanText(parts[0])
    courseTitle = cleanText(parts.slice(1).join(' '))
  } else {
    const tokens = content.split(' ')
    studentName = cleanText(tokens.slice(0, 2).join(' '))
    courseTitle = cleanText(tokens.slice(2).join(' '))
  }

  const remarks = getRemarks(text, meetMatch ? meetMatch[0] : '')

  return {
    tempId: `${Date.now()}-${index}`,

    date,
    teacherName,
    studentName,
    level,
    courseTitle,
    courseName: courseTitle,
    schoolName,
    startTime,
    endTime,
    meetUrl,
    remarks,

    studentOnline: false,
    teacherOnline: false,
    classStarted: false,
    classCompleted: false,

    studentOnlineAt: '',
    teacherOnlineAt: '',
    classStartedAt: '',
    classCompletedAt: ''
  }
}

function getTeacherName(text) {
  const match = text.match(/T\.?\s*[A-Z][A-Z\s.]*/i)

  if (!match) return ''

  return cleanText(match[0])
}

function getSchoolName(text) {
  const schoolNames = [
    "EDEN'S ENGLISH SCHOOL",
    'TEAM BEN',
    'KANE',
    'VISION'
  ]

  const upperText = text.toUpperCase()

  return schoolNames.find(school => upperText.includes(school)) || ''
}

function getLevel(text) {
  const levelOptions = [
    'TOEIC SPEAKING 120',
    'TOEIC SPEAKING',
    'PRE-A1',
    'A1-A2',
    'A1',
    'A2',
    'B1',
    'B2',
    'C1',
    'C2'
  ]

  const upperText = text.toUpperCase()

  return levelOptions.find(level => upperText.includes(level)) || ''
}

function getRemarks(text, meetUrl) {
  if (!meetUrl) return ''

  const parts = text.split(meetUrl)

  if (!parts[1]) return ''

  return cleanText(parts[1])
}

function cleanMeetUrl(url) {
  return String(url || '')
    .replace(/[),.。]+$/g, '')
    .trim()
}

function convertDate(dateText) {
  const parts = dateText.split('/')

  const month = parts[0].padStart(2, '0')
  const day = parts[1].padStart(2, '0')

  let year = parts[2]

  if (year.length === 2) {
    year = `20${year}`
  }

  return `${year}-${month}-${day}`
}

function convertTimeRange(timeText) {
  const clean = timeText
    .replace(/\s+/g, '')
    .toUpperCase()

  const [startRaw, endRaw] = clean.split('-')

  return {
    startTime: convertSingleTime(startRaw),
    endTime: convertSingleTime(endRaw)
  }
}

function convertSingleTime(timeText) {
  const match = timeText.match(/(\d{1,2}):(\d{2})(AM|PM)/i)

  if (!match) return timeText

  let hour = Number(match[1])
  const minute = match[2]
  const period = match[3].toUpperCase()

  if (period === 'PM' && hour !== 12) {
    hour += 12
  }

  if (period === 'AM' && hour === 12) {
    hour = 0
  }

  return `${String(hour).padStart(2, '0')}:${minute}`
}

function cleanText(value) {
  return String(value || '')
    .replace(/\s+/g, ' ')
    .trim()
}

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

async function confirmUpload() {
  if (parsedList.value.length === 0) {
    message.value = '沒有資料可以上傳'
    return
  }

  const yes = window.confirm(`確定要上傳 ${parsedList.value.length} 筆排課到 Firebase 嗎？`)

  if (!yes) return

  saving.value = true
  message.value = '正在上傳 Firebase...'

  try {
    const list = parsedList.value.map(item => {
      const { tempId, ...data } = item
      return data
    })

    await importSchedules(list)

    message.value = `已成功上傳 ${list.length} 筆排課到 Firebase`

    rawText.value = ''
    parsedList.value = []
  } catch (error) {
    console.error(error)
    message.value = '上傳 Firebase 失敗，請確認 Firebase 設定、Firestore 權限與網路狀態'
  } finally {
    saving.value = false
  }
}

function clearAll() {
  rawText.value = ''
  parsedList.value = []
  message.value = ''
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

.status-card {
  background: #111827;
  color: white;
  padding: 18px 22px;
  border-radius: 20px;
  margin-bottom: 22px;
  display: flex;
  justify-content: space-between;
  gap: 16px;
  align-items: center;
}

.status-card p {
  margin: 6px 0 0;
  color: #d1d5db;
}

.status-pill {
  background: #facc15;
  color: #111827;
  padding: 10px 14px;
  border-radius: 999px;
  font-weight: bold;
  white-space: nowrap;
}

.card,
.table-card {
  background: white;
  padding: 24px;
  border-radius: 20px;
  margin-bottom: 24px;
  box-shadow: 0 8px 20px rgba(0,0,0,0.06);
}

label {
  display: block;
  margin-bottom: 10px;
  color: #374151;
  font-weight: bold;
}

.file-input {
  width: 100%;
  padding: 14px;
  border: 1px dashed #9ca3af;
  border-radius: 14px;
  background: #f9fafb;
  box-sizing: border-box;
}

.hint {
  margin: 12px 0 0;
  color: #6b7280;
  font-size: 14px;
}

.loading {
  margin-top: 14px;
  color: #2563eb;
  font-weight: bold;
}

textarea {
  width: 100%;
  min-height: 260px;
  padding: 16px;
  border-radius: 14px;
  border: 1px solid #d1d5db;
  font-size: 15px;
  box-sizing: border-box;
  resize: vertical;
}

textarea:focus {
  outline: none;
  border-color: #2563eb;
}

.actions {
  display: flex;
  gap: 12px;
  margin-top: 18px;
  flex-wrap: wrap;
}

button {
  border: none;
  background: #2563eb;
  color: white;
  padding: 13px 20px;
  border-radius: 12px;
  cursor: pointer;
  font-size: 15px;
  font-weight: bold;
}

button:hover {
  background: #1d4ed8;
}

button:disabled {
  background: #9ca3af;
  cursor: not-allowed;
}

.save-btn {
  background: #16a34a;
}

.save-btn:hover {
  background: #15803d;
}

.clear-btn {
  background: #6b7280;
}

.clear-btn:hover {
  background: #4b5563;
}

.message {
  margin-top: 15px;
  color: #166534;
  font-weight: bold;
}

.preview-head {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  align-items: center;
  margin-bottom: 16px;
}

.preview-head h2 {
  margin: 0;
  color: #111827;
}

.preview-head p {
  margin: 6px 0 0;
  color: #6b7280;
}

.small {
  padding: 10px 14px;
  white-space: nowrap;
}

.table-wrap {
  overflow-x: auto;
}

table {
  width: 100%;
  min-width: 1200px;
  border-collapse: collapse;
}

th,
td {
  padding: 12px;
  border-bottom: 1px solid #e5e7eb;
  text-align: left;
  font-size: 14px;
  vertical-align: top;
}

th {
  background: #f9fafb;
  color: #374151;
}

td {
  color: #111827;
}

.link-cell {
  max-width: 280px;
  word-break: break-all;
}

.saving-mask {
  position: fixed;
  inset: 0;
  background: rgba(17, 24, 39, 0.45);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 50;
}

.saving-box {
  background: white;
  border-radius: 20px;
  padding: 28px;
  min-width: 280px;
  text-align: center;
  box-shadow: 0 20px 40px rgba(0,0,0,0.2);
}

.saving-box strong {
  color: #111827;
  font-size: 18px;
}

.saving-box p {
  color: #6b7280;
  margin-bottom: 0;
}

@media (max-width: 768px) {
  .page {
    padding: 18px;
  }

  .topbar,
  .actions,
  .preview-head,
  .status-card {
    flex-direction: column;
    align-items: stretch;
  }

  .back-btn,
  button {
    text-align: center;
    width: 100%;
  }

  .status-pill {
    text-align: center;
  }
}
</style>