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
      component: () => import('@/views/FeaturePlaceholderView.vue'),
      props: {
        description:
          'Os indicadores de atendimento serão apresentados aqui conforme o fluxo de relatórios evoluir.',
        eyebrow: 'Relatórios',
        title: 'Dashboard',
      },
      meta: {
        requiredPermission: 'reports.dashboard.view',
        requiresAuth: true,
        title: 'Dashboard',
      },
    },
    {
      path: '/agendamentos/novo',
      name: 'appointments-new',
      component: () => import('@/views/FeaturePlaceholderView.vue'),
      props: {
        description:
          'A seleção de disponibilidade e a confirmação segura do atendimento serão construídas nesta área.',
        eyebrow: 'Agendamentos',
        title: 'Novo agendamento',
      },
      meta: {
        requiredPermission: 'appointments.create',
        requiresAuth: true,
        title: 'Novo agendamento',
      },
    },
    {
      path: '/agendamentos/meus',
      name: 'appointments-mine',
      component: () => import('@/views/FeaturePlaceholderView.vue'),
      props: {
        description:
          'Os próximos compromissos e o histórico de atendimentos do aluno ficarão reunidos aqui.',
        eyebrow: 'Agendamentos',
        title: 'Meus agendamentos',
      },
      meta: {
        requiredPermission: 'appointments.read.own',
        requiresAuth: true,
        title: 'Meus agendamentos',
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
