import { createApp } from 'vue'

import App from './App.vue'
import { initializeTheme } from './composables/useTheme'
import router from './router'
import { pinia } from './stores'
import './assets/main.css'

initializeTheme()

const app = createApp(App)

app.use(pinia)
app.use(router)

app.mount('#app')
