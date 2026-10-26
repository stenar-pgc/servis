<template>
  <q-page class="page">
    <div class="page-heading">
      <div>

        <h1>{{ $t('profile.title') }}</h1>
        <p>{{ $t('profile.subtitle') }}</p>
      </div>
    </div>
    <q-card flat bordered class="section-card">
      <div class="row items-center q-gutter-md">
        <q-avatar size="52px" color="teal-1" text-color="primary" icon="person_outline" />
        <div>
          <h2>{{ session.user.name }}</h2>
          <div class="text-grey-7 q-mt-xs">{{ session.user.mail }}</div>
        </div>
        <q-space />
        <q-badge v-if="commissions.agency" color="blue-1" text-color="blue-8">{{ $t('agencies.agency') }}</q-badge>
      </div>
    </q-card>
    <q-tabs v-model="tab" align="left" active-color="primary" class="q-mb-lg">
      <q-tab name="equipment" no-caps :label="$t('equipment.mine')" />
      <q-tab name="orders" no-caps :label="$t('orders.myServices')" />
      <q-tab v-if="commissions.agency" name="commissions" no-caps :label="$t('agencies.commissions')" />
      <q-tab name="settings" no-caps :label="$t('profile.settings')" />
    </q-tabs>
    <ErrorBanner :message="error" retry @retry="load" />
    <q-card v-if="tab === 'settings'" flat bordered class="section-card" style="max-width: 700px">
      <q-form @submit="save" class="q-gutter-md">
        <h2>{{ $t('profile.personalDetails') }}</h2>
        <q-input
          outlined
          v-model="form.name"
          :label="$t('contact.fullName')"
          :rules="[v => !!v || $t('validation.required')]" />
        <q-input
          outlined
          v-model="form.mail"
          :label="$t('contact.email')"
          type="email"
          :rules="[v => !!v || $t('validation.required')]" />
        <q-input outlined v-model="form.phone" :label="$t('contact.phone')" />
        <PostalAddressFields
          v-model:address="form.address"
          v-model:postal-code="form.postal_code"
          v-model:city="form.city"
          v-model:country="form.country"
          class="wide" />
        <LanguageSwitcher />
        <p class="text-caption text-grey-7">
          {{ $t('profile.contactHint') }}
        </p>
        <ErrorBanner :message="saveError" />
        <q-btn unelevated no-caps color="primary" :label="$t('common.saveChanges')" type="submit" :loading="saving" />
        <q-separator class="q-my-lg" />
        <p class="text-grey-7">{{ $t('auth.optionalPassword') }}</p>
        <q-btn outline no-caps color="primary" :label="$t('auth.setPassword')" :loading="sendingPassword" @click="sendPassword" />
        <p v-if="passwordSent" role="status">{{ $t('auth.resetSent') }}</p>
      </q-form>
    </q-card>
    <template v-else-if="tab === 'commissions'">
      <q-card flat bordered class="section-card">
        <div class="text-grey-7">{{ $t('agencies.myCode') }}</div>
        <div class="row items-center justify-between">
          <h2 class="q-mt-sm">{{ commissions.agency.code }}</h2>
          <q-btn flat no-caps icon="content_copy" :label="$t('common.copy')" @click="copyCode" />
        </div>
        <div class="q-mt-sm">{{ commissions.agency.discount_percent }} % {{ $t('agencies.discountSuffix') }}</div>
      </q-card>
      <q-select
        outlined
        dense
        v-model="commissionPeriod"
        :options="periodOptions"
        emit-value
        map-options
        :label="$t('common.period')"
        class="q-mb-lg" />
      <div class="stats" style="grid-template-columns: repeat(3, 1fr)">
        <div class="stat-card">
          <div>{{ $t('orders.title') }}</div>
          <div class="number">{{ filteredCommissions.length }}</div>
        </div>
        <div class="stat-card">
          <div>{{ $t('agencies.serviceValue') }}</div>
          <div class="number">
            {{ money( filteredCommissions.reduce((sum, row) => sum + Number(row.subtotal) - Number(row.discount_amount), 0) ) }}
          </div>
        </div>
        <div class="stat-card">
          <div>{{ $t('agencies.totalCommissions') }}</div>
          <div class="number">
            {{ money(filteredCommissions.reduce((sum, row) => sum + Number(row.agency_commission), 0)) }}
          </div>
        </div>
      </div>
      <q-table flat bordered :rows="filteredCommissions" :columns="commissionColumns" row-key="id" />
    </template>
    <q-table
      v-else
      flat
      bordered
      :rows="tab === 'equipment' ? equipment : orders"
      :columns="tab === 'equipment' ? equipmentColumns : orderColumns"
      row-key="id"
      :loading="loading">
      <template #body-cell-validity="p">
        <q-td :props="p">
          <q-badge
            rounded
            :color="inspectionState(p.row.valid_until).color"
            :text-color="inspectionState(p.row.valid_until).text">
            {{ $t(inspectionState(p.row.valid_until).label) }}
          </q-badge>
        </q-td>
      </template>
      <template #body-cell-status="p">
        <q-td :props="p"><StatusBadge :value="p.row.status" /></q-td>
      </template>
      <template #no-data>
        <div class="empty full-width">{{ $t('common.noRecords') }}</div>
      </template>
    </q-table>
  </q-page>
