<template>
  <q-page class="page">
    <div class="page-heading">
      <div>
        <div class="eyebrow">{{ $t('navigation.administration') }}</div>
        <h1>{{ $t(config.title) }}</h1>
        <p>{{ $t(config.subtitle) }}</p>
      </div>
      <q-btn unelevated no-caps color="primary" icon="add" :label="$t(config.add)" @click="edit(null)" />
    </div>
    <div class="stats" style="grid-template-columns: repeat(3, 1fr)">
      <div v-for="s in stats" :key="s.label" class="stat-card">
        <div class="text-grey-7">{{ $t(s.label) }}</div>
        <div class="number">{{ s.value }}</div>
      </div>
    </div>
    <ErrorBanner :message="error" retry @retry="load" />
    <q-table
      flat
      bordered
      :rows="filtered"
      :columns="columns"
      :loading="loading"
      :filter="search"
      :pagination="{ rowsPerPage: 10 }"
      row-key="id">
      <template #top>
        <q-input outlined dense v-model="search" :placeholder="$t(config.search)" class="search-field" clearable>
          <template #prepend><q-icon name="search" /></template>
        </q-input>
        <q-space />
        <q-select
          v-if="kind === 'payments'"
          outlined
          dense
          v-model="agencyFilter"
          :options="agencies"
          option-value="id"
          option-label="name"
          emit-value
          map-options
          clearable
          :label="$t('agencies.all')"
          style="min-width: 200px" />
        <q-btn-toggle
          v-if="kind === 'customers'"
          v-model="accountFilter"
          flat
          no-caps
          toggle-color="primary"
          :options="[
            { value: 'all', label: $t('common.all') },
            { value: 'registered', label: $t('customers.registeredPlural') },
            { value: 'guest', label: $t('customers.noAccount') }
          ]" />
      </template>
      <template #body-cell-name="p">
        <q-td :props="p">
          <div class="table-title">{{ p.row.name }}</div>
          <div class="table-sub">{{ kind === 'customers' ? p.row.mail : p.row.contact_name }}</div>
          <q-badge
            v-if="kind === 'customers' && Number(p.row.account_requested) && !p.row.user_id"
            color="orange-1"
            text-color="orange-9">
            {{ $t('customers.accountRequested') }}
          </q-badge>
          <div v-if="kind === 'customers'" class="table-sub">
            {{ p.row.phone }}
          </div>
        </q-td>
      </template>
      <template #body-cell-account="p">
        <q-td :props="p">
          <q-badge
            rounded
            :color="p.row.user_id ? 'teal-1' : 'grey-2'"
            :text-color="p.row.user_id ? 'primary' : 'grey-7'">
            {{ $t(p.row.user_id ? 'customers.registered' : 'customers.noAccount') }}
          </q-badge>
        </q-td>
      </template>
      <template #body-cell-code="p">
        <q-td :props="p">
          <div class="table-title">{{ p.row.code }}</div>
          <div class="table-sub">{{ p.row.discount_percent }} % {{ $t('agencies.discountSuffix') }}</div>
          <q-badge v-if="!Number(p.row.active)" color="grey-2" text-color="grey-7">
            {{ $t('agencies.inactive') }}
          </q-badge>
        </q-td>
      </template>
      <template #body-cell-action="p">
        <q-td :props="p">
          <q-btn flat no-caps color="primary" icon="edit" :label="$t('common.edit')" @click="edit(p.row)" />
          <q-btn
            v-if="kind === 'customers'"
            flat
            no-caps
            color="negative"
            icon="delete_outline"
            :label="$t('common.delete')"
            @click="removeCustomer(p.row)" />
        </q-td>
      </template>
      <template #no-data>
        <div class="empty full-width">
          <q-icon :name="config.icon" size="42px" />
          <strong>{{ $t('common.noRecords') }}</strong>
          {{ $t('common.emptyHint') }}
        </div>
      </template>
    </q-table>
    <q-dialog v-model="editor">
      <q-card class="editor">
        <q-form @submit="save">
          <q-card-section class="row items-center">
            <h2>{{ $t(form.id ? 'common.editDetails' : config.add) }}</h2>
            <q-space />
            <q-btn flat dense round icon="close" v-close-popup :aria-label="$t('common.close')" />
          </q-card-section>
          <q-separator />
          <q-card-section class="form-grid">
            <template v-if="kind === 'customers'">
              <q-input
                outlined
                dense
                v-model="form.name"
                :label="$t('contact.fullName') + ' *'"
                :rules="[required]"
                class="wide" />
              <q-input
                outlined
                dense
                v-model="form.mail"
                :label="$t('contact.email') + ' *'"
                type="email"
                :rules="[required]" />
              <q-input outlined dense v-model="form.phone" :label="$t('contact.phone')" />
              <PostalAddressFields
                v-model:address="form.address"
                v-model:postal-code="form.postal_code"
                v-model:city="form.city"
                v-model:country="form.country"
                class="wide" />
              <q-select
                outlined
                dense
                v-model="form.role"
                :options="[
                  { value: 'customer', label: $t('roles.customer') },
                  { value: 'admin', label: $t('roles.admin') }
                ]"
                emit-value
                map-options
                :label="$t('roles.role')" />
              <q-input
                outlined
                dense
                v-model.number="form.user_id"
                type="number"
                min="1"
                :label="$t('customers.userId')" />
              <p class="wide text-caption text-grey-6 q-mb-none">
                {{ $t('customers.userIdHint') }}
              </p>
            </template>
            <template v-if="kind === 'agencies'">
              <q-input
                outlined
                dense
                v-model="form.name"
                :label="$t('agencies.name') + ' *'"
                class="wide"
                :rules="[required]" />
              <q-select
                outlined
                dense
                v-model="form.customer_id"
                :options="customers"
                option-label="name"
                option-value="id"
                emit-value
                map-options
                :label="$t('agencies.contact') + ' *'"
                class="wide"
                :rules="[required]" />
              <q-input
                outlined
                dense
                v-model="form.code"
                :label="$t('agencies.discountCode') + ' *'"
                class="wide"
                :rules="[required]" />
              <q-input
                outlined
                dense
                v-model.number="form.discount_percent"
                type="number"
                min="0"
                max="100"
                step="0.01"
                :label="$t('agencies.discountPercent')" />
              <q-input
                outlined
                dense
                v-model.number="form.commission_percent"
                type="number"
                min="0"
                max="100"
                step="0.01"
                :label="$t('agencies.commissionPercent')" />
              <q-toggle v-model="form.active" :true-value="1" :false-value="0" :label="$t('agencies.active')" />
            </template>
            <template v-if="kind === 'payments'">
              <q-select
                outlined
                dense
                v-model="form.agency_id"
                :options="agencies"
                option-value="id"
                option-label="name"
                emit-value
                map-options
                :label="$t('payouts.recipient') + ' *'"
                :rules="[required]"
                class="wide" />
              <q-input
                outlined
                dense
                v-model.number="form.amount"
                type="number"
                min="0.01"
                step="0.01"
                :label="$t('finance.amountEur') + ' *'"
                :rules="[v => v > 0 || t('validation.required')]" />
              <q-input
                outlined
                dense
                v-model="form.paid_at"
                type="date"
                :label="$t('common.date') + ' *'"
                stack-label
                :rules="[required]" />
              <q-input
                outlined
                dense
                v-model="form.description"
                type="textarea"
                :label="$t('payouts.description') + ' *'"
                :rules="[required]"
                class="wide" />
            </template>
          </q-card-section>
          <q-card-section v-if="saveError"><ErrorBanner :message="saveError" /></q-card-section>
          <q-card-actions align="right" class="q-pa-md">
            <q-btn flat no-caps :label="$t('common.cancel')" v-close-popup />
            <q-btn unelevated no-caps color="primary" type="submit" :label="$t('common.save')" :loading="saving" />
          </q-card-actions>
        </q-form>
      </q-card>
    </q-dialog>
  </q-page>
