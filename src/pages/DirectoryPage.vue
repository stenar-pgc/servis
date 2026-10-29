<template>
  <q-page class="page">
    <div class="page-heading">
      <div>

        <h1>{{ $t(config.title) }}</h1>
        <p>{{ $t(config.subtitle) }}</p>
      </div>
      <q-btn unelevated no-caps color="primary" icon="add" :label="$t(config.add)" @click="edit(null)" />
    </div>
    <div class="stats directory-stats">
      <template v-for="s in stats" :key="s.label">
        <SummaryCard v-if="kind === 'customers'" :label="$t(s.label)" :count="s.value" :icon="s.icon" :icon-class="s.color" :active="accountFilter === s.filter" @select="selectCustomerFilter(s.filter)" />
        <div v-else class="stat-card">
          <div class="text-grey-7">{{ $t(s.label) }}</div>
          <div class="number">{{ s.value }}</div>
        </div>
      </template>
    </div>
    <ErrorBanner :message="error" retry @retry="load" />
    <q-banner v-if="kind === 'customers' && rows.some(row => !row.user_id)" class="bg-orange-1 q-mb-md" rounded :inline-actions="$q.screen.gt.xs">
      {{ $t('customers.prepareHint') }}
      <template #action>
        <q-btn flat no-caps color="primary" :label="$t('customers.prepareAccounts')" :loading="saving" @click="previewAccounts" />
      </template>
    </q-banner>
    <q-table
      flat
      bordered
      :rows="filtered"
      :columns="columns"
      :loading="loading"
      :filter="kind === 'customers' ? '' : search"
      :pagination="{ rowsPerPage: 10 }"
      row-key="id"
      v-on="kind === 'customers' ? { rowClick: openCustomer } : {}">
      <template #top>
        <q-input outlined dense v-model="search" :placeholder="$t(config.search)" class="search-field" clearable>
          <template #prepend><q-icon name="search" /></template>
        </q-input>
        <q-space />
        <q-select
          v-if="kind === 'payments' || kind === 'discounts'"
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
          <div :class="{ 'customer-identity': kind === 'customers' }">
            <q-icon
              v-if="kind === 'customers'"
              :name="p.row.user_id ? 'account_circle' : 'person_outline'"
              :color="p.row.user_id ? 'primary' : 'grey-6'"
              size="36px"
              class="customer-account-icon"
              :class="p.row.user_id ? 'bg-light-blue-1' : 'bg-grey-2'"
              role="img"
              aria-hidden="false"
              :aria-label="$t(p.row.user_id ? 'customers.registered' : 'customers.noAccount')">
              <q-tooltip>{{ $t(p.row.user_id ? 'customers.registered' : 'customers.noAccount') }}</q-tooltip>
            </q-icon>
            <div>
          <router-link v-if="kind === 'customers'" class="table-title" :to="{ path: '/servisi', query: { customer: p.row.id } }" @click.stop>{{ p.row.name }}</router-link><div v-else class="table-title">{{ p.row.name }}</div>
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
            </div>
          </div>
        </q-td>
      </template>
      <template #body-cell-equipment="p">
        <q-td :props="p"><router-link :to="{ path: '/oprema', query: { customer: p.row.id } }" @click.stop>{{ p.row.equipment_count || 0 }}</router-link></q-td>
      </template>
      <template #body-cell-orders="p">
        <q-td :props="p"><router-link v-if="kind === 'customers'" :to="{ path: '/servisi', query: { customer: p.row.id } }" @click.stop>{{ p.row.order_count || 0 }}</router-link><span v-else>{{ p.value }}</span></q-td>
      </template>
      <template #body-cell-code="p">
        <q-td :props="p">
          <div :class="p.row.discount_codes ? 'table-title' : 'text-grey-6'">{{ p.row.discount_codes ? p.row.discount_codes.split(',').join(', ') : $t('discounts.noCodes') }}</div>
          <q-badge v-if="!Number(p.row.active)" color="grey-2" text-color="grey-7">
            {{ $t('agencies.inactive') }}
          </q-badge>
        </q-td>
      </template>
      <template #body-cell-discountCode="p">
        <q-td :props="p">
          <div class="table-title">{{ p.row.code }}</div>
          <q-badge :color="discountStates[discountState(p.row)].bg" :text-color="discountStates[discountState(p.row)].color">
            {{ $t('discounts.' + discountState(p.row)) }}
          </q-badge>
        </q-td>
      </template>
      <template #body-cell-action="p">
        <q-td :props="p" @click.stop>
          <q-btn flat round dense color="primary" icon="edit" :aria-label="$t('common.edit')" @click="edit(p.row)">
            <q-tooltip>{{ $t('common.edit') }}</q-tooltip>
          </q-btn>
          <template v-if="kind === 'customers' && p.row.user_id && p.row.role !== 'admin'">
            <q-btn flat round dense color="primary" icon="mail_outline" :aria-label="$t('auth.sendAccess')" :loading="accessBusy === p.row.id" :disable="accessBusy !== null" @click="sendAccess(p.row)">
              <q-tooltip>{{ $t('auth.sendAccess') }}</q-tooltip>
            </q-btn>
            <q-btn flat round dense color="grey-6" icon="link_off" :aria-label="$t('auth.revokeAccess')" @click="revokeAccess(p.row)">
              <q-tooltip>{{ $t('auth.revokeAccess') }}</q-tooltip>
            </q-btn>
          </template>
          <q-btn v-if="kind === 'customers' && !p.row.user_id" flat round dense color="primary" icon="link" :aria-label="$t('customers.linkAccount')" @click="openLink(p.row)">
            <q-tooltip>{{ $t('customers.linkAccount') }}</q-tooltip>
          </q-btn>
          <q-btn
            flat
            round
            dense
            color="negative"
            icon="delete_outline"
            :aria-label="$t('common.delete')"
            :disable="deleting"
            @click="removeRow(p.row)">
            <q-tooltip>{{ $t('common.delete') }}</q-tooltip>
          </q-btn>
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
    <CustomerDeleteDialog v-if="customerToDelete" :customer="customerToDelete" @close="customerToDelete = null" @deleted="customerDeleted" />
    <q-dialog :model-value="!!migration" @update:model-value="value => { if (!value) migration = null }">
      <q-card class="editor">
        <q-card-section>
          <h2>{{ $t('customers.prepareAccounts') }}</h2>
          <p class="q-mt-md">{{ $t('customers.prepareReview', { count: migration?.ready.length || 0 }) }}</p>
          <div v-for="row in migration?.ready || []" :key="row.id" class="q-mb-xs">{{ row.name }} · {{ row.mail }}</div>
          <template v-if="migration?.conflicts.length">
            <h3 class="q-mt-lg">{{ $t('customers.resolveConflicts') }}</h3>
            <div v-for="row in migration.conflicts" :key="row.id" class="q-mt-md">
              <strong>{{ row.name }} · {{ row.mail }}</strong>
              <div>{{ translateText(row.reason) }}</div>
            </div>
          </template>
          <ErrorBanner :message="migrationError" class="q-mt-md" />
        </q-card-section>
        <q-card-actions align="right">
          <q-btn flat no-caps :label="$t('common.cancel')" v-close-popup :disable="saving" />
          <q-btn unelevated no-caps color="primary" :label="$t('customers.prepareAccounts')" :disable="!migration?.ready.length" :loading="saving" @click="prepareAccounts" />
        </q-card-actions>
      </q-card>
    </q-dialog>
    <q-dialog :model-value="!!linkSource" @update:model-value="value => { if (!value) linkSource = null }">
      <q-card class="editor">
        <q-form @submit="linkAccount">
          <q-card-section class="q-gutter-md">
            <h2>{{ $t('customers.linkAccount') }}</h2>
            <p>{{ $t('customers.linkReview', { name: linkSource?.name }) }}</p>
            <CustomerSelect v-model="linkTarget" :customers="rows.filter(row => row.id !== linkSource?.id)" :label="$t('customers.targetAccount')" outlined :rules="[required]" />
            <ErrorBanner :message="linkError" />
          </q-card-section>
          <q-card-actions align="right">
            <q-btn flat no-caps :label="$t('common.cancel')" v-close-popup :disable="saving" />
            <q-btn unelevated no-caps color="primary" type="submit" :label="$t('customers.linkAccount')" :loading="saving" />
          </q-card-actions>
        </q-form>
      </q-card>
    </q-dialog>
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
                :disable="Number(form.id) < 0"
                :options="[
                  { value: 'customer', label: $t('roles.customer') },
                  { value: 'admin', label: $t('roles.admin') }
                ]"
                emit-value
                map-options
                :label="$t('roles.role')" />
              <p v-if="!form.id" class="wide text-caption text-grey-6 q-mb-none">{{ $t('auth.automaticAccount') }}</p>
            </template>
            <template v-if="kind === 'agencies'">
              <q-input
                outlined
                dense
                v-model="form.name"
                :label="$t('agencies.name') + ' *'"
                class="wide"
                :rules="[required]" />
              <CustomerSelect
                outlined
                dense
                v-model="form.customer_id"
                :customers="customers"
                :label="$t('agencies.contact') + ' *'"
                class="wide"
                :rules="[required]" />
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
              <p class="wide text-caption text-grey-6 q-mb-none">
                {{ form.discount_codes ? $t('discounts.agencyCodes') + ': ' + form.discount_codes.split(',').join(', ') + '. ' : '' }}
                <router-link to="/popusti">{{ $t('discounts.codesHint') }}</router-link>
              </p>
            </template>
            <template v-if="kind === 'discounts'">
              <q-input
                outlined
                dense
                :model-value="form.code"
                :label="$t('discounts.code') + ' *'"
                class="wide"
                maxlength="40"
                :rules="[required, v => /^[A-Za-z0-9_-]+$/.test(v) || t('errors.codeCharacters')]"
                @update:model-value="value => (form.code = String(value || '').toUpperCase())" />
              <q-btn-toggle
                v-model="form.discount_type"
                class="wide discount-type"
                spread
                no-caps
                unelevated
                toggle-color="primary"
                :options="[
                  { value: 'percent', label: $t('discounts.percent') },
                  { value: 'fixed', label: $t('discounts.fixed') }
                ]" />
              <q-input
                outlined
                dense
                v-model.number="form.discount_value"
                type="number"
                min="0.01"
                :max="form.discount_type === 'percent' ? 100 : undefined"
                step="0.01"
                :label="$t(form.discount_type === 'percent' ? 'discounts.percentValue' : 'discounts.fixedValue') + ' *'"
                :rules="[v => (v > 0 && (form.discount_type !== 'percent' || v <= 100)) || t('validation.required')]" />
              <q-select
                outlined
                dense
                v-model="form.agency_id"
                :options="agencies"
                option-value="id"
                option-label="name"
                emit-value
                map-options
                clearable
                :label="$t('discounts.agency')" />
              <q-toggle v-model="form.unlimited" :label="$t('discounts.unlimitedValidity')" class="wide" />
              <template v-if="!form.unlimited">
                <q-input
                  outlined
                  dense
                  v-model="form.valid_from"
                  type="date"
                  stack-label
                  :label="$t('discounts.validFrom')"
                  :rules="[v => !!v || !!form.valid_to || t('validation.required')]" />
                <q-input
                  outlined
                  dense
                  v-model="form.valid_to"
                  type="date"
                  stack-label
                  :label="$t('discounts.validTo')"
                  :rules="[v => !!v || !!form.valid_from || t('validation.required'), v => !v || !form.valid_from || v >= form.valid_from || t('errors.discountValidity')]" />
              </template>
              <q-toggle v-model="form.active" :true-value="1" :false-value="0" :label="$t('discounts.active')" class="wide" />
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
  import { useRoute, useRouter } from 'vue-router'
  import { api, date, money } from '../services/api'
  import { confirmDeletion } from '../services/deletion'
  import { isRowNavigation } from '../services/records'
  import { t, translateText } from '../i18n'
  import PostalAddressFields from '../components/PostalAddressFields.vue'
  import CustomerSelect from '../components/CustomerSelect.vue'
  import ErrorBanner from '../components/ErrorBanner.vue'
  import CustomerDeleteDialog from '../components/CustomerDeleteDialog.vue'
  import SummaryCard from '../components/SummaryCard.vue'
  const q = useQuasar(), router = useRouter()
  const deleting = ref(false)
  const customerToDelete = ref(null)
  const accessBusy = ref(null)
  const migration = ref(null)
  const migrationError = ref('')
  const linkSource = ref(null)
  const linkTarget = ref(null)
  const linkError = ref('')
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
    discounts: {
      title: 'discounts.title',
      subtitle: 'discounts.subtitle',
      add: 'discounts.new',
      search: 'discounts.search',
      icon: 'sell',
      save: 'savediscount'
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
          !search.value ||
          [r.name, r.mail, r.phone].some(value =>
            String(value || '')
              .toLocaleLowerCase()
              .includes(search.value.toLocaleLowerCase())
          )) &&
        (kind !== 'customers' ||
          accountFilter.value === 'all' ||
          (accountFilter.value === 'registered' ? !!r.user_id : !r.user_id))
    )
  )
  const today = new Date().toLocaleDateString('sv-SE')
  const discountState = r =>
    !Number(r.active) ? 'disabled' : r.valid_to && r.valid_to < today ? 'expired' : r.valid_from && r.valid_from > today ? 'upcoming' : 'enabled'
  const discountStates = {
    enabled: { bg: 'teal-1', color: 'primary' },
    disabled: { bg: 'grey-2', color: 'grey-7' },
    expired: { bg: 'red-1', color: 'red-8' },
    upcoming: { bg: 'orange-1', color: 'orange-9' }
  }
  const validity = r =>
    r.valid_from && r.valid_to
      ? date(r.valid_from) + ' – ' + date(r.valid_to)
      : r.valid_from
        ? t('discounts.from', { date: date(r.valid_from) })
        : r.valid_to
          ? t('discounts.to', { date: date(r.valid_to) })
          : t('discounts.unlimited')
  const sum = field => rows.value.reduce((s, r) => s + Number(r[field] || 0), 0)
  const stats = computed(() =>
    kind === 'customers'
      ? [
          { label: 'customers.all', value: rows.value.length, filter: 'all', icon: 'groups', color: 'bg-light-blue-1 text-primary' },
          { label: 'customers.registeredPlural', value: rows.value.filter(r => r.user_id).length, filter: 'registered', icon: 'account_circle', color: 'bg-light-blue-1 text-primary' },
          { label: 'customers.noAccount', value: rows.value.filter(r => !r.user_id).length, filter: 'guest', icon: 'person_outline', color: 'bg-orange-1 text-orange-9' }
        ]
      : kind === 'agencies'
        ? [
            { label: 'agencies.title', value: rows.value.length },
            { label: 'agencies.earned', value: money(sum('earned')) },
            { label: 'agencies.outstanding', value: money(sum('earned') - sum('paid')) }
          ]
        : kind === 'discounts'
        ? [
            { label: 'discounts.count', value: rows.value.length },
            { label: 'discounts.activeCount', value: rows.value.filter(r => discountState(r) === 'enabled').length },
            { label: 'discounts.used', value: sum('order_count') }
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
          { name: 'equipment', field: 'equipment_count', label: t('equipment.title') },
          { name: 'orders', field: 'order_count', label: t('services.title') },
          { name: 'last', field: r => date(r.last_service), label: t('customers.lastService') }
        ]
      : kind === 'agencies'
        ? [
            { name: 'name', field: 'name', label: t('agencies.agency') },
            { name: 'code', field: 'discount_codes', label: t('discounts.agencyCodes') },
            { name: 'customers', field: 'customer_count', label: t('customers.title') },
            { name: 'orders', field: 'order_count', label: t('services.title') },
            { name: 'earned', field: r => money(r.earned), label: t('agencies.commissions') },
            { name: 'balance', field: r => money(r.earned - r.paid), label: t('agencies.outstanding') }
          ]
        : kind === 'discounts'
        ? [
            { name: 'discountCode', field: 'code', label: t('discounts.code') },
            { name: 'discount', field: r => (r.discount_type === 'fixed' ? money(r.discount_value) : Number(r.discount_value) + ' %'), label: t('discounts.discount') },
            { name: 'validity', field: validity, label: t('discounts.validity') },
            { name: 'agency', field: r => r.agency_name || t('discounts.noAgency'), label: t('agencies.agency') },
            { name: 'orders', field: r => Number(r.order_count || 0), label: t('discounts.used') }
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
  function openCustomer(event, row) {
    if (kind === 'customers' && isRowNavigation(event)) router.push({ path: '/servisi', query: { customer: row.id } })
  }
  function selectCustomerFilter(value) {
    accountFilter.value = value
    search.value = ''
  }
  function removeRow(row) {
    if (kind === 'customers') { customerToDelete.value = row; return }
    const group = { agencies: 'agencies', discounts: 'discounts', payments: 'payouts' }[kind]
    const action = { agencies: 'deleteagency', discounts: 'deletediscount', payments: 'deletepayment' }[kind]
    confirmDeletion(q, {
      title: t(group + '.deleteTitle'),
      message: t(group + '.deleteConfirm', { name: kind === 'discounts' ? row.code : row.name || row.agency_name, amount: money(row.amount), date: date(row.paid_at) }),
      action: () => api(action, { id: row.id }),
      onDeleted: load,
      onError: message => { error.value = message },
      busy: deleting
    })
  }
  async function customerDeleted() {
    customerToDelete.value = null
    await load()
    q.notify({ type: 'positive', message: t('common.deleted') })
  }
  async function sendAccess(row) {
    accessBusy.value = row.id
    error.value = ''
    try {
      await api('sendaccess', { id: row.id })
      q.notify({ type: 'positive', message: t('auth.accessSent') })
    } catch (e) { error.value = e.message }
    finally { accessBusy.value = null }
  }
  function revokeAccess(row) {
    q.dialog({
      title: t('auth.revokeAccess'),
      message: t('auth.revokeConfirm', { name: row.name }),
      cancel: { label: t('common.cancel'), flat: true },
      ok: { label: t('auth.revokeAccess'), color: 'negative' }
    }).onOk(async () => {
      try {
        await api('revokeaccess', { id: row.id })
        q.notify({ type: 'positive', message: t('auth.accessRevoked') })
      } catch (e) { error.value = e.message }
    })
  }
  async function previewAccounts() {
    saving.value = true
    error.value = ''
    migrationError.value = ''
    try { migration.value = await api('accountmigration', { apply: false }) }
    catch (e) { error.value = e.message }
    finally { saving.value = false }
  }
  async function prepareAccounts() {
    saving.value = true
    migrationError.value = ''
    try {
      const result = await api('accountmigration', { apply: true })
      await load()
      migration.value = result.conflicts.length ? { ready: [], conflicts: result.conflicts } : null
      q.notify({ type: 'positive', message: t('customers.accountsPrepared', { count: result.converted.length }) })
    } catch (e) { migrationError.value = e.message }
    finally { saving.value = false }
  }
  function openLink(row) {
    linkSource.value = row
    linkTarget.value = null
    linkError.value = ''
  }
  async function linkAccount() {
    saving.value = true
    linkError.value = ''
    try {
      await api('linkcustomer', { id: linkSource.value.id, customer_id: linkTarget.value })
      linkSource.value = null
      await load()
    } catch (e) { linkError.value = e.message }
    finally { saving.value = false }
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
        discount_type: 'percent',
        discount_value: null,
        valid_from: '',
        valid_to: '',
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
    form.unlimited = !form.valid_from && !form.valid_to
    if (form.discount_value != null) form.discount_value = Number(form.discount_value)
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
        kind === 'payments' || kind === 'discounts' ? api('agencies') : []
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
      const result = await api(config.save, kind === 'discounts' && form.unlimited ? { ...form, valid_from: null, valid_to: null } : form)
      editor.value = false
      await load()
      if (result.access_sent === false) error.value = t('errors.emailFailed')
    } catch (e) {
      saveError.value = e.message
    } finally {
      saving.value = false
    }
  }
  onMounted(load)
</script>
<style scoped>
  .directory-stats { grid-template-columns: repeat(3, minmax(0, 1fr)); }
  .discount-type { border: 1px solid #cfe6ee; border-radius: 8px; }
  @media (max-width: 599px) { .directory-stats { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
  .customer-identity { display: flex; align-items: center; gap: 12px; }
  .customer-account-icon { flex-shrink: 0; padding: 10px; border-radius: 50%; }
</style>
