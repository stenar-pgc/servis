import { t } from '../i18n'

export function confirmDeletion(q, { title, message, action, onDeleted, onError, busy }) {
  q.dialog({
    title,
    message,
    cancel: { label: t('common.cancel'), flat: true },
    ok: { label: t('common.delete'), color: 'negative' }
  }).onOk(async () => {
    if (busy) busy.value = true
    try {
      await action()
      await onDeleted?.()
      q.notify({ type: 'positive', message: t('common.deleted') })
    } catch (e) {
      onError?.(e.message)
      q.notify({ type: 'negative', message: e.message })
    } finally {
      if (busy) busy.value = false
    }
  })
}
