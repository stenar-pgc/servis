<template>
  <q-page class="page inspection-page">
    <div class="page-heading"><div><q-btn flat dense no-caps icon="arrow_back" :label="$t('inspection.backToOrder')" :to="'/servisi/' + route.params.id" /><h1>{{ $t('inspection.title') }}</h1><p v-if="values">{{ values['Vnos podatkov!B5'] }} {{ values['Vnos podatkov!B6'] }} {{ values['Vnos podatkov!B7'] }} · {{ values['Vnos podatkov!B9'] }}</p></div><q-btn v-if="gear" :disable="dirty" outline no-caps icon="table_view" :label="$t('inspection.importTitle')" @click="importOpen = true" /></div>
    <ErrorBanner :message="error" retry @retry="load" />
    <q-inner-loading :showing="loading" />
    <template v-if="values">
      <q-banner v-if="!inspection" class="bg-blue-1 q-mb-lg">{{ $t('inspection.noMeasurements') }}</q-banner>
      <div class="row q-gutter-md items-center q-mb-lg"><q-btn-toggle v-model="layout" no-caps outline :options="[{label: 'A–E / Br', value: 'standard'}, {label: 'A–F / Br', value: 'F'}]" /><span>{{ values['Vnos podatkov!B1'] }} · {{ $t('inspection.referenceNumber') }} {{ values['Vnos podatkov!B3'] || '—' }}</span></div>
      <div class="row q-gutter-md items-center q-mb-md">
        <q-tabs v-model="tab" no-caps><q-tab name="charts" :label="$t('inspection.visualizations')" /><q-tab name="edit" :label="$t('inspection.editMeasurements')" /></q-tabs>
        <q-btn color="primary" no-caps icon="save" :label="$t('inspection.save')" :loading="saving" :disable="!dirty" @click="save" />
        <span v-if="dirty" class="text-orange-9">{{ $t('inspection.unsaved') }}</span>
      </div>
      <section v-if="tab === 'edit'" class="section-card"><InspectionEditor :values="values" :layout="layout" @update="update" /></section>
      <section v-else class="section-card"><InspectionCharts :values="values" :layout="layout" /></section>
      <section class="section-card q-mt-lg">
        <h2>{{ $t('inspection.pdfReport') }}</h2>
        <q-select v-model="reportSheet" outlined :options="reportOptions" :label="$t('inspection.reportTemplate')" class="q-mb-md" />
        <q-banner class="bg-blue-1 q-mb-md">{{ $t('inspection.pdfReviewNotice') }}</q-banner>
        <div class="row q-gutter-sm"><q-btn outline no-caps icon="preview" :label="$t('inspection.previewPdf')" :disable="dirty || !inspection" :loading="rendering" @click="pdf(false)" /><q-btn color="primary" no-caps icon="attach_file" :label="$t('inspection.attachPdf')" :disable="dirty || !inspection || !pdfUrl" :loading="rendering" @click="pdf(true)" /></div>
        <iframe v-if="pdfUrl" :src="pdfUrl" :title="$t('inspection.pdfReport')" style="width:100%;height:75vh;border:0;margin-top:20px" />
      </section>
    </template>
    <InspectionImportDialog v-if="importOpen && gear" :order-id="route.params.id" :equipment="gear" @close="importOpen = false" @imported="load" />
  </q-page>
</template>
<script setup>
import { ref, onMounted, onBeforeUnmount, computed, watch } from 'vue'
import { useQuasar } from 'quasar'
import { useRoute, onBeforeRouteLeave } from 'vue-router'
import { api, API_URL } from '../services/api'
import ErrorBanner from '../components/ErrorBanner.vue'
import InspectionEditor from '../components/InspectionEditor.vue'
import template from '../assets/inspection-template.json'
import { t } from '../i18n'
import InspectionCharts from '../components/InspectionCharts.vue'
import InspectionImportDialog from '../components/InspectionImportDialog.vue'
const route = useRoute(), loading = ref(false), error = ref(''), values = ref(null), inspection = ref(null), layout = ref('standard'), gear = ref(null), importOpen = ref(false)
const q = useQuasar(), tab = ref('charts'), dirty = ref(false), saving = ref(false), rendering = ref(false), reportSheet = ref('Tehnični pregled & trim'), pdfUrl = ref('')
const reportOptions = computed(() => template.reports.filter(r => !r.legacy && (layout.value === 'F' ? r.sheet.endsWith(' F') : !r.sheet.endsWith(' F'))).map(r => r.sheet))
function clearPdf() { if (pdfUrl.value) URL.revokeObjectURL(pdfUrl.value); pdfUrl.value = '' }
function update(key, value) { values.value[key] = value; dirty.value = true; clearPdf() }
async function save() {
 saving.value = true; error.value = ''
 try { await api('saveinspection', { order_id: Number(route.params.id), equipment_id: Number(route.params.equipmentId), revision: inspection.value?.revision || 0, report_sheet: reportSheet.value, values: values.value, equipment_update: 'replace' }); dirty.value = false; await load(); q.notify({ type: 'positive', message: t('inspection.saved') }) }
 catch(e) { error.value = e.message } finally { saving.value = false }
}
async function pdf(publish) {
 rendering.value = true; error.value = ''
 try {
  const response = await fetch(`${API_URL}/servis/inspectionpdf/`, { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, signal: AbortSignal.timeout(90000), body: JSON.stringify({ order_id: Number(route.params.id), equipment_id: Number(route.params.equipmentId), revision: inspection.value.revision, report_sheet: reportSheet.value, publish }) })
  const result = await response.json(); if (!response.ok || result.error) throw new Error(result.error || t('errors.connection'))
  if (publish) q.notify({ type: 'positive', message: t('inspection.pdfAttached') })
  else { clearPdf(); pdfUrl.value = URL.createObjectURL(new Blob([Uint8Array.from(atob(result.content), c => c.charCodeAt(0))], { type: 'application/pdf' })) }
 } catch(e) { error.value = e.message } finally { rendering.value = false }
}
watch(reportSheet, clearPdf)
watch(layout, () => { if (!reportOptions.value.includes(reportSheet.value)) reportSheet.value = reportOptions.value[0] })
function unload(event) { if (dirty.value) { event.preventDefault(); event.returnValue = '' } }
onBeforeRouteLeave(() => !dirty.value || window.confirm(t('inspection.discardChanges')))
onBeforeUnmount(() => { clearPdf(); window.removeEventListener('beforeunload', unload) })
async function load() {
 loading.value = true; error.value = ''
 try {
  const result = await api('inspection', { order_id: Number(route.params.id), equipment_id: Number(route.params.equipmentId) })
  values.value = result.values; inspection.value = result.inspection; dirty.value = false; clearPdf()
  reportSheet.value = result.inspection?.report_sheet || 'Tehnični pregled & trim'
  layout.value = result.inspection?.report_sheet?.endsWith(' F') ? 'F' : 'standard'
  gear.value = { id: Number(route.params.equipmentId), manufacturer: result.values['Vnos podatkov!B5'], model: result.values['Vnos podatkov!B6'], size: result.values['Vnos podatkov!B7'], serial: result.values['Vnos podatkov!B9'] }
 } catch(e) { error.value = e.message } finally { loading.value = false }
}
onMounted(() => { window.addEventListener('beforeunload', unload); load() })
</script>
