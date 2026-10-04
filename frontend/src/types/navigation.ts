export type NavigationItem = {
  children: NavigationItem[]
  code: string
  iconKey: string | null
  id: number
  label: string
  routeName: string | null
}

export type NavigationResponse = {
  items: NavigationItem[]
  permissions: string[]
}
