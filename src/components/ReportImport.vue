<template>
  <div
    class="report-import-drop"
    :class="{ 'report-import-drop--active': dragging, 'report-import-drop--disabled': disabled }"
    @dragover.prevent="dragging = !disabled"
    @dragleave="dragging = false"
    @drop.prevent="drop">
    <q-icon name="upload_file" size="32px" color="primary" />
    <div class="text-weight-medium q-mt-sm">{{ $t('import.dropTitle') }}</div>
    <div class="text-caption text-grey-7 q-mb-md">{{ $t(disabled ? 'import.saveFirst' : 'import.dropHint') }}</div>
    <q-btn outline no-caps color="primary" icon="folder_open" :label="$t('import.choose')" :disable="disabled" @click="picker.click()" />
    <input ref="picker" type="file" multiple accept=".xlsx,.pdf" hidden @change="choose" />
  </div>
  <q-dialog v-model="open" :persistent="busy" :maximized="$q.screen.lt.sm" @hide="reset">
    <q-card class="report-import">
      <q-card-section class="row items-center no-wrap">
        <h2>{{ $t('import.title') }}</h2>
        <q-space />
        <q-btn flat round dense icon="close" :disable="busy" :aria-label="$t('common.close')" v-close-popup />
      </q-card-section>
      <q-separator />
      <q-card-section class="report-import-body">
        <div v-if="reading" class="row items-center q-gutter-sm q-mb-md text-grey-8">
          <q-spinner color="primary" size="20px" />
          <span>{{ $t('import.reading', { done: entries.filter(entry => entry.status !== 'reading').length, total: entries.length }) }}</span>
        </div>
        <div v-for="entry in failed" :key="entry.key" class="row items-center no-wrap q-mb-sm text-negative">
          <q-icon name="error_outline" class="q-mr-sm" />
          <span class="col ellipsis">{{ entry.name }}: {{ entry.error }}</span>
        </div>
        <q-card v-for="group in groups" :key="group.id" flat bordered class="import-group q-mb-md">
          <q-card-section>
            <div class="row items-start no-wrap q-mb-sm">
              <div class="col">
                <strong>{{ equipmentName(group.identity) || $t('import.unknown') }}</strong>
                <div class="text-caption text-grey-7">
                  {{ translateText(group.identity.type) }} · {{ group.identity.serial || '—' }}
                </div>
              </div>
              <q-badge :color="badge(group).color" :text-color="badge(group).text" class="q-ml-sm">{{ badge(group).label }}</q-badge>
            </div>
            <q-select
              outlined
              dense
              v-model="group.target"
              :options="targetOptions(group)"
              emit-value
              map-options
              use-input
              :input-debounce="0"
              :disable="busy || group.done"
              :label="$t('import.target')"
              @filter="(value, update) => update(() => (group.filter = value))">
              <template #option="scope">
                <q-item v-bind="scope.itemProps">
                  <q-item-section>
                    <q-item-label>{{ scope.opt.label }}</q-item-label>
                    <q-item-label v-if="scope.opt.caption" caption>{{ scope.opt.caption }}</q-item-label>
                  </q-item-section>
                </q-item>
              </template>
            </q-select>
            <div v-if="group.target === 'new' && !group.done" class="form-grid q-mt-md">
              <q-select
                outlined
                dense
                v-model="group.identity.type"
                :options="equipmentTypes"
                :display-value="translateText(group.identity.type)"
                :disable="busy || group.files.some(entry => entry.result.kind === 'workbook')"
                :label="$t('equipment.type')"
                class="wide">
                <template #option="scope">
                  <q-item v-bind="scope.itemProps">
                    <q-item-section>{{ translateText(scope.opt) }}</q-item-section>
                  </q-item>
                </template>
              </q-select>
              <q-input outlined dense v-model="group.identity.manufacturer" :disable="busy" :label="$t('equipment.manufacturer')" />
              <q-input outlined dense v-model="group.identity.model" :disable="busy" :label="$t('equipment.model')" />
              <q-input outlined dense v-model="group.identity.size" :disable="busy" :label="$t('equipment.size')" />
              <q-input outlined dense v-model="group.identity.serial" :disable="busy" :label="$t('equipment.serial')" />
            </div>
            <template v-else-if="targetItem(group) && !group.done">
              <div v-if="filledFields(group).length" class="text-caption q-mt-sm">
                {{ $t('import.fills', { fields: filledFields(group).join(', ') }) }}
              </div>
              <div v-for="difference in differences(group)" :key="difference.field" class="text-caption text-orange-9 q-mt-xs">
                {{ $t('import.difference', difference) }}
              </div>
            </template>
            <q-list dense class="q-mt-sm">
              <q-item v-for="entry in group.files" :key="entry.key" class="import-file">
                <q-item-section avatar>
                  <q-icon :name="entry.result.kind === 'workbook' ? 'table_view' : 'picture_as_pdf'" color="grey-7" />
                </q-item-section>
                <q-item-section>
                  <q-item-label class="ellipsis">{{ entry.name }}</q-item-label>
                  <q-item-label caption>
                    {{ $t('import.kind.' + entry.result.kind) }}<template v-if="entry.result.reference"> · {{ entry.result.reference }}</template>
                    <template v-if="entry.result.inspection_date"> · {{ date(entry.result.inspection_date) }}</template>
                  </q-item-label>
                  <q-item-label v-if="entry.error" caption class="text-negative">{{ entry.error }}</q-item-label>
                </q-item-section>
                <q-item-section side>
                  <q-spinner v-if="entry.status === 'importing'" color="primary" size="20px" />
                  <q-icon v-else-if="entry.status === 'done'" name="check_circle" color="positive" size="20px">
                    <q-tooltip>{{ $t('import.done') }}</q-tooltip>
                  </q-icon>
                  <q-icon v-else-if="entry.status === 'error'" name="error_outline" color="negative" size="20px" />
                  <q-badge v-else-if="entry.result.duplicate" color="grey-3" text-color="grey-8">{{ $t('import.duplicate') }}</q-badge>
                </q-item-section>
              </q-item>
            </q-list>
          </q-card-section>
        </q-card>
        <div v-if="!reading && !groups.length && !failed.length" class="text-grey-7">{{ $t('import.empty') }}</div>
      </q-card-section>
      <q-separator />
      <q-card-actions align="right" class="q-pa-md">
        <q-btn flat no-caps :label="$t('import.addFiles')" icon="add" :disable="busy" @click="picker.click()" />
        <q-space />
        <q-btn flat no-caps :label="$t('common.cancel')" :disable="busy" v-close-popup />
        <q-btn
          unelevated
          no-caps
          color="primary"
          icon="file_download"
          :label="$t('import.confirm', { count: pending.length })"
          :loading="busy"
          :disable="reading || !pending.length"
          @click="apply" />
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>
<script setup>
  import { computed, reactive, ref } from 'vue'
  import { useQuasar } from 'quasar'
  import { api, date, equipmentTypes } from '../services/api'
  import { t, translateText } from '../i18n'
  import { canonicalBrand, equipmentName, matchEquipment, normalize, searchEquipment, splitModel } from '../services/equipment-match'

  const props = defineProps({
    orderId: [Number, String],
    equipment: { type: Array, default: () => [] },
    orderEquipmentIds: { type: Array, default: () => [] },
    customerId: [Number, String],
    disabled: Boolean
  })
  const emit = defineEmits(['imported'])
  const $q = useQuasar()
  const picker = ref(null),
    dragging = ref(false),
    open = ref(false),
    busy = ref(false),
    entries = ref([]),
    groups = ref([])
  const fields = ['type', 'manufacturer', 'model', 'size', 'serial', 'certification', 'manufactured']
  const reading = computed(() => entries.value.some(entry => entry.status === 'reading'))
  const failed = computed(() => entries.value.filter(entry => !entry.result && entry.status === 'error'))
  const pending = computed(() =>
    groups.value.filter(group => group.target !== 'skip').flatMap(group => group.files.filter(entry => entry.status !== 'done'))
  )
  let counter = 0

  function choose(event) {
    add([...event.target.files])
    event.target.value = ''
  }
  function drop(event) {
    dragging.value = false
    if (!props.disabled) add([...event.dataTransfer.files])
  }
  function reset() {
    if (busy.value) return
    entries.value = []
    groups.value = []
  }

  const encode = file =>
    new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(reader.result.split(',')[1])
      reader.onerror = reject
      reader.readAsDataURL(file)
    })

  async function add(files) {
    if (!files.length) return
    open.value = true
    const added = files.map(file => reactive({ key: ++counter, file, name: file.name, status: 'reading', result: null, error: '' }))
    entries.value.push(...added)
    for (const entry of added) {
      try {
        if (!/\.(xlsx|pdf)$/i.test(entry.name) || entry.file.size > 10 * 1024 * 1024) throw new Error(t('import.invalidFile'))
        entry.content = await encode(entry.file)
        const result = await api('reportimport', { order_id: props.orderId, filename: entry.name, content: entry.content })
        const identity = { type: '', manufacturer: '', model: '', size: '', serial: '', certification: '', manufactured: '', ...result.identity }
        if (!identity.manufacturer && identity.model_full) Object.assign(identity, splitModel(identity.model_full, props.equipment))
        delete identity.model_full
        identity.manufacturer = canonicalBrand(identity.manufacturer, props.equipment)
        entry.result = { ...result, identity }
        entry.status = 'ready'
      } catch (e) {
        entry.status = 'error'
        entry.error = e.message
      }
    }
    if (!reading.value) buildGroups()
  }

  // Files of one equipment item share a report reference (e.g. 26-P241 in the workbook and its PDFs) or a serial.
  function keysOf(entry) {
    const { identity, reference } = entry.result
    const keys = []
    if (reference) keys.push('ref:' + reference.toUpperCase())
    if (normalize(identity.serial)) keys.push('serial:' + normalize(identity.serial))
    if (!keys.length && normalize(identity.model))
      keys.push('model:' + [identity.manufacturer, identity.model, identity.size].map(normalize).join('|'))
    return keys.length ? keys : ['file:' + entry.key]
  }

  function buildGroups() {
    const previous = groups.value
    const result = []
    for (const entry of entries.value.filter(entry => entry.result)) {
      const keys = new Set(keysOf(entry))
      const joined = result.filter(group => [...keys].some(key => group.keys.has(key)))
      const group = joined[0] || { keys: new Set(), files: [] }
      for (const other of joined.slice(1)) {
        other.keys.forEach(key => group.keys.add(key))
        group.files.push(...other.files)
        result.splice(result.indexOf(other), 1)
      }
      keys.forEach(key => group.keys.add(key))
      group.files.push(entry)
      if (!joined.length) result.push(group)
    }
    groups.value = result.map((group, index) => {
      const order = { workbook: 0, reserve: 1, report: 2 }
      group.files.sort((a, b) => order[a.result.kind] - order[b.result.kind])
      const identity = {}
      for (const field of fields) identity[field] = group.files.map(entry => entry.result.identity[field]).find(value => value) || ''
      if (!identity.type) identity.type = 'Jadralno padalo'
      const match = matchEquipment(identity, props.equipment, { orderIds: props.orderEquipmentIds, customerId: props.customerId })
      const known = previous.find(old => old.chosen && [...old.keys].some(key => group.keys.has(key)))
      const recognized = normalize(identity.model) || normalize(identity.serial)
      return reactive({
        id: index + '-' + [...group.keys][0],
        keys: group.keys,
        files: group.files,
        identity: known?.target === 'new' ? known.identity : identity,
        match,
        target: known ? known.target : match ? Number(match.item.id) : recognized ? 'new' : 'skip',
        chosen: !!known,
        filter: '',
        done: false
      })
    })
  }

  const label = item => equipmentName(item) || translateText(item.type)
  const option = item => ({
    value: Number(item.id),
    label: label(item),
    caption: [item.serial, item.customer_name || t('equipment.noOwner')].filter(Boolean).join(' · ')
  })
  function targetOptions(group) {
    const items = group.filter
      ? searchEquipment(group.filter, props.equipment, 30)
      : [
          group.match?.item,
          ...props.equipment.filter(item => props.orderEquipmentIds.map(Number).includes(Number(item.id)))
        ].filter(Boolean)
    const unique = [...new Map(items.map(item => [Number(item.id), item])).values()]
    const current = typeof group.target === 'number' && !unique.some(item => Number(item.id) === group.target) && targetItem(group)
    return [
      { value: 'new', label: t('import.createNew'), caption: equipmentName(group.identity) },
      { value: 'skip', label: t('import.skip') },
      ...(current ? [current] : []),
      ...unique
    ].map(item => (item.id ? option(item) : item))
  }
  const targetItem = group =>
    typeof group.target === 'number' ? props.equipment.find(item => Number(item.id) === group.target) : null

  function badge(group) {
    if (group.target === 'skip') return { color: 'grey-3', text: 'grey-8', label: t('import.status.skip') }
    if (group.target === 'new') return { color: 'orange-1', text: 'orange-9', label: t('import.status.new') }
    if (group.match && Number(group.match.item.id) === group.target)
      return { color: 'teal-1', text: 'primary', label: t('import.status.' + group.match.reason) }
    return { color: 'teal-1', text: 'primary', label: t('import.status.chosen') }
  }

  const fieldLabel = field => t({ manufactured: 'inspection.meta.manufactured', certification: 'inspection.meta.certification' }[field] || 'equipment.' + field)
  const filledFields = group => {
    const item = targetItem(group)
    return fields.filter(field => field !== 'type' && !String(item[field] || '').trim() && group.identity[field]).map(fieldLabel)
  }
  function differences(group) {
    const item = targetItem(group)
    return ['manufacturer', 'model', 'size', 'serial']
      .filter(field => {
        const [current, incoming] = [item[field], group.identity[field]].map(value =>
          normalize(field === 'manufacturer' ? canonicalBrand(value, props.equipment) : value)
        )
        return current && incoming && current !== incoming
      })
      .map(field => ({ field: fieldLabel(field), current: item[field], incoming: group.identity[field] }))
  }

  // Files are imported one by one; the first file of a new item creates it and the rest attach to it.
  async function apply() {
    busy.value = true
    const imported = new Set()
    for (const group of groups.value.filter(group => group.target !== 'skip')) {
      for (const entry of group.files.filter(entry => entry.status !== 'done')) {
        entry.status = 'importing'
        entry.error = ''
        try {
          const result = await api('reportimport', {
            order_id: props.orderId,
            filename: entry.name,
            content: entry.content,
            sha256: entry.result.sha256,
            apply: true,
            equipment_id: group.target === 'new' ? null : group.target,
            equipment: group.identity
          })
          group.target = Number(result.equipment_id)
          group.chosen = true
          imported.add(group.target)
          entry.status = 'done'
        } catch (e) {
          entry.status = 'error'
          entry.error = e.message
          break
        }
      }
      group.done = group.files.every(entry => entry.status === 'done')
    }
    busy.value = false
    if (imported.size) emit('imported', [...imported])
    if (groups.value.every(group => group.target === 'skip' || group.done) && !failed.value.length) {
      $q.notify({ type: 'positive', message: t('import.finished') })
      open.value = false
    }
  }
</script>
<style scoped>
  .report-import-drop {
    border: 2px dashed #039acc;
    border-radius: 12px;
    background: #f4fbfd;
    padding: 20px 16px;
    text-align: center;
    transition: background 0.15s;
  }
  .report-import-drop--active {
    background: #e1f4fa;
  }
  .report-import-drop--disabled {
    border-color: #c8d3d8;
    background: #f7f9fa;
  }
  .report-import {
    width: 860px;
    max-width: 96vw;
  }
  .report-import-body {
    max-height: 70vh;
    overflow: auto;
  }
  .import-file {
    padding-left: 0;
    padding-right: 0;
  }
</style>
