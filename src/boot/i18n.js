import { defineBoot } from '#q-app'
import { watch } from 'vue'
import { Quasar } from 'quasar'
import sl from 'quasar/lang/sl'
import en from 'quasar/lang/en-US'
import { i18n } from '../i18n'

export default defineBoot(({ app }) => {
  app.use(i18n)
  watch(
    i18n.global.locale,
    value => {
      document.documentElement.lang = value
      document.title = value === 'en' ? 'Stenar · Service' : 'Stenar · Servis'
      Quasar.lang.set(value === 'en' ? en : sl)
      try {
        localStorage.setItem('stenar-language', value)
      } catch {}
    },
    { immediate: true }
  )
})
