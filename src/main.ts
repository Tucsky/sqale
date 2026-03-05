import { createApp } from 'vue'

import App from './App.vue'
import './app.css'
import { applyStoredThemeMode, resolveThemeStorage } from './lib/theme'

applyStoredThemeMode(typeof document === 'undefined' ? null : document.documentElement, resolveThemeStorage())

createApp(App).mount('#app')
