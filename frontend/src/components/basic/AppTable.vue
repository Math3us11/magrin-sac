<script setup lang="ts">
import { Icon } from '@iconify/vue'
import { computed, ref, useId, watch } from 'vue'

import AppButton from '@/components/basic/AppButton.vue'
import { chevronDownIcon, chevronLeftIcon, chevronRightIcon, searchIcon, xIcon } from '@/icons'
import type { AppTableColumn, AppTableFilter, AppTableRecord } from '@/types/table'

const props = withDefaults(
  defineProps<{
    bodyMaxHeight?: number | string
    bodyMinHeight?: number | string
    columns: AppTableColumn[]
    emptyMessage?: string
    error?: string
    filters?: AppTableFilter[]
    filterValues?: Record<string, string>
    loading?: boolean
    name: string
    page?: number
    pageSize?: number
    pageSizeOptions?: number[]
    pagination?: boolean
    records: AppTableRecord[]
    rowKey?: string
    search?: string
    searchable?: boolean
    searchPlaceholder?: string
    total?: number
  }>(),
  {
    bodyMaxHeight: 576,
    bodyMinHeight: 288,
    emptyMessage: 'Nenhum registro encontrado.',
    error: '',
    filters: () => [],
    filterValues: () => ({}),
    loading: false,
    page: 1,
    pageSize: 20,
    pageSizeOptions: () => [10, 20, 50],
    pagination: false,
    rowKey: 'id',
    search: '',
    searchable: false,
    searchPlaceholder: 'Buscar registros...',
    total: undefined,
  },
)

const emit = defineEmits<{
  retry: []
  search: [value: string]
  'update:filter': [name: string, value: string]
  'update:page': [page: number]
  'update:pageSize': [pageSize: number]
  'update:search': [value: string]
}>()

const titleId = `app-table-${useId()}`
const searchDraft = ref(props.search)
const totalRecords = computed(() => props.total ?? props.records.length)
const totalPages = computed(() => Math.max(1, Math.ceil(totalRecords.value / props.pageSize)))
const displayColumns = computed(() => [
  ...props.columns.filter(({ value }) => value === 'actions'),
  ...props.columns.filter(({ value }) => value !== 'actions'),
])
const visiblePages = computed<Array<number | string>>(() => {
  if (totalPages.value <= 7) {
    return Array.from({ length: totalPages.value }, (_, index) => index + 1)
  }

  const pages = [...new Set([1, props.page - 1, props.page, props.page + 1, totalPages.value])]
    .filter((page) => page >= 1 && page <= totalPages.value)
    .sort((left, right) => left - right)
  const result: Array<number | string> = []

  pages.forEach((page, index) => {
    const previousPage = pages[index - 1]
    if (previousPage !== undefined && page - previousPage > 1) {
      result.push(`ellipsis-${previousPage}`)
    }
    result.push(page)
  })

  return result
})

watch(
  () => props.search,
  (value) => {
    searchDraft.value = value
  },
)

function cssSize(size: number | string | undefined): string | undefined {
  if (typeof size === 'number') return `${size}px`
  return size
}

function resolveValue(record: AppTableRecord, path: string): unknown {
  return path.split('.').reduce<unknown>((value, key) => {
    if (!value || typeof value !== 'object') return undefined
    return (value as Record<string, unknown>)[key]
  }, record)
}

function rowIdentifier(record: AppTableRecord, index: number): string | number {
  const value = resolveValue(record, props.rowKey)
  return typeof value === 'string' || typeof value === 'number' ? value : index
}

function displayValue(value: unknown): string {
  if (value === null || value === undefined || value === '') return '—'
  if (typeof value === 'boolean') return value ? 'Sim' : 'Não'
  return String(value)
}

function updateSearch(event: Event) {
  searchDraft.value = (event.target as HTMLInputElement).value
  emit('update:search', searchDraft.value)
}

function submitSearch() {
  emit('search', searchDraft.value.trim())
}

function clearSearch() {
  searchDraft.value = ''
  emit('update:search', '')
}

function updateFilter(name: string, event: Event) {
  emit('update:filter', name, (event.target as HTMLSelectElement).value)
}

function updatePageSize(event: Event) {
  emit('update:pageSize', Number((event.target as HTMLSelectElement).value))
}
</script>

