import { createI18n } from 'vue-i18n'
import en from './en'
import sl from './sl'

let language = 'sl'
// Whether the visitor chose a language before; pages may otherwise follow the customer's language.
export let languageChosen = false
try {
  languageChosen = !!localStorage.getItem('stenar-language')
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
const legacyMessages = {
  'E-pošta že ima račun. Prijavite se ali ponastavite geslo.': 'errors.accountExists',
  'E-pošta že ima račun. Povežite zapisa.': 'errors.existingAccountLink',
  'Najprej pripravite ali povežite račun stranke.': 'errors.prepareFirst',
  'Izberite stranko brez računa in obstoječ račun.': 'errors.chooseLinkRecords',
  'Svojega prijavljenega računa ni mogoče izbrisati.': 'errors.deleteSelf',
}
export function translateText(text) {
  if (legacyMessages[text]) return t(legacyMessages[text])
  const message = sourceMessages.find(([, value]) => value === text)
  return message ? t(message[0]) : text
}
