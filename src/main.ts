import { createApp } from 'vue'

import App from './App.vue'
import './app.css'
import { registerHmrCanvasRecovery } from './features/editor/hmrRecovery'
import { applyStoredThemeMode, resolveThemeStorage } from './lib/theme'

applyStoredThemeMode(typeof document === 'undefined' ? null : document.documentElement, resolveThemeStorage())
registerHmrCanvasRecovery(import.meta.hot, window.location)

createApp(App).mount('#app')
