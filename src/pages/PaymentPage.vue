<template>
  <q-page class="page payment-page">
    <q-inner-loading :showing="loading" />
    <ErrorBanner :message="error" :retry="!!token" @retry="load" />
    <template v-if="info">
      <div class="page-heading">
        <div>
          <h1>{{ $t('pay.title') }} <span class="text-grey-5">{{ info.order_number }}</span></h1>
        </div>
        <q-btn outline no-caps color="primary" icon="picture_as_pdf" :label="$t('pay.downloadPdf')" :href="endpoint('paymentpdf/' + token)" target="_blank" />
      </div>
      <q-banner v-if="notice" rounded :class="['q-mb-lg', notice.class]" role="status">
        <template #avatar><q-icon :name="notice.icon" /></template>
        {{ $t(notice.text) }}
        <template v-if="notice.refresh" #action>
          <q-btn flat no-caps :label="$t('common.refresh')" @click="load" />
        </template>
      </q-banner>
      <q-card flat bordered class="section-card">
        <div class="notice-head">
          <div>
            <div class="section-label">{{ $t('pay.payer') }}</div>
            <div v-for="line in info.payer" :key="line">{{ line }}</div>
          </div>
          <dl class="notice-dates">
            <dt>{{ $t('pay.issued') }}</dt><dd>{{ date(info.issued_at) }}</dd>
            <dt>{{ $t('pay.dueDate') }}</dt><dd>{{ date(info.due_at) }}</dd>
          </dl>
        </div>
        <div class="table-scroll q-mt-lg">
          <q-markup-table flat dense separator="horizontal" class="notice-table">
            <thead>
              <tr>
                <th class="text-left">{{ $t('pay.no') }}</th>
                <th class="text-left">{{ $t('pay.service') }}</th>
                <th class="text-right">{{ $t('pay.quantity') }}</th>
                <th class="text-right">{{ $t('pay.unitPrice') }}</th>
                <th class="text-right">{{ $t('pay.discount') }}</th>
                <th class="text-right">{{ $t('pay.vat') }}</th>
                <th class="text-right">{{ $t('pay.netAmount') }}</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(line, index) in info.lines" :key="index">
                <td>{{ index + 1 }}</td>
                <td class="service-cell">{{ translateText(line.label) }}</td>
                <td class="text-right">{{ number(line.quantity) }} {{ line.unit }}</td>
                <td class="text-right">{{ money(line.unit_net) }}</td>
                <td class="text-right">{{ number(line.discount) }} %</td>
                <td class="text-right">{{ line.vat }} %</td>
                <td class="text-right">{{ money(line.net) }}</td>
              </tr>
              <tr v-if="!info.lines.length"><td colspan="7">{{ info.description }}</td></tr>
            </tbody>
          </q-markup-table>
        </div>
        <dl class="notice-totals">
          <dt>{{ $t('pay.netBeforeDiscount') }}</dt><dd>{{ money(info.totals.net_before_discount) }}</dd>
          <template v-if="info.totals.discount > 0"><dt>{{ $t('pay.discountTotal') }}</dt><dd>−{{ money(info.totals.discount) }}</dd></template>
          <dt>{{ $t('pay.net') }}</dt><dd>{{ money(info.totals.net) }}</dd>
          <dt>{{ $t('pay.vatTotal', { rate: info.totals.vat_rate }) }}</dt><dd>{{ money(info.totals.vat) }}</dd>
          <dt>{{ $t('pay.gross') }}</dt><dd>{{ money(info.totals.gross) }}</dd>
          <template v-if="info.totals.received > 0"><dt>{{ $t('pay.received') }}</dt><dd>−{{ money(info.totals.received) }}</dd></template>
          <dt class="due">{{ $t('pay.due') }}</dt><dd class="due">{{ money(info.totals.due) }}</dd>
        </dl>
      </q-card>
      <q-card v-if="!info.payable" flat bordered class="section-card text-center">
        <q-icon :name="info.status === 'cancelled' ? 'block' : 'task_alt'" size="44px" :color="info.status === 'cancelled' ? 'grey-6' : 'primary'" />
        <h2 class="q-mt-sm">{{ $t(info.status === 'cancelled' ? 'pay.cancelledOrder' : 'pay.paid') }}</h2>
      </q-card>
      <template v-else>
        <h2 class="q-mb-md">{{ $t('pay.chooseMethod') }}</h2>
        <q-card v-for="(option, index) in options" :key="option" flat bordered class="section-card payment-option" :class="{ preferred: option === info.payment_method }">
          <div class="row items-center no-wrap q-mb-md">
            <q-icon :name="icons[option]" size="26px" color="primary" class="q-mr-sm" />
            <h2 class="col">{{ index + 1 }}. {{ $t('pay.' + option + 'Title') }}</h2>
            <q-badge v-if="option === info.payment_method" color="light-blue-1" text-color="primary">{{ $t('pay.chosen') }}</q-badge>
          </div>
          <div v-if="option === 'bank'" class="bank-option">
            <figure v-if="info.upn_qr" class="upn-figure">
              <img :src="info.upn_qr" width="180" height="180" alt="UPN QR" class="upn-qr" />
              <figcaption>{{ $t('pay.qrCaption') }}</figcaption>
            </figure>
            <div class="bank-text">
              <p>{{ $t('pay.bankIntro') }}</p>
              <dl class="bank-details">
                <dt>{{ $t('pay.amount') }}</dt><dd><strong>{{ money(info.bank.amount) }}</strong></dd>
                <dt>{{ $t('pay.recipient') }}</dt><dd><strong>{{ info.bank.recipient }}</strong></dd>
                <dt>{{ $t('pay.address') }}</dt><dd>{{ info.bank.address }}</dd>
                <dt>IBAN</dt>
                <dd class="row items-center no-wrap">
                  <strong>{{ info.bank.iban }}</strong>
                  <q-btn flat round dense size="sm" icon="content_copy" class="q-ml-xs" :aria-label="$t('common.copy')" @click="copy(info.bank.iban)"><q-tooltip>{{ $t('common.copy') }}</q-tooltip></q-btn>
                </dd>
                <dt>{{ $t('pay.reference') }}</dt>
                <dd class="row items-center no-wrap">
                  <strong>{{ info.bank.reference }}</strong>
                  <q-btn flat round dense size="sm" icon="content_copy" class="q-ml-xs" :aria-label="$t('common.copy')" @click="copy(info.bank.reference)"><q-tooltip>{{ $t('common.copy') }}</q-tooltip></q-btn>
                </dd>
                <dt>{{ $t('pay.purpose') }}</dt><dd>{{ info.bank.purpose }}</dd>
                <dt>{{ $t('pay.purposeCode') }}</dt><dd><strong>{{ info.bank.purpose_code }}</strong></dd>
              </dl>
              <p class="text-grey-7 q-mt-md q-mb-none">{{ $t('pay.bankNote') }}</p>
            </div>
          </div>
          <template v-else>
            <p>{{ $t('pay.' + option + 'Intro') }}</p>
            <q-banner dense rounded class="option-info q-mb-md">
              <template #avatar><q-icon name="info" color="primary" size="18px" /></template>
              {{ $t('pay.' + option + 'Info') }}
            </q-banner>
            <q-btn
              v-if="option === 'card'"
              unelevated
              no-caps
              color="primary"
              icon="credit_card"
              :label="$t('pay.payCard', { amount: money(info.outstanding) })"
              :href="endpoint('stripe/' + token)"
              class="pay-button" />
            <q-btn v-else unelevated no-caps :label="$t('pay.payPaypal')" :href="endpoint('paypal/' + token)" class="pay-button paypal-button" />
          </template>
        </q-card>
      </template>
      <p class="text-caption text-grey-6">{{ $t('pay.notInvoice') }}</p>
    </template>
  </q-page>
