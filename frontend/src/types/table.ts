export type AppTableColumn = {
  name: string
  size?: number | string
  value: string
}

export type AppTableFilterOption = {
  label: string
  value: string
}

export type AppTableFilter = {
  label: string
  options: AppTableFilterOption[]
  placeholder?: string
  value: string
}

export type AppTableRecord = object
