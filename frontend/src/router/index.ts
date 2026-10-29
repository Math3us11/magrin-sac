import { createRouter, createWebHistory } from 'vue-router'

import { pinia } from '@/stores'
import { useAuthStore } from '@/stores/auth'
import { useNavigationStore } from '@/stores/navigation'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'home',
      component: () => import('@/views/HomeView.vue'),
      meta: { requiresAuth: true, title: 'Início' },
    },
    {
      path: '/relatorios/dashboard',
      name: 'reports-dashboard',
      component: () => import('@/views/DashboardView.vue'),
      meta: {
        requiredPermission: 'reports.dashboard.view',
        requiresAuth: true,
        title: 'Dashboard',
      },
    },
    {
      path: '/agendamentos/novo',
      name: 'appointments-new',
      component: () => import('@/views/appointments/NewAppointmentView.vue'),
      meta: {
        requiredPermission: 'appointments.create',
        requiresAuth: true,
        title: 'Novo agendamento',
      },
    },
    {
      path: '/agendamentos/meus',
      name: 'appointments-mine',
      component: () => import('@/views/appointments/MyAppointmentsView.vue'),
      meta: {
        requiredPermission: 'appointments.read.own',
        requiresAuth: true,
        title: 'Meus agendamentos',
      },
    },
    {
      path: '/professor/agenda',
      name: 'professor-availability',
      component: () => import('@/views/professor/AvailabilityView.vue'),
      meta: {
        requiredPermission: 'availability.manage.own',
        requiresAuth: true,
        title: 'Minha agenda',
      },
    },
    {
      path: '/professor/atendimentos',
      name: 'professor-attendances',
      component: () => import('@/views/attendance/AttendancesView.vue'),
      props: { scope: 'professor' },
      meta: {
        requiredPermission: 'attendance.manage.assigned',
        requiresAuth: true,
        title: 'Atendimentos',
      },
    },
    {
      path: '/professor/atendimentos/:attendanceId',
      name: 'professor-attendances-view',
      component: () => import('@/views/attendance/AttendanceDetailsView.vue'),
      props: { scope: 'professor' },
      meta: {
        requiredPermission: 'attendance.manage.assigned',
        requiresAuth: true,
        title: 'Visualizar atendimento',
      },
    },
    {
      path: '/administracao/agenda',
      name: 'administration-schedule',
      component: () => import('@/views/administration/ScheduleView.vue'),
      meta: {
        requiredPermission: 'availability.read.any',
        requiresAuth: true,
        title: 'Agenda geral',
      },
    },
    {
      path: '/administracao/atendimentos',
      name: 'administration-attendances',
      component: () => import('@/views/attendance/AttendancesView.vue'),
      props: { scope: 'admin' },
      meta: {
        requiredPermission: 'attendance.manage.any',
        requiresAuth: true,
        title: 'Atendimentos',
      },
    },
    {
      path: '/administracao/atendimentos/:attendanceId',
      name: 'administration-attendances-view',
      component: () => import('@/views/attendance/AttendanceDetailsView.vue'),
      props: { scope: 'admin' },
      meta: {
        requiredPermission: 'attendance.manage.any',
        requiresAuth: true,
        title: 'Visualizar atendimento',
      },
    },
    {
      path: '/administracao/auditoria',
      name: 'administration-audit',
      component: () => import('@/views/administration/AuditView.vue'),
      meta: {
        requiredPermission: 'audit.read',
        requiresAuth: true,
        title: 'Auditoria',
      },
    },
    {
      path: '/administracao/parametros',
      name: 'administration-parameters',
      component: () => import('@/views/administration/ParametersView.vue'),
      meta: {
        requiredPermission: 'parameters.manage',
        requiresAuth: true,
        title: 'Parâmetros',
      },
    },
    {
      path: '/administracao/usuarios',
      name: 'administration-users',
      component: () => import('@/views/administration/UsersView.vue'),
      meta: {
        requiredPermission: 'users.manage',
        requiresAuth: true,
        title: 'Usuários',
      },
    },
    {
      path: '/administracao/usuarios/novo',
      name: 'administration-users-new',
      component: () => import('@/views/administration/UserCreateView.vue'),
      meta: {
        requiredPermission: 'users.manage',
        requiresAuth: true,
        title: 'Cadastrar usuário',
      },
    },
    {
      path: '/administracao/usuarios/:userId',
      name: 'administration-users-view',
      component: () => import('@/views/administration/UserDetailsView.vue'),
      props: { mode: 'view' },
      meta: {
        requiredPermission: 'users.manage',
        requiresAuth: true,
        title: 'Visualizar usuário',
      },
    },
    {
      path: '/administracao/usuarios/:userId/editar',
      name: 'administration-users-edit',
      component: () => import('@/views/administration/UserDetailsView.vue'),
      props: { mode: 'edit' },
      meta: {
        requiredPermission: 'users.manage',
        requiresAuth: true,
        title: 'Editar usuário',
      },
    },
    {
      path: '/login',
      name: 'login',
      component: () => import('@/views/LoginView.vue'),
      meta: { guestOnly: true, hideShell: true, title: 'Entrar' },
    },
  ],
})

router.beforeEach(async (to) => {
  const auth = useAuthStore(pinia)
  const navigation = useNavigationStore(pinia)

  try {
    await auth.initialize()
  } catch {
    if (to.name === 'login') return true
    return { name: 'login', query: { unavailable: '1' } }
  }

  if (to.meta.requiresAuth && !auth.isAuthenticated) {
    navigation.reset()
    return { name: 'login', query: { redirect: to.fullPath } }
  }

  if (auth.requiresPasswordChange) {
    navigation.reset()
    return to.name === 'login' ? true : { name: 'login', query: { redirect: to.fullPath } }
  }

  if (to.meta.guestOnly && auth.isAuthenticated) return { name: 'home' }

  if (auth.isAuthenticated) {
    try {
      await navigation.load()
    } catch {
      if (to.meta.requiredPermission) {
        return { name: 'home', query: { navigationUnavailable: '1' } }
      }
    }

    if (
      to.meta.requiredPermission &&
      navigation.initialized &&
      !navigation.hasPermission(to.meta.requiredPermission)
    ) {
      return { name: 'home', query: { forbidden: '1' } }
    }
  }

  return true
})

export default router