</template>
<script setup>
  import { computed, onMounted, ref } from 'vue'
  import { useRoute } from 'vue-router'
  import { useQuasar } from 'quasar'
  import { api, date, endpoint, money } from '../services/api'
  import { i18n, languageChosen, t, translateText } from '../i18n'
  import ErrorBanner from '../components/ErrorBanner.vue'

  const route = useRoute(),
    q = useQuasar()
  const token = /^[a-f0-9]{32}$/.test(route.params.token || '') ? route.params.token : ''
  const info = ref(null),
    loading = ref(false),
    error = ref('')
  // Bank transfer, card and PayPal in a fixed order; the customer's choice is marked.
  const icons = { bank: 'account_balance', card: 'credit_card', paypal: 'account_balance_wallet' }
  const options = computed(() => ['bank', 'card', 'paypal'].filter(option => option === 'bank' || info.value.providers[option]))
  const number = value =>
    new Intl.NumberFormat(i18n.global.locale.value === 'en' ? 'en-GB' : 'sl-SI', { minimumFractionDigits: 2, maximumFractionDigits: 3 }).format(Number(value || 0))
  const notice = computed(() => {
    const status = route.query.status
    if (!info.value || !status) return null
    if (status === 'success')
      return info.value.payable
        ? { text: 'pay.confirming', icon: 'hourglass_top', class: 'bg-orange-1 text-orange-9', refresh: true }
        : { text: 'pay.success', icon: 'task_alt', class: 'bg-teal-1 text-primary' }
    if (status === 'cancelled') return { text: 'pay.cancelled', icon: 'info', class: 'bg-grey-2 text-grey-8' }
    if (status === 'error') return { text: 'pay.error', icon: 'error_outline', class: 'bg-red-1 text-red-9' }
    return null
  })
  async function copy(value) {
    try {
      await navigator.clipboard.writeText(value.replace(/\s/g, ''))
      q.notify({ type: 'positive', message: t('pay.copied') })
    } catch {}
  }
  async function load() {
    if (!token) {
      error.value = t('pay.invalidLink')
      return
    }
    loading.value = true
    error.value = ''
    try {
      // Returning from Stripe Checkout: confirm the session right away instead of waiting for the webhook.
      info.value = route.query.session_id
        ? await api('paymentstatus', { token, session_id: route.query.session_id })
        : await api('paymentinfo', { token })
      if (!languageChosen && info.value.language) i18n.global.locale.value = info.value.language
    } catch (e) {
      error.value = e.message
    } finally {
      loading.value = false
    }
  }
  onMounted(load)