</template>
<script setup>
  import { computed, onMounted, reactive, ref } from 'vue'
  import { useQuasar } from 'quasar'
  import { useRoute } from 'vue-router'
  import { api, date, money } from '../services/api'
  import { t } from '../i18n'
  import PostalAddressFields from '../components/PostalAddressFields.vue'
  import ErrorBanner from '../components/ErrorBanner.vue'
  const q = useQuasar()
  const kind = useRoute().meta.kind
  const config = {
    customers: {
      title: 'customers.title',
      subtitle: 'customers.subtitle',
      add: 'customers.new',
      search: 'customers.search',
      icon: 'people_outline',
      save: 'savecustomer'
    },
    agencies: {
      title: 'agencies.title',
      subtitle: 'agencies.subtitle',
      add: 'agencies.new',
      search: 'agencies.search',
      icon: 'handshake',
      save: 'saveagency'
    },
    payments: {
      title: 'payouts.title',
      subtitle: 'payouts.subtitle',
      add: 'payouts.add',
      search: 'payouts.search',
      icon: 'account_balance_wallet',
      save: 'savepayment'
    }
  }[kind]
  const rows = ref([]),
    customers = ref([]),
    agencies = ref([]),
    search = ref(''),
    accountFilter = ref('all'),
    agencyFilter = ref(null),
    loading = ref(false),
    error = ref(''),
    editor = ref(false),
    saving = ref(false),
    saveError = ref(''),
    form = reactive({})
  const required = v => !!v || t('validation.required')
  const filtered = computed(() =>
    rows.value.filter(
      r =>
        (!agencyFilter.value || r.agency_id == agencyFilter.value) &&
        (kind !== 'customers' ||
          accountFilter.value === 'all' ||
          (accountFilter.value === 'registered' ? !!r.user_id : !r.user_id))
    )
  )
  const sum = field => rows.value.reduce((s, r) => s + Number(r[field] || 0), 0)
  const stats = computed(() =>
    kind === 'customers'
      ? [
          { label: 'customers.all', value: rows.value.length },
          { label: 'customers.registeredPlural', value: rows.value.filter(r => r.user_id).length },
          { label: 'customers.noAccount', value: rows.value.filter(r => !r.user_id).length }
        ]
      : kind === 'agencies'
        ? [
            { label: 'agencies.title', value: rows.value.length },
            { label: 'agencies.earned', value: money(sum('earned')) },
            { label: 'agencies.outstanding', value: money(sum('earned') - sum('paid')) }
          ]
        : [
            { label: 'payouts.totalPaid', value: money(sum('amount')) },
            { label: 'payouts.count', value: rows.value.length },
            { label: 'agencies.count', value: new Set(rows.value.map(r => r.agency_id)).size }
          ]
  )
  const columns = computed(() =>
    (kind === 'customers'
      ? [
          { name: 'name', field: 'name', label: t('customers.customer') },
          { name: 'account', field: 'user_id', label: t('auth.account') },
          { name: 'equipment', field: 'equipment_count', label: t('equipment.title') },
          { name: 'orders', field: 'order_count', label: t('services.title') },
          { name: 'last', field: r => date(r.last_service), label: t('customers.lastService') }
        ]
      : kind === 'agencies'
        ? [
            { name: 'name', field: 'name', label: t('agencies.agency') },
            { name: 'code', field: 'code', label: t('agencies.codeDiscount') },
            { name: 'customers', field: 'customer_count', label: t('customers.title') },
            { name: 'orders', field: 'order_count', label: t('services.title') },
            { name: 'earned', field: r => money(r.earned), label: t('agencies.commissions') },
            { name: 'balance', field: r => money(r.earned - r.paid), label: t('agencies.outstanding') }
          ]
        : [
            { name: 'date', field: r => date(r.paid_at), label: t('common.date') },
            { name: 'agency', field: 'agency_name', label: t('payouts.recipient') },
            { name: 'description', field: 'description', label: t('common.description') },
            { name: 'amount', field: r => money(r.amount), label: t('finance.amount') }
          ]
    )
      .map(c => ({ ...c, align: 'left' }))
      .concat({ name: 'action', field: 'id', label: '' })
  )
  function removeCustomer(row) {
    q.dialog({
      title: t('customers.deleteTitle'),
      message: t('customers.deleteConfirm', { name: row.name }),
      cancel: { label: t('common.cancel'), flat: true },
      ok: { label: t('common.delete'), color: 'negative' }
    }).onOk(async () => {
      error.value = ''
      try {
        await api('deletecustomer', { id: row.id })
        await load()
      } catch (e) {
        error.value = e.message
      }
    })
  }
  function edit(row) {
    for (const key in form) delete form[key]
    Object.assign(
      form,
      {
        name: '',
        mail: '',
        phone: '',
        address: '',
        country: 'SI',
        postal_code: '',
        city: '',
        role: 'customer',
        language: 'sl',
        user_id: null,
        customer_id: null,
        code: '',
        discount_percent: 0,
        commission_percent: 0,
        active: 1,
        agency_id: null,
        amount: null,
        description: '',
        paid_at: new Date().toISOString().slice(0, 10)
      },
      row || {}
    )
    form.active = Number(form.active) === 1 ? 1 : 0
    saveError.value = ''
    editor.value = true
  }
  async function load() {
    loading.value = true
    error.value = ''
    try {
      const result = await Promise.all([
        api(kind),
        kind === 'agencies' ? api('customers') : [],
        kind === 'payments' ? api('agencies') : []
      ])
      rows.value = result[0]
      customers.value = result[1]
      agencies.value = result[2]
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
      await api(config.save, form)
      editor.value = false
      await load()
    } catch (e) {
      saveError.value = e.message
    } finally {
      saving.value = false
    }
  }
  onMounted(load)
</script>
