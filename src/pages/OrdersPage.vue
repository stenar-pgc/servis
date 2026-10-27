<template>
  <q-page class="page">
    <div class="page-heading">
      <div>

        <h1>{{ $t(session.user.admin ? 'orders.adminTitle' : 'orders.myServices') }}</h1>
        <p>{{ $t('orders.subtitle') }}</p>
      </div>
      <q-btn color="primary" unelevated no-caps icon="add" :label="$t('orders.new')" to="/servisi/novo" />
    </div>
    <div class="stats">
      <SummaryCard
        v-for="stat in stats"
        :key="stat.value"
        :label="$t(stat.label)"
        :count="stat.count"
        :icon="stat.icon"
        :icon-class="stat.color"
        :active="filter === stat.value"
        @select="selectFilter(stat.value)" />
    </div>
    <ErrorBanner :message="error" retry @retry="load" />
    <RelatedRecordsBar :customer-id="customerId" :customer-name="customerName" :equipment-id="equipmentId" :equipment="selectedEquipment" />
    <q-card flat bordered>
      <q-tabs
        v-model="filter"
        align="left"
        active-color="primary"
        indicator-color="primary"
        class="filter-tabs"
        outside-arrows
        mobile-arrows>
        <q-tab name="all" :label="$t('orders.all') + ' (' + scopedRows.length + ')'" />
        <q-tab
          v-for="s in statuses"
          :key="s.value"
          :name="s.value"
          :label="$t(s.label) + ' (' + scopedRows.filter(r => r.status === s.value).length + ')'" />
      </q-tabs>
      <q-table
        flat
        :rows="filtered"
        :columns="columns"
        row-key="id"
        :filter="search"
        :loading="loading"
        :pagination="{ rowsPerPage: 10, sortBy: 'id', descending: true }"
        @row-click="openOrder">
        <template #top>
          <div class="row items-center full-width q-gutter-sm">
            <q-input outlined dense v-model="search" :placeholder="$t('orders.search')" class="search-field" clearable>
              <template #prepend><q-icon name="search" size="20px" /></template>
            </q-input>
            <q-space />
            <span class="text-caption text-grey-6">{{ $t('orders.register') }}</span>
            <q-btn flat round dense icon="refresh" :aria-label="$t('common.refresh')" @click="load" />
          </div>
        </template>
        <template #body-cell-id="p">
          <q-td :props="p">
            <router-link class="table-title" :to="'/servisi/' + p.row.id" @click.stop>{{ orderNumber(p.row.id) }}</router-link>
            <div class="table-sub">{{ date(p.row.created_at) }}</div>
          </q-td>
        </template>
        <template #body-cell-equipment="p">
          <q-td :props="p">
            <template v-if="p.row.equipment?.length">
              <div v-for="item in p.row.equipment" :key="item.id"><router-link class="table-title" :to="{ path: '/servisi', query: { equipment: item.id } }" @click.stop>{{ equipmentLabel(item) || $t('equipment.title') }}</router-link></div>
            </template>
            <router-link v-else-if="p.row.equipment_id && Number(p.row.equipment_count || 1) === 1" class="table-title" :to="{ path: '/servisi', query: { equipment: p.row.equipment_id } }" @click.stop>{{ p.row.equipment_label || equipmentLabel(p.row) || $t('equipment.title') }}</router-link>
            <div v-else-if="p.row.equipment_count" class="table-title">{{ p.row.equipment_label }}</div>
            <div v-else class="table-title">{{ $t('equipment.unassigned') }}</div>
            <div class="table-sub"><router-link v-if="p.row.customer_id != null" :to="{ path: '/servisi', query: { customer: p.row.customer_id } }" @click.stop>{{ p.row.customer_name }}</router-link><span v-else>{{ p.row.customer_name || $t('customers.unassigned') }}</span></div>
            <q-badge v-if="p.row.confirmation_pending" color="orange-1" text-color="orange-9">
              {{ $t('orders.confirmationPending') }}
            </q-badge>
          </q-td>
        </template>
        <template #body-cell-description="p">
          <q-td :props="p" style="max-width: 240px">
            <div class="ellipsis">{{ p.row.description }}</div>
          </q-td>
        </template>
        <template #body-cell-status="p">
          <q-td :props="p"><StatusBadge :value="p.row.status" /></q-td>
        </template>
        <template #body-cell-report="p">
          <q-td :props="p">
            <q-icon
              :name="Number(p.row.report_count) ? 'task_alt' : 'remove'"
              :color="Number(p.row.report_count) ? 'primary' : 'grey-4'"
              size="20px" />
          </q-td>
        </template>
        <template #body-cell-finalized="p">
          <q-td :props="p">
            <q-icon
              :name="Number(p.row.finance_complete) ? 'task_alt' : 'radio_button_unchecked'"
              :color="Number(p.row.finance_complete) ? 'primary' : 'grey-4'"
              size="20px" />
          </q-td>
        </template>
        <template #body-cell-action="p">
          <q-td :props="p" @click.stop>
            <q-btn flat round dense icon="arrow_forward" :to="'/servisi/' + p.row.id" :aria-label="$t('orders.open')">
              <q-tooltip>{{ $t('orders.open') }}</q-tooltip>
            </q-btn>
            <q-btn v-if="session.user.admin" flat round dense color="negative" icon="delete_outline" :aria-label="$t('orders.delete')" :disable="deleting" @click.stop="removeOrder(p.row.id)">
              <q-tooltip>{{ $t('orders.delete') }}</q-tooltip>
            </q-btn>
          </q-td>
        </template>
        <template #no-data>
          <div class="empty full-width">
            <q-icon name="build_circle" size="42px" />
            <strong>{{ $t(search || filter !== 'all' || customerId || equipmentId ? 'common.noResults' : 'orders.emptyTitle') }}</strong>
            {{ $t('orders.emptyHint') }}
          </div>
        </template>
      </q-table>
    </q-card>
  </q-page>
