/// <reference types="vite/client" />

import 'vue-router'

declare module 'vue-router' {
  interface RouteMeta {
    guestOnly?: boolean
    hideShell?: boolean
    requiredPermission?: string
    requiresAuth?: boolean
    title?: string
  }
}

export {}
