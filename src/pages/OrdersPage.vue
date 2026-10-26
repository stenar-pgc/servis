<template>
  <q-page class="page">
    <div class="page-heading">
      <div>
        <div class="eyebrow">STENAR SERVIS</div>
        <h1>{{ $t(session.user.admin ? 'orders.adminTitle' : 'orders.myServices') }}</h1>
        <p>{{ $t('orders.subtitle') }}</p>
      </div>
      <q-btn color="primary" unelevated no-caps icon="add" :label="$t('orders.new')" to="/servisi/novo" />
    </div>
    <div class="stats">
      <div v-for="stat in stats" :key="stat.label" class="stat-card">
        <div class="row items-center justify-between">
          <span class="text-grey-7">{{ $t(stat.label) }}</span>
          <q-icon :name="stat.icon" size="19px" />
        </div>
        <div class="number">{{ stat.count }}</div>
      </div>
    </div>
    <ErrorBanner :message="error" retry @retry="load" />
    <q-card flat bordered>
      <q-tabs
        v-model="filter"
        align="left"
        active-color="primary"
        indicator-color="primary"
        class="filter-tabs"
        outside-arrows
        mobile-arrows>
        <q-tab name="all" :label="$t('orders.all') + ' (' + rows.length + ')'" />
        <q-tab
          v-for="s in statuses"
          :key="s.value"
          :name="s.value"
          :label="$t(s.label) + ' (' + rows.filter(r => r.status === s.value).length + ')'" />
      </q-tabs>
      <q-table
        flat
        :rows="filtered"
        :columns="columns"
        row-key="id"
        :filter="search"
        :loading="loading"
        :pagination="{ rowsPerPage: 10, sortBy: 'id', descending: true }"
        @row-click="(_, row) => router.push('/servisi/' + row.id)">
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
            <router-link class="table-title" :to="'/servisi/' + p.row.id">{{ orderNumber(p.row.id) }}</router-link>
            <div class="table-sub">{{ date(p.row.created_at) }}</div>
          </q-td>
        </template>
        <template #body-cell-equipment="p">
          <q-td :props="p">
            <div v-if="p.row.equipment_count || p.row.equipment_id" class="table-title">
              {{ p.row.equipment_label || [p.row.manufacturer, p.row.model, p.row.size].filter(Boolean).join(' ') }}
            </div>
            <div v-else class="table-title">{{ $t('equipment.unassigned') }}</div>
            <div class="table-sub">{{ p.row.customer_name || $t('customers.unassigned') }}</div>
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
          <q-td :props="p">
            <q-btn flat round dense icon="arrow_forward" :to="'/servisi/' + p.row.id" :aria-label="$t('orders.open')" />
          </q-td>
        </template>
        <template #no-data>
          <div class="empty full-width">
            <q-icon name="build_circle" size="42px" />
            <strong>{{ $t(search || filter !== 'all' ? 'common.noResults' : 'orders.emptyTitle') }}</strong>
            {{ $t('orders.emptyHint') }}
          </div>
        </template>
      </q-table>
    </q-card>
  </q-page>
</template>
<script setup>
  import { computed, onMounted, ref } from 'vue'
  import { useRouter } from 'vue-router'
  import { api, date, orderNumber, session, statuses } from '../services/api'
  import { t } from '../i18n'
  import ErrorBanner from '../components/ErrorBanner.vue'
  import StatusBadge from '../components/StatusBadge.vue'
  const rows = ref([]),
    search = ref(''),
    filter = ref('all'),
    loading = ref(false),
    error = ref(''),
    router = useRouter()
  const filtered = computed(() => rows.value.filter(r => filter.value === 'all' || r.status === filter.value))
  const stats = computed(() => [
    { label: 'orders.all', icon: 'inventory_2', count: rows.value.length },
    {
      label: 'statuses.awaitingArrival',
      icon: 'schedule',
      count: rows.value.filter(r => r.status === 'submitted').length
    },
    {
      label: 'statuses.inService',
      icon: 'build',
      count: rows.value.filter(r => r.status === 'in_service').length
    },
    {
      label: 'statuses.completedServices',
      icon: 'task_alt',
      count: rows.value.filter(r => r.status === 'completed').length
    }
  ])
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
  async function load() {
    loading.value = true
    error.value = ''
    try {
      rows.value = await api('orders')
    } catch (e) {
      error.value = e.message
    } finally {
      loading.value = false
    }
  }
  onMounted(load)
</script>