</template>
<script setup>
  import { computed, onMounted, reactive, ref } from 'vue'
  import { useQuasar } from 'quasar'
  import { api, date, inspectionState, money, orderNumber, session } from '../services/api'
  import { t, i18n } from '../i18n'
  import LanguageSwitcher from '../components/LanguageSwitcher.vue'
  import PostalAddressFields from '../components/PostalAddressFields.vue'
  import ErrorBanner from '../components/ErrorBanner.vue'
  import StatusBadge from '../components/StatusBadge.vue'
  const commissionPeriod = ref('all')
  const sendingPassword = ref(false)
  const passwordSent = ref(false)
  const filteredCommissions = computed(() =>
    commissions.value.orders.filter(
      row => commissionPeriod.value === 'all' || row.created_at.startsWith(commissionPeriod.value)
    )
  )
  const periodOptions = computed(() => [
    { value: 'all', label: t('common.allPeriods') },
    ...[...new Set(commissions.value.orders.map(row => row.created_at.slice(0, 7)))].map(value => ({
      value,
      label: value
    }))
  ])
  const tab = ref('equipment'),
    equipment = ref([]),
    orders = ref([]),
    commissions = ref({ agency: null, orders: [] }),
    form = reactive({ country: 'SI', postal_code: '', city: '', ...session.user }),
    error = ref(''),
    saveError = ref(''),
    saving = ref(false),
    loading = ref(false),
    q = useQuasar()
  const equipmentColumns = computed(() => [
    {
      name: 'model',
      field: r => `${r.manufacturer} ${r.model} ${r.size}`,
      label: t('equipment.title'),
      align: 'left'
    },
    { name: 'serial', field: 'serial', label: t('equipment.serial'), align: 'left' },
    { name: 'valid', field: r => date(r.valid_until), label: t('equipment.nextInspection'), align: 'left' },
    { name: 'validity', field: 'valid_until', label: t('equipment.validity'), align: 'left' }
  ])
  const orderColumns = computed(() => [
    { name: 'id', field: r => orderNumber(r.id), label: t('orders.order'), align: 'left' },
    {
      name: 'equipment',
      field: r => `${r.manufacturer} ${r.model}`,
      label: t('equipment.title'),
      align: 'left'
    },
    { name: 'status', field: 'status', label: t('common.status'), align: 'left' }
  ])
  const commissionColumns = computed(() => [
    { name: 'id', field: r => orderNumber(r.id), label: t('orders.order'), align: 'left' },
    { name: 'date', field: r => date(r.created_at), label: t('common.date'), align: 'left' },
    {
      name: 'value',
      field: r => money(r.subtotal - r.discount_amount),
      label: t('agencies.serviceValue'),
      align: 'left'
    },
    {
      name: 'commission',
      field: r => money(r.agency_commission),
      label: t('agencies.commission'),
      align: 'left'
    },
    { name: 'status', field: 'status', label: t('common.status'), align: 'left' }
  ])
  async function copyCode() {
    try {
      await navigator.clipboard.writeText(commissions.value.agency.code)
      q.notify({ type: 'positive', message: t('agencies.codeCopied') })
    } catch (error) {
      q.notify({ type: 'negative', message: error.message })
    }
  }

  async function load() {
    loading.value = true
    error.value = ''
    try {
      const result = await Promise.all([api('equipment'), api('orders'), api('commissions')])
      equipment.value = result[0].filter(e => Number(e.customer_id) === Number(session.user.id))
      orders.value = result[1].filter(o => Number(o.customer_id) === Number(session.user.id))
      commissions.value = result[2]
    } catch (e) {
      error.value = e.message
    } finally {
      loading.value = false
    }
  }
  async function save() {
    saving.value = true
    saveError.value = ''
    try {
      const data = { ...form, language: i18n.global.locale.value }
      await api('savecustomer', data)
      Object.assign(session.user, data)
      q.notify({ type: 'positive', message: t('common.saved') })
    } catch (e) {
      saveError.value = e.message
    } finally {
      saving.value = false
    }
  }
  async function sendPassword() {
    sendingPassword.value = true
    passwordSent.value = false
    saveError.value = ''
    try {
      await api('reset', { mail: session.user.mail })
      passwordSent.value = true
    } catch (e) { saveError.value = e.message }
    finally { sendingPassword.value = false }
  }
  onMounted(load)
</script>
