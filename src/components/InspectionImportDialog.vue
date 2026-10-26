<template>
  <q-dialog :model-value="true" persistent @hide="$emit('close')">
    <q-card class="inspection-import">
      <q-toolbar><q-toolbar-title>{{ $t('inspection.importTitle') }}</q-toolbar-title><q-btn flat round icon="close" :disable="busy" :aria-label="$t('common.close')" @click="$emit('close')" /></q-toolbar>
      <q-card-section class="q-pt-none">
        <p>{{ equipment.manufacturer }} {{ equipment.model }} {{ equipment.size }} · {{ equipment.serial || '—' }}</p>
        <div class="import-drop q-pa-lg q-mb-md" @dragover.prevent @drop.prevent="drop">
          <q-icon name="upload_file" size="36px" color="primary" />
          <p>{{ $t('inspection.dropExcel') }}</p>
          <q-file v-model="file" outlined accept=".xlsx" :disable="busy" :label="$t('inspection.excelFile')" @update:model-value="reset"><template #prepend><q-icon name="table_view" /></template></q-file>
        </div>
        <ErrorBanner :message="error" />
        <q-btn v-if="!preview" color="primary" no-caps :label="$t('inspection.reviewImport')" :loading="busy" :disable="!file" @click="review" />
        <template v-else>
          <q-banner rounded class="bg-blue-1 q-mb-md">{{ $t('inspection.importSummary', { sheets: preview.sheet_count, values: preview.populated_count }) }}</q-banner>
          <div class="row q-col-gutter-md q-mb-md"><div class="col-6"><strong>{{ $t('inspection.inspectionDate') }}</strong><div>{{ preview.values['Vnos podatkov!B1'] }}</div></div><div class="col-6"><strong>{{ $t('inspection.referenceNumber') }}</strong><div>{{ preview.values['Vnos podatkov!B3'] }}</div></div></div>
          <q-markup-table v-if="preview.conflicts.length" flat bordered wrap-cells class="q-mb-md">
            <thead><tr><th>{{ $t('inspection.field') }}</th><th>{{ $t('inspection.current') }}</th><th>{{ $t('inspection.inExcel') }}</th></tr></thead>
            <tbody><tr v-for="c in preview.conflicts" :key="c.field"><td>{{ $t('inspection.meta.' + c.field) }}</td><td>{{ c.current || '—' }}</td><td>{{ c.incoming || '—' }}</td></tr></tbody>
          </q-markup-table>
          <q-checkbox v-model="replaceEquipment" :label="$t('inspection.replaceEquipment')" :disable="busy" />
          <p class="text-caption text-grey-8">{{ $t('inspection.identityNotice') }}</p>
          <q-banner v-if="preview.inspection_id" class="bg-orange-1 q-mb-sm">{{ $t('inspection.replaceReadings') }}</q-banner>
          <q-banner v-for="warning in preview.warnings" :key="warning.code" class="bg-orange-1 q-mb-sm">{{ $t('inspection.' + warning.code, { count: warning.count }) }}<div v-if="warning.cells" class="text-caption">{{ warning.cells.join(', ') }}</div></q-banner>
          <q-expansion-item :label="$t('inspection.readings')" icon="straighten" class="q-mb-md">
            <div class="import-readings"><table><thead><tr><th>{{ $t('inspection.field') }}</th><th>{{ $t('inspection.inExcel') }}</th></tr></thead><tbody><tr v-for="[key, value] in populated" :key="key"><td>{{ key }}</td><td>{{ value }}</td></tr></tbody></table></div>
          </q-expansion-item>
          <div class="row q-gutter-sm"><q-btn color="primary" no-caps icon="file_download" :label="$t('inspection.confirmImport')" :loading="busy" @click="apply" /><q-btn flat no-caps :label="$t('inspection.chooseAnother')" :disable="busy" @click="reset" /></div>
        </template>
      </q-card-section>
    </q-card>
  </q-dialog>
</template>
<script setup>
import { computed, ref } from 'vue'
import { useQuasar } from 'quasar'
import { api } from '../services/api'
import { t } from '../i18n'
import ErrorBanner from './ErrorBanner.vue'
const props = defineProps({ orderId: { type: [Number, String], required: true }, equipment: { type: Object, required: true } })
const emit = defineEmits(['close', 'imported'])
const q = useQuasar(), file = ref(null), preview = ref(null), busy = ref(false), error = ref(''), replaceEquipment = ref(false)
let encoded = ''
const populated = computed(() => Object.entries(preview.value?.values || {}).filter(([, v]) => v !== null && v !== ''))
function reset() { preview.value = null; error.value = ''; encoded = ''; replaceEquipment.value = false }
function drop(event) { if (busy.value) return; file.value = event.dataTransfer.files[0] || null; reset() }
async function review() {
  if (!file.value || !/\.xlsx$/i.test(file.value.name) || file.value.size > 10 * 1024 * 1024) { error.value = t('inspection.invalidFile'); return }
  busy.value = true; error.value = ''
  try {
    encoded = await new Promise((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(reader.result.split(',')[1]); reader.onerror = reject; reader.readAsDataURL(file.value) })
    preview.value = await api('inspectionimport', { order_id: props.orderId, equipment_id: props.equipment.id, filename: file.value.name, content: encoded })
  } catch (e) { error.value = e.message || t('inspection.invalidFile') } finally { busy.value = false }
}
async function apply() {
  busy.value = true; error.value = ''
  try {
    const result = await api('inspectionimport', { order_id: props.orderId, equipment_id: props.equipment.id, filename: file.value.name, content: encoded, apply: true, sha256: preview.value.sha256, revision: preview.value.revision, equipment_update: replaceEquipment.value ? 'replace' : 'keep' })
    q.notify({ type: 'positive', message: t(result.already_imported ? 'inspection.alreadyImported' : 'inspection.imported') })
    emit('imported'); emit('close')
  } catch (e) { error.value = e.message } finally { busy.value = false }
}
</script>
<style scoped>
.inspection-import { width: 850px; max-width: 96vw; }
.import-drop { border: 2px dashed #039acc; border-radius: 12px; text-align: center; background: #f4fbfd; }
.import-readings { max-height: 350px; overflow: auto; }
.import-readings table { width: 100%; border-collapse: collapse; }
.import-readings td,.import-readings th { text-align: left; padding: 5px 10px; border-bottom: 1px solid #ddd; overflow-wrap: anywhere; }
</style>
