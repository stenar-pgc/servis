<template>
  <q-page class="page">
    <div class="page-heading">
      <div>
        <div class="eyebrow">{{ $t('equipment.eyebrow') }}</div>
        <h1>{{ $t(session.user.admin ? 'equipment.register' : 'equipment.mine') }}</h1>
        <p>{{ $t('equipment.subtitle') }}</p>
      </div>
      <q-btn unelevated no-caps color="primary" icon="add" :label="$t('equipment.new')" @click="edit(null)" />
    </div>
    <ErrorBanner :message="error" retry @retry="load" />
    <q-table
      flat
      bordered
      :rows="rows"
      :columns="columns"
      :filter="search"
      row-key="id"
      :loading="loading"
      :pagination="{ rowsPerPage: 10 }">
      <template #top>
        <q-input outlined dense v-model="search" :placeholder="$t('equipment.search')" class="search-field" clearable>
          <template #prepend><q-icon name="search" /></template>
        </q-input>
        <q-space />
        <span class="text-caption text-grey-6">{{ rows.length }} {{ $t('equipment.itemCount') }}</span>
      </template>
      <template #body-cell-model="p">
        <q-td :props="p">
          <q-btn
            flat
            no-caps
            dense
            color="primary"
            :label="p.row.manufacturer + ' ' + p.row.model"
            @click="edit(p.row)" />
          <div class="table-sub">{{ translateText(p.row.type) }} · {{ p.row.size || '—' }}</div>
        </q-td>
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
        <q-td :props="p">
          <q-btn flat round dense icon="edit" :aria-label="$t('equipment.edit')" @click="edit(p.row)" />
          <q-btn
            flat
            round
            dense
            color="primary"
            icon="add_circle_outline"
            :to="{ path: '/servisi/novo', query: { equipment: p.row.id } }"
            :aria-label="$t('orders.new')" />
        </q-td>
      </template>
      <template #no-data>
        <div class="empty full-width">
          <q-icon name="paragliding" size="42px" />
          <strong>{{ $t('equipment.emptyTitle') }}</strong>
          {{ $t('equipment.emptyHint') }}
        </div>
      </template>
    </q-table>
    <EquipmentEditor v-model="editor" :equipment="selected" :customers="customers" @saved="load" />
  </q-page>
</template>
<script setup>
  import { computed, onMounted, ref } from 'vue'
  import { api, date, inspectionState, session } from '../services/api'
  import { t, translateText } from '../i18n'
  import EquipmentEditor from '../components/EquipmentEditor.vue'
  import ErrorBanner from '../components/ErrorBanner.vue'
  const rows = ref([]),
    customers = ref([]),
    search = ref(''),
    editor = ref(false),
    selected = ref(null),
    loading = ref(false),
    error = ref(''),
    today = new Date().toISOString().slice(0, 10)
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
