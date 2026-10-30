import { reactive } from 'vue'
import { i18n, t, translateText } from '../i18n'

export const API_URL = 'https://app.niceclouds.si'

export const session = reactive({ user: null, ready: false, error: '' })
let restoring

// Backend actions are split across the /servis* controllers; unlisted actions are served by /servis.
const controllers = {
  servis_accounts: 'me login register requestaccess confirmorder access sendaccess revokeaccess accountmigration linkcustomer reset resend activate logout customers customerdeletion deletecustomer savecustomer',
  servis_partners: 'agencies saveagency deleteagency discounts savediscount deletediscount payments savepayment deletepayment commissions',
  servis_inspections: 'inspection inspectionimport saveinspection deleteinspection inspectionartwork inspectionpdf',
  servis_payments: 'cebelcainvoice paymentinfo paymentstatus sendcompletion stripe paypal'
}
const controllerOf = Object.fromEntries(
  Object.entries(controllers).flatMap(([controller, actions]) => actions.split(' ').map(action => [action, controller]))
)
export const endpoint = action => `${API_URL}/${controllerOf[action.split('/')[0]] || 'servis'}/${action}/`

export async function api(action, data) {
  const response = await fetch(endpoint(action), {
    method: data === undefined ? 'GET' : 'POST',
    credentials: 'include',
    headers: data === undefined ? {} : { 'Content-Type': 'application/json' },
    body: data === undefined ? undefined : JSON.stringify(data),
    signal: AbortSignal.timeout(20000)
  }).catch(() => {
    throw new Error(t('errors.connection'))
  })
  const result = await response.json().catch(() => null)
  if (!response.ok || result?.error || result === null) {
    if (response.status === 401) session.user = null
    const message = result?.error
    throw new Error(
      message
        ? /^(Preverite polje:|Neveljavna izbira:|Neveljaven znesek:)/.test(message)
          ? t('errors.checkDetails')
          : translateText(message)
        : t('errors.connection')
    )
  }
  return result
}

export function restore(force = false) {
  if (force) {
    restoring = null
    session.ready = false
  }
  if (session.ready) return Promise.resolve()
  if (!restoring)
    restoring = api('me')
      .then(r => {
        session.user = r.user
        session.error = ''
      })
      .catch(e => {
        session.error = e.message === t('errors.loginRequired') ? '' : e.message
      })
      .finally(() => {
        session.ready = true
      })
  return restoring
}

export async function login(mail, pass) {
  const r = await api('login', { mail, pass })
  session.user = r.user
  session.error = ''
  session.ready = true
}

export const money = value =>
  new Intl.NumberFormat(i18n.global.locale.value === 'en' ? 'en-GB' : 'sl-SI', {
    style: 'currency',
    currency: 'EUR'
  }).format(Number(value || 0))
export const date = value =>
  value
    ? new Intl.DateTimeFormat(i18n.global.locale.value === 'en' ? 'en-GB' : 'sl-SI').format(
        new Date(value.slice(0, 10) + 'T12:00:00')
      )
    : '—'
export const orderNumber = id => `S-${String(id).padStart(4, '0')}`
export function inspectionState(validUntil) {
  if (!validUntil) return { label: 'common.dash', color: 'grey-2', text: 'grey-7' }
  const remaining = (new Date(validUntil + 'T23:59:59') - new Date()) / 86400000
  if (remaining < 0) return { label: 'equipment.expired', color: 'red-1', text: 'negative' }
  if (remaining <= 30) return { label: 'equipment.expiring', color: 'orange-1', text: 'orange-9' }
  return { label: 'equipment.valid', color: 'teal-1', text: 'primary' }
}
export const statuses = [
  { value: 'submitted', label: 'statuses.submitted', color: 'orange-9', bg: 'orange-1' },
  { value: 'in_service', label: 'statuses.inService', color: 'blue-8', bg: 'blue-1' },
  { value: 'completed', label: 'statuses.completed', color: 'teal-8', bg: 'teal-1' },
  { value: 'cancelled', label: 'statuses.cancelled', color: 'red-8', bg: 'red-1' }
]
export const equipmentTypes = ['Jadralno padalo', 'Reševalno padalo', 'Letalni sedež', 'Drugo']
export const deliveries = [
  { value: 'personal', label: 'delivery.personal' },
  {
    value: 'post',
    label: 'delivery.post'
  },
  {
    value: 'gls',
    label: 'delivery.gls'
  },
  { value: 'other', label: 'delivery.other' }
]
export const paymentMethods = [
  { value: 'pickup', label: 'payment.pickup' },
  { value: 'bank', label: 'payment.bank' },
  { value: 'card', label: 'payment.card' },
  { value: 'paypal', label: 'payment.paypal' }
]