</script>
<style scoped>
  .payment-page { max-width: 880px; }
  .section-label { font-weight: 600; margin-bottom: 6px; }
  .notice-head { display: flex; justify-content: space-between; gap: 24px; flex-wrap: wrap; }
  .notice-dates { display: grid; grid-template-columns: auto auto; gap: 4px 16px; margin: 0; align-content: start; }
  .notice-dates dt { color: #627d88; text-align: right; }
  .notice-dates dd { margin: 0; }
  .table-scroll { overflow-x: auto; }
  .notice-table { background: transparent; min-width: 560px; }
  .notice-table thead th { white-space: nowrap; }
  .notice-table td { white-space: nowrap; }
  .notice-table .service-cell { white-space: normal; min-width: 180px; }
  .notice-totals { display: grid; grid-template-columns: auto max-content; gap: 6px 24px; margin: 20px 0 0 auto; width: fit-content; text-align: right; }
  .notice-totals dt { font-weight: 600; }
  .notice-totals dd { margin: 0; }
  .notice-totals .due { padding-top: 8px; border-top: 1px solid #d7e8ed; font-size: 18px; font-weight: 700; }
  .payment-option.preferred { border-color: #039acc; box-shadow: 0 0 0 1px #039acc; }
  .bank-option { display: flex; gap: 28px; align-items: flex-start; }
  .upn-figure { margin: 0; text-align: center; flex: none; }
  .upn-figure figcaption { font-size: 12px; color: #627d88; border-top: 1px solid #d7e8ed; padding-top: 2px; }
  .upn-qr { width: 180px; height: 180px; image-rendering: pixelated; display: block; }
  .bank-text { flex: 1; min-width: 0; }
  .bank-details { display: grid; grid-template-columns: max-content minmax(0, 1fr); gap: 4px 16px; margin: 0; }
  .bank-details dt { color: #627d88; }
  .bank-details dd { margin: 0; overflow-wrap: anywhere; }
  .option-info { background: #e8f6fb; color: #0b5a73; }
  .pay-button { width: 100%; max-width: 340px; min-height: 46px; border-radius: 23px; font-size: 16px; font-weight: 600; }
  .paypal-button { background: #ffc439; color: #003087; }
  @media (max-width: 599px) {
    .bank-option { flex-direction: column; align-items: center; }
    .bank-details { grid-template-columns: 1fr; gap: 0; }
    .bank-details dd { margin-bottom: 8px; }
    .pay-button { max-width: none; }
  }
</style>
