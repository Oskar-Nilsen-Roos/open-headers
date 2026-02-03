import { ref } from 'vue'
import type { LanguagePreference } from '@/types'
import enMessages from '../../public/_locales/en/messages.json'
import svMessages from '../../public/_locales/sv/messages.json'

type MessageEntry = { message: string }
type MessageMap = Record<string, MessageEntry>
type Params = Record<string, string | number>

const messagesByLocale: Record<'en' | 'sv', MessageMap> = {
  en: enMessages as MessageMap,
  sv: svMessages as MessageMap,
}

const languagePreference = ref<LanguagePreference>('auto')

function interpolate(template: string, params?: Params): string {
  if (!params) return template
  return template.replace(/\{\{(\w+)\}\}/g, (_, key: string) => {
    const value = params[key]
    return value !== undefined ? String(value) : `{{${key}}}`
  })
}

export function t(key: string, params?: Params): string {
  const chromeApi = typeof chrome !== 'undefined' ? chrome : undefined
  let message = ''

  if (languagePreference.value !== 'auto') {
    message = messagesByLocale[languagePreference.value]?.[key]?.message ?? ''
  } else if (chromeApi?.i18n?.getMessage) {
    message = chromeApi.i18n.getMessage(key)
  }

  if (!message) {
    message = messagesByLocale.en[key]?.message ?? key
  }

  return interpolate(message, params)
}

function normalizeLocale(locale: string): 'en' | 'sv' {
  return locale.toLowerCase().startsWith('sv') ? 'sv' : 'en'
}

export function getMessageForPreference(
  preference: LanguagePreference,
  key: string,
  params?: Params
): string {
  const chromeApi = typeof chrome !== 'undefined' ? chrome : undefined
  const locale = preference === 'auto'
    ? normalizeLocale(chromeApi?.i18n?.getUILanguage?.() ?? 'en')
    : preference
  const message = messagesByLocale[locale]?.[key]?.message ?? messagesByLocale.en[key]?.message ?? key
  return interpolate(message, params)
}

export function getUiLanguage(): string {
  if (languagePreference.value !== 'auto') {
    return languagePreference.value
  }
  const chromeApi = typeof chrome !== 'undefined' ? chrome : undefined
  return chromeApi?.i18n?.getUILanguage?.() ?? 'en'
}

export function setLanguagePreference(preference: LanguagePreference): void {
  languagePreference.value = preference
  if (typeof document !== 'undefined') {
    document.documentElement.lang = getUiLanguage().split('-')[0] || 'en'
    document.title = t('app_name')
  }
}
