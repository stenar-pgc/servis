import { createI18n } from 'vue-i18n'
import en from './en'
import sl from './sl'

let language = 'sl'
try {
  language = localStorage.getItem('stenar-language') === 'en' ? 'en' : 'sl'
} catch {}

export const i18n = createI18n({
  legacy: false,
  locale: language,
  fallbackLocale: 'sl',
  missingWarn: false,
  fallbackWarn: false,
  messages: { sl, en }
})
export const t = (key, ...args) => i18n.global.t(key, ...args)

// The shared API returns Slovenian error messages, equipment types and service labels.
const sourceMessages = Object.entries(sl).flatMap(([section, messages]) =>
  Object.entries(messages).map(([key, value]) => [`${section}.${key}`, value])
)
export function translateText(text) {
  const message = sourceMessages.find(([, value]) => value === text)
  return message ? t(message[0]) : text
}
