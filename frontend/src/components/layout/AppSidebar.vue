<script setup lang="ts">
import { Icon } from '@iconify/vue'
import { ref, watch } from 'vue'
import { useRoute } from 'vue-router'

import {
  calendarCheckIcon,
  chartCombinedIcon,
  chevronDownIcon,
  chevronRightIcon,
  circleAlertIcon,
  clockIcon,
  historyIcon,
  houseIcon,
  panelLeftCloseIcon,
  panelLeftOpenIcon,
  shieldCheckIcon,
  usersIcon,
  xIcon,
} from '@/icons'
import type { NavigationItem } from '@/types/navigation'

const props = defineProps<{
  collapsed: boolean
  errorMessage: string
  isLoading: boolean
  items: NavigationItem[]
  mobileOpen: boolean
}>()

const emit = defineEmits<{
  closeMobile: []
  expandDesktop: []
  retry: []
  toggleDesktop: []
}>()

const route = useRoute()
const expandedGroups = ref<Set<string>>(new Set())

const iconMap = {
  'calendar-check': calendarCheckIcon,
  'chart-no-axes-combined': chartCombinedIcon,
  'clock-3': clockIcon,
  history: historyIcon,
  house: houseIcon,
  'shield-check': shieldCheckIcon,
  users: usersIcon,
}

function resolveIcon(iconKey: string | null) {
  if (iconKey && iconKey in iconMap) return iconMap[iconKey as keyof typeof iconMap]
  return circleAlertIcon
}

function isExpanded(code: string): boolean {
  return expandedGroups.value.has(code)
}

function isItemActive(item: NavigationItem): boolean {
  if (item.routeName === route.name) return true
  return item.children.some((child) => isItemActive(child))
}

function toggleGroup(item: NavigationItem) {
  const nextGroups = new Set(expandedGroups.value)

  if (props.collapsed) {
    nextGroups.add(item.code)
    expandedGroups.value = nextGroups
    emit('expandDesktop')
    return
  }

  if (nextGroups.has(item.code)) nextGroups.delete(item.code)
  else nextGroups.add(item.code)

  expandedGroups.value = nextGroups
}

watch(
  () => props.items,
  (items) => {
    const nextGroups = new Set(expandedGroups.value)

    for (const item of items) {
      if (item.children.length > 0) nextGroups.add(item.code)
    }

    expandedGroups.value = nextGroups
  },
  { immediate: true },
)
</script>

