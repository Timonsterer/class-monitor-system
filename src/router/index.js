import { createRouter, createWebHistory } from 'vue-router'

import AdminLoginView from '@/views/AdminLoginView.vue'
import AdminHomeView from '@/views/AdminHomeView.vue'
import ScheduleNewView from '@/views/ScheduleNewView.vue'
import ScheduleMonitorView from '@/views/ScheduleMonitorView.vue'
import ReportView from '@/views/ReportView.vue'
import ScheduleImportView from '@/views/ScheduleImportView.vue'

import StudentView from '@/views/StudentView.vue'
import TeacherView from '@/views/TeacherView.vue'

const routes = [
  {
    path: '/',
    redirect: '/admin/login'
  },

  {
    path: '/admin/login',
    component: AdminLoginView
  },

  {
    path: '/admin',
    component: AdminHomeView
  },

  {
    path: '/admin/new',
    component: ScheduleNewView
  },

  {
    path: '/admin/import',
    component: ScheduleImportView
  },

  {
    path: '/admin/monitor',
    component: ScheduleMonitorView
  },

  {
    path: '/admin/report',
    component: ReportView
  },

  {
    path: '/student',
    component: StudentView
  },

  {
    path: '/teacher',
    component: TeacherView
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

export default router