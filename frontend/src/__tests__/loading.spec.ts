import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it } from 'vitest'

import { infoIcon } from '@/icons'
import { useLoadingStore } from '@/stores/loading'

describe('loading global', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('usa a apresentação padrão e encerra a operação pelo identificador', () => {
    const loading = useLoadingStore()
    const id = loading.start()

    expect(loading.active).toBe(true)
    expect(loading.description).toBe('Carregando...')
    expect(loading.icon).toBeUndefined()

    loading.stop(id)

    expect(loading.active).toBe(false)
  })

  it('mantém o loading enquanto houver operações concorrentes', () => {
    const loading = useLoadingStore()
    const firstId = loading.start({ description: 'Carregando usuários...' })
    const secondId = loading.start({ description: 'Preparando agenda...', icon: infoIcon })

    expect(loading.description).toBe('Preparando agenda...')
    expect(loading.icon).toStrictEqual(infoIcon)

    loading.stop(secondId)

    expect(loading.active).toBe(true)
    expect(loading.description).toBe('Carregando usuários...')

    loading.stop(firstId)

    expect(loading.active).toBe(false)
  })
})
