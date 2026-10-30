<template>
  <q-page class="page payment-page">
    <q-inner-loading :showing="loading" />
    <ErrorBanner :message="error" :retry="!!token" @retry="load" />
    <template v-if="info">
      <div class="page-heading">
        <div>
          <h1>{{ $t('pay.title') }} <span class="text-grey-5">{{ info.order_number }}</span></h1>
          <p>{{ info.customer_name }}</p>
        </div>
      </div>
      <q-banner v-if="notice" rounded :class="['q-mb-lg', notice.class]" role="status">
        <template #avatar><q-icon :name="notice.icon" /></template>
        {{ $t(notice.text) }}
        <template v-if="notice.refresh" #action>
          <q-btn flat no-caps :label="$t('common.refresh')" @click="load" />
        </template>
      </q-banner>
      <q-card flat bordered class="section-card">
        <div v-for="item in info.items" :key="item.label" class="row no-wrap justify-between q-mb-sm">
          <span class="text-grey-7 q-pr-md">{{ translateText(item.label) }}<template v-if="item.quantity !== 1"> × {{ item.quantity }}</template></span>
        </div>
        <p v-if="info.description" class="text-grey-7">{{ info.description }}</p>
        <q-separator class="q-my-md" />
        <div v-if="info.received > 0" class="row justify-between q-mb-sm">
          <span class="text-grey-7">{{ $t('pay.received') }}</span>
          <span>{{ money(info.received) }}</span>
        </div>
        <div class="row items-end justify-between">
          <strong class="text-subtitle1">{{ $t('pay.due') }}</strong>
          <span class="text-h4 text-weight-medium">{{ money(info.outstanding) }}</span>
        </div>
      </q-card>
      <q-card v-if="!info.payable" flat bordered class="section-card text-center">
        <q-icon :name="info.status === 'cancelled' ? 'block' : 'task_alt'" size="44px" :color="info.status === 'cancelled' ? 'grey-6' : 'primary'" />
        <h2 class="q-mt-sm">{{ $t(info.status === 'cancelled' ? 'pay.cancelledOrder' : 'pay.paid') }}</h2>
      </q-card>
      <template v-else>
        <h2 class="q-mb-md">{{ $t('pay.methods') }}</h2>
        <p v-if="info.payment_method === 'pickup'" class="text-grey-7">{{ $t('pay.pickupChosen') }}</p>
        <div class="payment-options">
          <q-card v-for="option in options" :key="option" flat bordered :class="['section-card payment-option', { preferred: option === info.payment_method }]">
            <div class="row items-center no-wrap q-mb-md">
              <q-icon :name="icons[option]" size="26px" color="primary" class="q-mr-sm" />
              <h2 class="col">{{ $t('payment.' + option) }}</h2>
              <q-badge v-if="option === info.payment_method" color="light-blue-1" text-color="primary">{{ $t('pay.chosen') }}</q-badge>
            </div>
            <template v-if="option === 'card'">
              <p class="text-grey-7">{{ $t('pay.cardHint') }}</p>
              <q-btn unelevated no-caps color="primary" icon="credit_card" :label="$t('pay.payAmount', { amount: money(info.outstanding) })" :href="endpoint('stripe/' + token)" class="full-width pay-button" />
            </template>
            <template v-else-if="option === 'paypal'">
              <p class="text-grey-7">{{ $t('pay.paypalHint') }}</p>
              <q-btn unelevated no-caps :label="$t('pay.payPaypal')" :href="endpoint('paypal/' + token)" class="full-width pay-button paypal-button" />
            </template>
            <template v-else>
              <dl class="bank-details">
                <dt>{{ $t('pay.recipient') }}</dt><dd>{{ info.bank.recipient }}, {{ info.bank.address }}</dd>
                <dt>IBAN</dt>
                <dd class="row items-center no-wrap">
                  <strong class="col">{{ info.bank.iban }}</strong>
                  <q-btn flat round dense size="sm" icon="content_copy" :aria-label="$t('common.copy')" @click="copy(info.bank.iban)"><q-tooltip>{{ $t('common.copy') }}</q-tooltip></q-btn>
                </dd>
                <dt>{{ $t('pay.reference') }}</dt>
                <dd class="row items-center no-wrap">
                  <span class="col">{{ info.bank.reference }}</span>
                  <q-btn flat round dense size="sm" icon="content_copy" :aria-label="$t('common.copy')" @click="copy(info.bank.reference)"><q-tooltip>{{ $t('common.copy') }}</q-tooltip></q-btn>
                </dd>
                <dt>{{ $t('pay.purpose') }}</dt><dd>{{ info.bank.purpose }}</dd>
                <dt>{{ $t('pay.amount') }}</dt><dd>{{ money(info.bank.amount) }}</dd>
              </dl>
              <div v-if="info.upn_qr" class="text-center q-mt-md">
                <img :src="info.upn_qr" width="180" height="180" alt="UPN QR" class="upn-qr" />
                <div class="text-caption text-grey-7">{{ $t('pay.scan') }}</div>
              </div>
            </template>
          </q-card>
        </div>
      </template>
    </template>
  </q-page>
</template>
<script setup>
  import { computed, onMounted, ref } from 'vue'
  import { useRoute } from 'vue-router'
  import { useQuasar } from 'quasar'
  import { api, endpoint, money } from '../services/api'
  import { i18n, languageChosen, t, translateText } from '../i18n'
  import ErrorBanner from '../components/ErrorBanner.vue'

  const route = useRoute(),
    q = useQuasar()
  const token = /^[a-f0-9]{32}$/.test(route.params.token || '') ? route.params.token : ''
  const info = ref(null),
    loading = ref(false),
    error = ref('')
  const icons = { card: 'credit_card', paypal: 'account_balance_wallet', bank: 'account_balance' }
  // All available methods, the customer's chosen one first.
  const options = computed(() => {
    const available = ['card', 'paypal', 'bank'].filter(option => option === 'bank' || info.value.providers[option])
    return available.sort((a, b) => (b === info.value.payment_method) - (a === info.value.payment_method))
  })
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
  .payment-page { max-width: 760px; }
  .payment-options { display: grid; gap: 16px; }
  .payment-option.preferred { border-color: #039acc; box-shadow: 0 0 0 1px #039acc; }
  .pay-button { min-height: 46px; border-radius: 23px; font-size: 16px; font-weight: 600; }
  .paypal-button { background: #ffc439; color: #003087; }
  .bank-details { display: grid; grid-template-columns: max-content minmax(0, 1fr); gap: 6px 16px; margin: 0; }
  .bank-details dt { color: #627d88; }
  .bank-details dd { margin: 0; overflow-wrap: anywhere; }
  .upn-qr { width: 180px; height: 180px; image-rendering: pixelated; }
  @media (max-width: 599px) {
    .bank-details { grid-template-columns: 1fr; gap: 2px; }
    .bank-details dd { margin-bottom: 8px; }
  }
</style>
