<script setup lang="ts">
import { Icon } from '@iconify/vue'
import { computed } from 'vue'

import { loaderCircleIcon } from '@/icons'

defineOptions({ inheritAttrs: false })

withDefaults(
  defineProps<{
    block?: boolean
    disabled?: boolean
    loading?: boolean
    loadingLabel?: string
    type?: 'button' | 'reset' | 'submit'
    variant?: 'ghost' | 'primary' | 'secondary'
  }>(),
  {
    block: false,
    disabled: false,
    loading: false,
    loadingLabel: 'Carregando...',
    type: 'button',
    variant: 'primary',
  },
)

const variantClasses = computed(() => ({
  ghost: 'bg-transparent text-content hover:bg-surface-subtle',
  primary:
    'bg-brand-primary text-on-primary shadow-lg shadow-brand-primary/20 hover:bg-brand-primary-hover',
  secondary:
    'border border-brand-secondary bg-brand-secondary text-on-secondary hover:bg-brand-secondary-hover',
}))
</script>

<template>
  <button
    v-bind="$attrs"
    class="inline-flex h-13 items-center justify-center gap-3 rounded-xl px-5 text-sm font-bold disabled:cursor-not-allowed disabled:opacity-70"
    :class="[variantClasses[variant], { 'w-full': block }]"
    :type="type"
    :disabled="disabled || loading"
    :aria-busy="loading"
  >
    <Icon v-if="loading" class="h-4 w-4 animate-spin" :icon="loaderCircleIcon" aria-hidden="true" />
    <span>{{ loading ? loadingLabel : undefined }}<slot v-if="!loading"></slot></span>
    <slot v-if="!loading" name="icon"></slot>
  </button>
</template>