<template>
  <section
    class="surface-card overflow-hidden rounded-2xl border border-outline bg-surface"
    :aria-labelledby="titleId"
  >
    <span class="sr-only" aria-live="polite">
      {{ loading ? 'Carregando registros.' : '' }}
    </span>
    <header
      class="flex items-center justify-between gap-4 border-b border-outline px-5 py-4 sm:px-6"
    >
      <h2 :id="titleId" class="text-lg font-bold text-content">{{ name }}</h2>
      <div class="ml-auto flex items-center justify-end gap-3">
        <slot name="header"></slot>
        <p
          v-if="!loading && !error"
          class="text-right text-sm text-content-muted"
          data-testid="table-record-count"
        >
          {{ totalRecords }}
          {{ totalRecords === 1 ? 'registro encontrado' : 'registros encontrados' }}
        </p>
      </div>
    </header>

    <div
      v-if="searchable || filters.length > 0"
      class="grid gap-3 border-b border-outline bg-surface-subtle/50 px-5 py-4 sm:px-6 lg:grid-cols-[minmax(16rem,1fr)_auto] lg:items-end"
      aria-label="Busca e filtros da tabela"
    >
      <form
        v-if="searchable"
        class="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end"
        role="search"
        @submit.prevent="submitSearch"
      >
        <label class="block">
          <span class="mb-1.5 block text-xs font-bold text-content-muted">Pesquisar</span>
          <span class="relative block">
            <Icon
              class="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-content-muted"
              :icon="searchIcon"
              aria-hidden="true"
            />
            <input
              class="h-11 w-full rounded-xl border border-outline bg-surface pl-10 pr-10 text-sm text-content outline-none transition placeholder:text-content-muted focus:border-focus focus:ring-2 focus:ring-focus/20"
              data-testid="table-search"
              type="text"
              role="searchbox"
              enterkeyhint="search"
              :placeholder="searchPlaceholder"
              :value="searchDraft"
              @input="updateSearch"
            />
            <button
              v-if="searchDraft"
              class="absolute right-2 top-1/2 inline-flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-lg text-content-muted transition hover:bg-surface-subtle hover:text-content focus-visible:outline focus-visible:outline-2 focus-visible:outline-focus"
              type="button"
              aria-label="Limpar busca"
              @click="clearSearch"
            >
              <Icon class="h-4 w-4" :icon="xIcon" aria-hidden="true" />
            </button>
          </span>
        </label>
        <button
          class="inline-flex h-11 items-center justify-center rounded-xl bg-brand-primary px-5 text-sm font-bold text-on-primary shadow-lg shadow-brand-primary/20 transition hover:bg-brand-primary-hover focus-visible:outline focus-visible:outline-2 focus-visible:outline-focus"
          data-testid="table-search-submit"
          type="submit"
        >
          Filtrar
        </button>
      </form>

      <div v-if="filters.length > 0" class="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
        <label v-for="filter in filters" :key="filter.value" class="block min-w-44">
          <span class="mb-1.5 block text-xs font-bold text-content-muted">{{ filter.label }}</span>
          <span class="relative block">
            <select
              class="h-11 w-full appearance-none rounded-xl border border-outline bg-surface pl-3.5 pr-9 text-sm text-content outline-none transition focus:border-focus focus:ring-2 focus:ring-focus/20"
              :data-testid="`table-filter-${filter.value}`"
              :value="filterValues[filter.value] ?? ''"
              @change="updateFilter(filter.value, $event)"
            >
              <option value="">{{ filter.placeholder ?? `Todos: ${filter.label}` }}</option>
              <option v-for="option in filter.options" :key="option.value" :value="option.value">
                {{ option.label }}
              </option>
            </select>
            <Icon
              class="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-content-muted"
              :icon="chevronDownIcon"
              aria-hidden="true"
            />
          </span>
        </label>
      </div>
    </div>

    <div
      class="overflow-auto focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-focus"
      data-testid="table-scroll-area"
      tabindex="0"
      :aria-label="`Conteúdo da tabela ${name}`"
      :aria-busy="loading"
      :style="{
        minHeight: cssSize(bodyMinHeight),
        maxHeight: cssSize(bodyMaxHeight),
      }"
    >
      <table class="w-full min-w-[720px] border-collapse text-left" :aria-labelledby="titleId">
        <colgroup>
          <col
            v-for="column in displayColumns"
            :key="column.value"
            :style="{ width: cssSize(column.size) }"
          />
        </colgroup>
        <thead class="sticky top-0 z-10 bg-surface-subtle">
          <tr>
            <th
              v-for="column in displayColumns"
              :key="column.value"
              class="border-b border-outline px-5 py-3 text-xs font-bold uppercase tracking-[0.1em] text-content-muted first:pl-6 last:pr-6"
              scope="col"
            >
              {{ column.name }}
            </th>
          </tr>
        </thead>
        <tbody class="divide-y divide-outline">
          <template v-if="loading">
            <tr v-for="row in 4" :key="`loading-${row}`" aria-hidden="true">
              <td
                v-for="column in displayColumns"
                :key="column.value"
                class="px-5 py-4 first:pl-6 last:pr-6"
              >
                <span class="block h-4 animate-pulse rounded bg-surface-subtle"></span>
              </td>
            </tr>
          </template>
          <tr v-else-if="error">
            <td :colspan="displayColumns.length" class="px-6 py-12 text-center">
              <p class="font-semibold text-content">Não foi possível carregar os registros.</p>
              <p class="mt-2 text-sm text-content-muted" role="alert">{{ error }}</p>
              <AppButton class="mt-5" variant="secondary" @click="$emit('retry')">
                Tentar novamente
              </AppButton>
            </td>
          </tr>
          <tr v-else-if="records.length === 0">
            <td
              :colspan="displayColumns.length"
              class="px-6 py-12 text-center text-sm text-content-muted"
            >
              {{ emptyMessage }}
            </td>
          </tr>
          <template v-else>
            <tr
              v-for="(record, rowIndex) in records"
              :key="rowIdentifier(record, rowIndex)"
              class="transition-colors hover:bg-surface-subtle/70"
            >
              <td
                v-for="column in displayColumns"
                :key="column.value"
                class="px-5 py-4 text-sm text-content first:pl-6 last:pr-6"
              >
                <slot
                  :name="`cell-${column.value}`"
                  :column="column"
                  :record="record"
                  :value="resolveValue(record, column.value)"
                >
                  {{ displayValue(resolveValue(record, column.value)) }}
                </slot>
              </td>
            </tr>
          </template>
        </tbody>
      </table>
    </div>

    <footer
      v-if="pagination && !loading && !error"
      class="flex flex-col gap-4 border-t border-outline px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6"
    >
      <div class="flex flex-wrap items-center gap-x-5 gap-y-3 text-sm text-content-muted">
        <label class="flex items-center gap-2">
          <span>Exibir</span>
          <span class="relative">
            <select
              class="h-9 appearance-none rounded-lg border border-outline bg-surface py-1 pl-3 pr-8 text-sm font-semibold text-content outline-none focus:border-focus focus:ring-2 focus:ring-focus/20"
              data-testid="table-page-size"
              :value="pageSize"
              @change="updatePageSize"
            >
              <option v-for="option in pageSizeOptions" :key="option" :value="option">
                {{ option }}
              </option>
            </select>
            <Icon
              class="pointer-events-none absolute right-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2"
              :icon="chevronDownIcon"
              aria-hidden="true"
            />
          </span>
          <span>por página</span>
        </label>
      </div>

      <nav class="flex items-center gap-1" aria-label="Paginação da tabela">
        <button
          class="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-outline text-content-muted transition hover:bg-surface-subtle hover:text-content focus-visible:outline focus-visible:outline-2 focus-visible:outline-focus disabled:cursor-not-allowed disabled:opacity-40"
          data-testid="table-page-previous"
          type="button"
          aria-label="Página anterior"
          :disabled="page <= 1"
          @click="emit('update:page', page - 1)"
        >
          <Icon class="h-4 w-4" :icon="chevronLeftIcon" aria-hidden="true" />
        </button>

        <template v-for="pageItem in visiblePages" :key="pageItem">
          <span
            v-if="typeof pageItem === 'string'"
            class="inline-flex h-9 w-7 items-center justify-center text-content-muted"
            aria-hidden="true"
          >
            …
          </span>
          <button
            v-else
            class="inline-flex h-9 min-w-9 items-center justify-center rounded-lg px-2 text-sm font-bold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-focus"
            :class="
              pageItem === page
                ? 'bg-brand-primary text-on-primary'
                : 'border border-outline text-content-muted hover:bg-surface-subtle hover:text-content'
            "
            :data-testid="`table-page-${pageItem}`"
            type="button"
            :aria-current="pageItem === page ? 'page' : undefined"
            :aria-label="`Ir para a página ${pageItem}`"
            @click="emit('update:page', pageItem)"
          >
            {{ pageItem }}
          </button>
        </template>

        <button
          class="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-outline text-content-muted transition hover:bg-surface-subtle hover:text-content focus-visible:outline focus-visible:outline-2 focus-visible:outline-focus disabled:cursor-not-allowed disabled:opacity-40"
          data-testid="table-page-next"
          type="button"
          aria-label="Próxima página"
          :disabled="page >= totalPages"
          @click="emit('update:page', page + 1)"
        >
          <Icon class="h-4 w-4" :icon="chevronRightIcon" aria-hidden="true" />
        </button>
      </nav>
    </footer>
  </section>
</template>
