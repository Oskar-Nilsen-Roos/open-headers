import { createApp } from 'vue'
import { createPinia } from 'pinia'
import './style.css'
import App from './App.vue'
import { getUiLanguage, t } from './i18n'
import { vDelayAutoAnimate } from './directives/delayAutoAnimate'

const pinia = createPinia()
const app = createApp(App)

document.documentElement.lang = getUiLanguage().split('-')[0] || 'en'
document.title = t('app_name')

app.use(pinia)
app.directive('delay-auto-animate', vDelayAutoAnimate)
app.mount('#app')