</template>
<script setup>
  import { computed, onMounted, ref, watch } from 'vue'
  import { useRoute, useRouter } from 'vue-router'
  import { useQuasar } from 'quasar'
  import { confirmDeletion } from '../services/deletion'
  import { api, date, orderNumber, session, statuses } from '../services/api'
  import { t } from '../i18n'
  import ErrorBanner from '../components/ErrorBanner.vue'
  import StatusBadge from '../components/StatusBadge.vue'
  import SummaryCard from '../components/SummaryCard.vue'
  import RelatedRecordsBar from '../components/RelatedRecordsBar.vue'
  import { sameId, equipmentIds, equipmentLabel, isRowNavigation } from '../services/records'
  const q = useQuasar()
  const deleting = ref(false)
  function removeOrder(id) {
    confirmDeletion(q, {
      title: t('orders.delete'),
      message: t('orders.deleteConfirm', { number: orderNumber(id) }),
      action: () => api('deleteorder', { id }),
      onDeleted: () => { rows.value = rows.value.filter(row => row.id !== id) },
      onError: message => { error.value = message },
      busy: deleting
    })
  }
  const rows = ref([]),
    search = ref(''),
    filter = ref('all'),
    loading = ref(false),
    error = ref(''),
    router = useRouter(),
    route = useRoute(),
    scopeCustomers = ref([]),
    scopeEquipment = ref([])
  const customerId = computed(() => String(route.query.customer || ''))
  const equipmentId = computed(() => String(route.query.equipment || ''))
  const customerName = computed(() => scopeCustomers.value.find(row => sameId(row.id, customerId.value))?.name || rows.value.find(row => sameId(row.customer_id, customerId.value))?.customer_name || '')
  const selectedEquipment = computed(() => scopeEquipment.value.find(row => sameId(row.id, equipmentId.value)) || null)
  const scopedRows = computed(() => rows.value.filter(row => (!customerId.value || sameId(row.customer_id, customerId.value)) && (!equipmentId.value || equipmentIds(row).some(id => sameId(id, equipmentId.value)))))
  const filtered = computed(() => scopedRows.value.filter(r => filter.value === 'all' || r.status === filter.value))
  const stats = computed(() => [
    { value: 'all', label: 'orders.all', icon: 'inventory_2', color: 'bg-light-blue-1 text-primary', count: scopedRows.value.length },
    {
      value: 'submitted',
      label: 'statuses.awaitingArrival',
      icon: 'schedule',
      color: 'bg-orange-1 text-orange-9',
      count: scopedRows.value.filter(r => r.status === 'submitted').length
    },
    {
      value: 'in_service',
      label: 'statuses.inService',
      icon: 'build',
      color: 'bg-blue-1 text-blue-8',
      count: scopedRows.value.filter(r => r.status === 'in_service').length
    },
    {
      value: 'completed',
      label: 'statuses.completedServices',
      icon: 'task_alt',
      color: 'bg-light-blue-1 text-primary',
      count: scopedRows.value.filter(r => r.status === 'completed').length
    }
  ])
  function openOrder(event, row) {
    if (isRowNavigation(event)) router.push('/servisi/' + row.id)
  }
  watch(() => [route.query.customer, route.query.equipment], () => {
    filter.value = 'all'
    search.value = ''
    load()
  })
  function selectFilter(value) {
    filter.value = value
    search.value = ''
  }
  const columns = computed(() => [
    { name: 'id', label: t('orders.order'), field: 'id', align: 'left', sortable: true },
    {
      name: 'equipment',
      label: t('orders.equipmentCustomer'),
      field: r => `${r.equipment_label || ''} ${r.manufacturer || ''} ${r.model || ''} ${r.customer_name || ''}`,
      align: 'left'
    },
    { name: 'description', label: t('services.service'), field: 'description', align: 'left' },
    { name: 'status', label: t('common.status'), field: 'status', align: 'left' },
    { name: 'report', label: t('documents.report'), field: 'report_count', align: 'center' },
    ...(session.user.admin
      ? [{ name: 'finalized', label: t('orders.finalized'), field: 'finance_complete', align: 'center' }]
      : []),
    { name: 'action', label: '', field: 'id' }
  ])
  let loadVersion = 0
  async function load() {
    const version = ++loadVersion
    loading.value = true
    error.value = ''
    try {
      const result = await Promise.all([api('orders'), customerId.value && session.user.admin ? api('customers') : [], equipmentId.value ? api('equipment') : []])
      if (version !== loadVersion) return
      rows.value = result[0]
      scopeCustomers.value = result[1]
      scopeEquipment.value = result[2]
    } catch (e) {
      if (version === loadVersion) error.value = e.message
    } finally {
      if (version === loadVersion) loading.value = false
    }
  }
  onMounted(load)
</script>
