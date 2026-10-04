import { computed, ref } from 'vue'
import { defineStore } from 'pinia'

import { loaderCircleIcon } from '@/icons'

type LoadingIcon = typeof loaderCircleIcon

export type LoadingOptions = {
  description?: string
  icon?: LoadingIcon
}

type LoadingOperation = Required<Pick<LoadingOptions, 'description'>> & {
  icon?: LoadingIcon
  id: number
}

const DEFAULT_DESCRIPTION = 'Carregando...'
let nextLoadingId = 1

export const useLoadingStore = defineStore('loading', () => {
  const operations = ref<LoadingOperation[]>([])
  const currentOperation = computed(() => operations.value[operations.value.length - 1])
  const active = computed(() => operations.value.length > 0)
  const description = computed(() => currentOperation.value?.description ?? DEFAULT_DESCRIPTION)
  const icon = computed(() => currentOperation.value?.icon)

  function start(options: LoadingOptions = {}): number {
    const operation: LoadingOperation = {
      description: options.description?.trim() || DEFAULT_DESCRIPTION,
      icon: options.icon,
      id: nextLoadingId++,
    }

    operations.value.push(operation)
    return operation.id
  }

  function stop(id: number): void {
    operations.value = operations.value.filter((operation) => operation.id !== id)
  }

  function clear(): void {
    operations.value = []
  }

  return { active, clear, description, icon, start, stop }
})
