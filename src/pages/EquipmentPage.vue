<template>
  <q-page class="page">
    <div class="page-heading">
      <div>

        <h1>{{ $t(session.user.admin ? 'equipment.register' : 'equipment.mine') }}</h1>
        <p>{{ $t('equipment.subtitle') }}</p>
      </div>
      <q-btn unelevated no-caps color="primary" icon="add" :label="$t('equipment.new')" @click="edit(null)" />
    </div>
    <ErrorBanner :message="error" retry @retry="load" />
    <RelatedRecordsBar :customer-id="customerId" :customer-name="customerName" :equipment-id="equipmentId" :equipment="selectedEquipment" />
    <q-table
      flat
      bordered
      :rows="scopedRows"
      :columns="columns"
      :filter="search"
      row-key="id"
      :loading="loading"
      :pagination="{ rowsPerPage: 10 }"
      @row-click="openServices">
      <template #top>
        <q-input outlined dense v-model="search" :placeholder="$t('equipment.search')" class="search-field" clearable>
          <template #prepend><q-icon name="search" /></template>
        </q-input>
        <q-space />
        <span class="text-caption text-grey-6">{{ scopedRows.length }} {{ $t('equipment.itemCount') }}</span>
      </template>
      <template #body-cell-model="p">
        <q-td :props="p">
          <router-link class="table-title" :to="{ path: '/servisi', query: { equipment: p.row.id } }" @click.stop>{{ equipmentLabel(p.row) || $t('equipment.title') }}</router-link>
          <div class="table-sub">{{ translateText(p.row.type) }} · {{ p.row.size || '—' }}</div>
        </q-td>
      </template>
      <template #body-cell-owner="p">
        <q-td :props="p"><router-link v-if="p.row.customer_id != null" :to="{ path: '/servisi', query: { customer: p.row.customer_id } }" @click.stop>{{ p.row.customer_name }}</router-link><span v-else>{{ $t('equipment.noOwner') }}</span></q-td>
      </template>
      <template #body-cell-count="p">
        <q-td :props="p"><router-link :to="{ path: '/servisi', query: { equipment: p.row.id } }" @click.stop>{{ p.row.service_count || 0 }}</router-link></q-td>
      </template>
      <template #body-cell-valid="p">
        <q-td :props="p">
          <div>{{ date(p.row.valid_until) }}</div>
          <q-badge
            v-if="p.row.valid_until"
            rounded
            :color="inspectionState(p.row.valid_until).color"
            :text-color="inspectionState(p.row.valid_until).text">
            {{ $t(inspectionState(p.row.valid_until).label) }}
          </q-badge>
        </q-td>
      </template>
      <template #body-cell-action="p">
        <q-td :props="p" @click.stop>
          <q-btn flat round dense icon="edit" :aria-label="$t('equipment.edit')" @click="edit(p.row)">
            <q-tooltip>{{ $t('equipment.edit') }}</q-tooltip>
          </q-btn>
          <q-btn
            flat
            round
            dense
            color="primary"
            icon="add_circle_outline"
            :to="{ path: '/servisi/novo', query: { equipment: p.row.id } }"
            :aria-label="$t('orders.new')">
            <q-tooltip>{{ $t('orders.new') }}</q-tooltip>
          </q-btn>
          <q-btn v-if="session.user.admin" flat round dense color="negative" icon="delete_outline" :aria-label="$t('equipment.delete')" :disable="deleting" @click="removeEquipment(p.row)">
            <q-tooltip>{{ $t('equipment.delete') }}</q-tooltip>
          </q-btn>
        </q-td>
      </template>
      <template #no-data>
        <div class="empty full-width">
          <q-icon name="paragliding" size="42px" />
          <strong>{{ $t(customerId || equipmentId ? 'common.noRecords' : 'equipment.emptyTitle') }}</strong>
          {{ $t('equipment.emptyHint') }}
        </div>
      </template>
    </q-table>
    <EquipmentEditor v-model="editor" :equipment="selected" :customers="customers" @saved="load" />
  </q-page>
</template>
<script setup>
  import { computed, onMounted, ref, watch } from 'vue'
  import { useRoute, useRouter } from 'vue-router'
  import { sameId, equipmentLabel, isRowNavigation } from '../services/records'
  import RelatedRecordsBar from '../components/RelatedRecordsBar.vue'
  import { useQuasar } from 'quasar'
  import { confirmDeletion } from '../services/deletion'
  import { api, date, inspectionState, session } from '../services/api'
  import { t, translateText } from '../i18n'
  import EquipmentEditor from '../components/EquipmentEditor.vue'
  import ErrorBanner from '../components/ErrorBanner.vue'
  const q = useQuasar(), route = useRoute(), router = useRouter()
  const deleting = ref(false)
  function removeEquipment(row) {
    confirmDeletion(q, {
      title: t('equipment.delete'),
      message: t('equipment.deleteConfirm', { name: [row.manufacturer, row.model, row.serial].filter(Boolean).join(' · ') || t('equipment.title') }),
      action: () => api('deleteequipment', { id: row.id }),
      onDeleted: load,
      onError: message => { error.value = message },
      busy: deleting
    })
  }
  const rows = ref([]),
    customers = ref([]),
    search = ref(''),
    editor = ref(false),
    selected = ref(null),
    loading = ref(false),
    error = ref(''),
    today = new Date().toISOString().slice(0, 10)
  const customerId = computed(() => String(route.query.customer || ''))
  const equipmentId = computed(() => String(route.query.equipment || ''))
  const customerName = computed(() => customers.value.find(row => sameId(row.id, customerId.value))?.name || rows.value.find(row => sameId(row.customer_id, customerId.value))?.customer_name || '')
  const selectedEquipment = computed(() => rows.value.find(row => sameId(row.id, equipmentId.value)) || null)
  const scopedRows = computed(() => rows.value.filter(row => (!customerId.value || sameId(row.customer_id, customerId.value)) && (!equipmentId.value || sameId(row.id, equipmentId.value))))
  function openServices(event, row) {
    if (isRowNavigation(event)) router.push({ path: '/servisi', query: { equipment: row.id } })
  }
  watch(() => [route.query.customer, route.query.equipment], () => { search.value = '' })
  const columns = computed(() => [
    {
      name: 'model',
      field: r => `${r.manufacturer} ${r.model}`,
      label: t('equipment.title'),
      align: 'left',
      sortable: true
    },
    { name: 'serial', field: 'serial', label: t('equipment.serial'), align: 'left' },
    ...(session.user.admin
      ? [
          {
            name: 'owner',
            field: row => row.customer_name || t('equipment.noOwner'),
            label: t('equipment.owner'),
            align: 'left'
          }
        ]
      : []),
    {
      name: 'valid',
      field: 'valid_until',
      label: t('equipment.nextInspection'),
      align: 'left',
      sortable: true
    },
    { name: 'count', field: 'service_count', label: t('services.title'), align: 'center' },
    { name: 'action', field: 'id', label: '' }
  ])
  function edit(row) {
    selected.value = row
    editor.value = true
  }
  async function load() {
    loading.value = true
    error.value = ''
    try {
      const result = await Promise.all([api('equipment'), session.user.admin ? api('customers') : []])
      rows.value = result[0]
      customers.value = result[1]
    } catch (e) {
      error.value = e.message
    } finally {
      loading.value = false
    }
  }
  onMounted(load)
</script>
