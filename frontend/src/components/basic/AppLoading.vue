<script setup lang="ts">
import { Icon } from '@iconify/vue'

import { loaderCircleIcon } from '@/icons'

const props = withDefaults(
  defineProps<{
    active: boolean
    description?: string
    icon?: typeof loaderCircleIcon
  }>(),
  {
    description: 'Carregando...',
    icon: undefined,
  },
)
</script>

<template>
  <Teleport to="body">
    <Transition
      enter-active-class="transition duration-150 ease-out"
      enter-from-class="opacity-0"
      leave-active-class="transition duration-100 ease-in"
      leave-to-class="opacity-0"
    >
      <div
        v-if="active"
        class="fixed inset-0 z-[110] flex items-center justify-center bg-black/45 p-4 backdrop-blur-[2px]"
        data-testid="app-loading"
        role="status"
        aria-live="polite"
        aria-atomic="true"
        aria-busy="true"
      >
        <div
          class="surface-card flex min-w-52 flex-col items-center gap-4 rounded-3xl border border-outline bg-surface px-8 py-7 text-center"
        >
          <Icon
            class="h-10 w-10 text-brand-primary"
            :class="{ 'animate-spin': !props.icon }"
            :icon="props.icon ?? loaderCircleIcon"
            aria-hidden="true"
          />
          <p class="text-sm font-semibold text-content">{{ description }}</p>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>