<template>
  <aside
    id="app-sidebar"
    class="fixed inset-y-0 left-0 z-50 flex w-72 flex-col overflow-hidden border-r border-outline bg-surface shadow-2xl transition-[transform,width] duration-200 ease-out lg:sticky lg:bottom-auto lg:left-auto lg:right-auto lg:top-18 lg:z-20 lg:h-[calc(100dvh-4.5rem)] lg:self-start lg:translate-x-0 lg:shadow-none"
    :class="[
      mobileOpen ? 'visible translate-x-0' : 'invisible -translate-x-full lg:visible',
      collapsed ? 'lg:w-24' : 'lg:w-72',
    ]"
  >
    <button
      class="absolute right-3 top-3 inline-flex h-10 w-10 items-center justify-center rounded-xl text-content-muted hover:bg-surface-subtle hover:text-brand-primary lg:hidden"
      type="button"
      aria-label="Fechar menu de navegação"
      title="Fechar menu de navegação"
      @click="emit('closeMobile')"
    >
      <Icon class="h-5 w-5" :icon="xIcon" aria-hidden="true" />
    </button>

    <div
      class="min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 pb-5 pt-16 lg:py-5"
      data-testid="sidebar-scroll-area"
    >
      <p
        class="mb-3 px-3 text-[0.65rem] font-bold uppercase tracking-[0.16em] text-content-muted"
        :class="collapsed ? 'lg:sr-only' : ''"
      >
        Navegação
      </p>

      <div v-if="isLoading && items.length === 0" class="space-y-2" aria-label="Carregando menu">
        <div
          v-for="item in 4"
          :key="item"
          class="h-11 animate-pulse rounded-xl bg-surface-subtle"
        ></div>
      </div>

      <div
        v-else-if="errorMessage && items.length === 0"
        class="rounded-xl border border-status-danger bg-status-danger-soft p-3"
        role="alert"
      >
        <Icon
          class="mx-auto h-5 w-5 text-status-danger"
          :icon="circleAlertIcon"
          aria-hidden="true"
        />
        <p
          class="mt-2 text-center text-xs leading-5 text-content"
          :class="{ 'lg:sr-only': collapsed }"
        >
          {{ errorMessage }}
        </p>
        <button
          class="mt-3 w-full rounded-lg bg-status-danger px-3 py-2 text-xs font-semibold text-white"
          :class="{ 'lg:sr-only': collapsed }"
          type="button"
          @click="emit('retry')"
        >
          Tentar novamente
        </button>
      </div>

      <nav v-else aria-label="Menu principal">
        <ul class="space-y-1.5">
          <li v-for="item in items" :key="item.code">
            <RouterLink
              v-if="item.routeName"
              class="group flex min-h-11 items-center gap-3 rounded-xl px-3 text-sm font-semibold transition-colors"
              :class="[
                isItemActive(item)
                  ? 'bg-brand-primary-soft text-brand-primary'
                  : 'text-content-muted hover:bg-surface-subtle hover:text-content',
                collapsed ? 'lg:justify-center lg:px-0' : '',
              ]"
              :title="collapsed ? item.label : undefined"
              :to="{ name: item.routeName }"
            >
              <Icon class="h-5 w-5 shrink-0" :icon="resolveIcon(item.iconKey)" aria-hidden="true" />
              <span class="truncate" :class="{ 'lg:sr-only': collapsed }">{{ item.label }}</span>
            </RouterLink>

            <template v-else>
              <button
                class="group flex min-h-11 w-full items-center gap-3 rounded-xl px-3 text-left text-sm font-semibold transition-colors"
                :class="[
                  isItemActive(item)
                    ? 'bg-brand-primary-soft text-brand-primary'
                    : 'text-content-muted hover:bg-surface-subtle hover:text-content',
                  collapsed ? 'lg:justify-center lg:px-0' : '',
                ]"
                type="button"
                :aria-expanded="isExpanded(item.code)"
                :title="collapsed ? item.label : undefined"
                @click="toggleGroup(item)"
              >
                <Icon
                  class="h-5 w-5 shrink-0"
                  :icon="resolveIcon(item.iconKey)"
                  aria-hidden="true"
                />
                <span class="min-w-0 flex-1 truncate" :class="{ 'lg:sr-only': collapsed }">
                  {{ item.label }}
                </span>
                <Icon
                  class="h-4 w-4 shrink-0"
                  :class="{ 'lg:hidden': collapsed }"
                  :icon="isExpanded(item.code) ? chevronDownIcon : chevronRightIcon"
                  aria-hidden="true"
                />
              </button>

              <ul
                v-show="isExpanded(item.code)"
                class="mt-1 space-y-1 border-l border-outline pl-3"
                :class="collapsed ? 'lg:hidden' : 'ml-5'"
              >
                <li v-for="child in item.children" :key="child.code">
                  <RouterLink
                    v-if="child.routeName"
                    class="flex min-h-10 items-center gap-3 rounded-xl px-3 text-sm transition-colors"
                    :class="
                      isItemActive(child)
                        ? 'bg-brand-secondary-soft font-semibold text-brand-secondary'
                        : 'text-content-muted hover:bg-surface-subtle hover:text-content'
                    "
                    :to="{ name: child.routeName }"
                  >
                    <Icon
                      class="h-4 w-4 shrink-0"
                      :icon="resolveIcon(child.iconKey)"
                      aria-hidden="true"
                    />
                    <span class="truncate">{{ child.label }}</span>
                  </RouterLink>
                </li>
              </ul>
            </template>
          </li>
        </ul>
      </nav>
    </div>

    <div class="hidden shrink-0 border-t border-outline p-3 lg:block">
      <button
        class="flex h-11 w-full items-center gap-3 rounded-xl px-3 text-sm font-semibold text-content-muted hover:bg-surface-subtle hover:text-brand-primary"
        :class="collapsed ? 'justify-center px-0' : ''"
        type="button"
        :aria-label="collapsed ? 'Expandir menu lateral' : 'Minimizar menu lateral'"
        :title="collapsed ? 'Expandir menu lateral' : 'Minimizar menu lateral'"
        @click="emit('toggleDesktop')"
      >
        <Icon
          class="h-5 w-5 shrink-0"
          :icon="collapsed ? panelLeftOpenIcon : panelLeftCloseIcon"
          aria-hidden="true"
        />
        <span :class="{ 'sr-only': collapsed }">Minimizar menu</span>
      </button>
    </div>
  </aside>
</template>
