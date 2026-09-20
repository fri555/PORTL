import { createApp } from 'vue'
import { createPinia } from 'pinia'
import ElementPlus from 'element-plus'
import 'element-plus/dist/index.css'
import App from './App.vue'
import router from './router'
import { useAppStore } from './stores/app'
import './assets/styles/globals.css'

const app = createApp(App)
const pinia = createPinia()
app.use(pinia)
app.use(router)
app.use(ElementPlus)

// Auto-login in dev mode
const store = useAppStore()
if (!store.user) {
  store.login()
}

app.mount('#app')
