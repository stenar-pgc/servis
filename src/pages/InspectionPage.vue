<template>
  <q-page class="page inspection-page">
    <div class="page-heading"><div><q-btn flat dense no-caps icon="arrow_back" :label="$t('inspection.backToOrder')" :to="'/servisi/' + route.params.id" /><h1>{{ pageTitle }}</h1><p v-if="values">{{ equipmentSummary }}</p></div><q-btn v-if="gear && !isCertificate" :disable="dirty" outline no-caps icon="table_view" :label="$t('inspection.importTitle')" @click="importOpen = true" /></div>
    <ErrorBanner :message="error" retry @retry="load" />
    <q-inner-loading :showing="loading" />
    <template v-if="values">
      <q-banner v-if="!inspection" class="bg-blue-1 q-mb-lg">{{ $t(isCertificate?'certificate.noRecord':'inspection.noMeasurements') }}</q-banner>
      <div v-if="!isCertificate" class="row q-gutter-md items-center q-mb-lg"><q-btn-toggle v-model="layout" no-caps outline :options="[{label: 'A–E / Br', value: 'standard'}, {label: 'A–F / Br', value: 'F'}]" /><span>{{ values['Vnos podatkov!B1'] }} · {{ $t('inspection.referenceNumber') }} {{ values['Vnos podatkov!B3'] || '—' }}</span></div>
      <div v-if="isCertificate" class="row q-gutter-md items-center q-mb-lg"><span>{{ formatDate(values.inspection_date) }}</span><span>{{ $t('inspection.referenceNumber') }} {{ certificateReference }}</span></div>
      <q-banner v-if="sourceDocument" class="bg-blue-1 q-mb-lg">{{ $t('certificate.fromPdf') }} <strong>{{ sourceDocument.filename }}</strong></q-banner>
      <div class="row q-gutter-md items-center q-mb-md">
        <q-tabs v-model="tab" no-caps><q-tab name="charts" :label="$t('inspection.visualizations')" /><q-tab name="edit" :label="$t(isCertificate?'certificate.edit':'inspection.editMeasurements')" /></q-tabs>
        <q-btn color="primary" no-caps icon="save" :label="$t(isCertificate?'certificate.save':'inspection.save')" :loading="saving" :disable="!dirty && !(isCertificate && !inspection)" @click="save" />
        <span v-if="dirty" class="text-orange-9">{{ $t('inspection.unsaved') }}</span>
      </div>
      <InspectionCertificate v-if="isCertificate" :kind="viewKind" :values="values" :editable="tab==='edit'" @update="update" />
      <section v-else-if="tab === 'edit'" class="section-card"><InspectionEditor :values="values" :layout="layout" @update="update" /></section>
      <section v-else-if="!isCertificate" class="section-card"><InspectionCharts :values="values" :layout="layout" /></section>
      <section class="section-card q-mt-lg">
        <h2>{{ $t('inspection.pdfReport') }}</h2>
        <q-select v-model="reportSheet" outlined :options="reportOptions" :emit-value="isCertificate" :map-options="isCertificate" :label="$t('inspection.reportTemplate')" class="q-mb-md" />
        <q-banner class="bg-blue-1 q-mb-md">{{ $t('inspection.pdfReviewNotice') }}</q-banner>
        <div class="row q-gutter-sm"><q-btn outline no-caps icon="preview" :label="$t('inspection.previewPdf')" :disable="dirty || !inspection" :loading="rendering" @click="pdf(false)" /><q-btn color="primary" no-caps icon="attach_file" :label="$t('inspection.attachPdf')" :disable="dirty || !inspection || !pdfUrl" :loading="rendering" @click="pdf(true)" /></div>
        <iframe v-if="pdfUrl" :src="pdfUrl" :title="$t('inspection.pdfReport')" style="width:100%;height:75vh;border:0;margin-top:20px" />
      </section>
      <section v-if="isCertificate && existingDocuments.length" class="section-card q-mt-lg"><h2 class="q-mb-md">{{ $t('certificate.existingReports') }}</h2><DocumentFiles :files="existingDocuments" @download="download" /></section>
    </template>
    <InspectionImportDialog v-if="importOpen && gear" :order-id="route.params.id" :equipment="gear" @close="importOpen = false" @imported="load" />
  </q-page>
</template>
<script setup>
import { ref, onMounted, onBeforeUnmount, computed, watch } from 'vue'
import { useQuasar } from 'quasar'
import { useRoute, onBeforeRouteLeave } from 'vue-router'
import { api, endpoint, date as formatDate } from '../services/api'
import ErrorBanner from '../components/ErrorBanner.vue'
import InspectionEditor from '../components/InspectionEditor.vue'
import template from '../assets/inspection-template.json'
import { t, translateText } from '../i18n'
import InspectionCertificate from '../components/InspectionCertificate.vue'
import DocumentFiles from '../components/DocumentFiles.vue'
import InspectionCharts from '../components/InspectionCharts.vue'
import InspectionImportDialog from '../components/InspectionImportDialog.vue'
const route = useRoute(), loading = ref(false), error = ref(''), values = ref(null), inspection = ref(null), layout = ref('standard'), gear = ref(null), importOpen = ref(false)
const q = useQuasar(), tab = ref('charts'), dirty = ref(false), saving = ref(false), rendering = ref(false), reportSheet = ref('Tehnični pregled & trim'), pdfUrl = ref('')
const viewKind=ref('paraglider'),sourceDocument=ref(null),existingDocuments=ref([])
const isCertificate=computed(()=>viewKind.value!=='paraglider')
const certificateReference=computed(()=>values.value?.inspection_number==null?'—':viewKind.value==='reserve'?`R${values.value.inspection_date?.slice(2,4)||''}-P${String(values.value.inspection_number).padStart(3,'0')}`:`S-${String(values.value.inspection_number).padStart(4,'0')}`)
const pageTitle=computed(()=>t(isCertificate.value?(viewKind.value==='reserve'?'certificate.reserveTitle':'certificate.generalTitle'):'inspection.title'))
const equipmentSummary=computed(()=>gear.value?`${gear.value.manufacturer||''} ${gear.value.model||''} ${gear.value.size||''} · ${gear.value.serial||'—'}`:'')
const reportOptions = computed(() => isCertificate.value?['sl','en','de'].map(code=>({value:viewKind.value+'-'+code,label:t('certificate.report_'+code)})):template.reports.filter(r => !r.legacy && (layout.value === 'F' ? r.sheet.endsWith(' F') : !r.sheet.endsWith(' F'))).map(r => r.sheet))

let pdfRequest=null
function clearPdf() { pdfRequest?.abort();pdfRequest=null;rendering.value=false;if (pdfUrl.value) URL.revokeObjectURL(pdfUrl.value); pdfUrl.value = '' }
function update(key, value) { values.value[key] = value; dirty.value = true; clearPdf() }
async function save() {
 saving.value = true; error.value = ''
 try { await api('saveinspection', { order_id: Number(route.params.id), equipment_id: Number(route.params.equipmentId), revision: inspection.value?.revision || 0, report_sheet: reportSheet.value, values: values.value, equipment_update: 'replace',source_document_id:sourceDocument.value?.id }); dirty.value = false; await load(); q.notify({ type: 'positive', message: t(isCertificate.value?'certificate.saved':'inspection.saved') }) }
 catch(e) { error.value = e.message } finally { saving.value = false }
}
async function pdf(publish) {
 pdfRequest?.abort()
 const request=new AbortController();pdfRequest=request
 let timedOut=false
 const timeout=setTimeout(()=>{timedOut=true;request.abort()},90000)
 rendering.value = true; error.value = ''
 try {
  const response = await fetch(endpoint('inspectionpdf'), { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, signal: request.signal, body: JSON.stringify({ order_id: Number(route.params.id), equipment_id: Number(route.params.equipmentId), revision: inspection.value.revision, report_sheet: reportSheet.value, publish }) })
  const result = await response.json(); if (!response.ok || result.error) throw new Error(result.error ? translateText(result.error) : t('errors.connection'))
  if(request.signal.aborted || pdfRequest!==request)return
  if (publish) {
   q.notify({ type: 'positive', message: t('inspection.pdfAttached') })
   if(isCertificate.value)existingDocuments.value.unshift({id:result.id,filename:result.filename,report_number:certificateReference.value,kind:'report',equipment_id:gear.value.id,order_id:Number(route.params.id)})
  } else {
   if(pdfUrl.value)URL.revokeObjectURL(pdfUrl.value)
   pdfUrl.value = URL.createObjectURL(new Blob([Uint8Array.from(atob(result.content), c => c.charCodeAt(0))], { type: 'application/pdf' }))
  }
 } catch(e) { if(pdfRequest===request && (!request.signal.aborted || timedOut))error.value = timedOut?t('inspection.pdfTimeout'):e.message }
 finally {clearTimeout(timeout);if(pdfRequest===request){pdfRequest=null;rendering.value=false}}
}

watch(reportSheet, clearPdf)
watch(layout, () => { if (!isCertificate.value && !reportOptions.value.includes(reportSheet.value)) reportSheet.value = reportOptions.value[0] })
function unload(event) { if (dirty.value) { event.preventDefault(); event.returnValue = '' } }
onBeforeRouteLeave(() => !dirty.value || window.confirm(t('inspection.discardChanges')))
onBeforeUnmount(() => { clearPdf(); window.removeEventListener('beforeunload', unload) })
async function load() {
 loading.value = true; error.value = ''
 try {
  const result = await api('inspection', { order_id: Number(route.params.id), equipment_id: Number(route.params.equipmentId) })
  values.value = result.values; inspection.value = result.inspection; dirty.value = false; clearPdf()
  viewKind.value=result.view||'paraglider';sourceDocument.value=result.source_document||null;existingDocuments.value=result.documents||[]
  reportSheet.value = result.report_sheet || result.inspection?.report_sheet || 'Tehnični pregled & trim'
  layout.value = result.layout || (reportSheet.value.endsWith(' F') ? 'F' : 'standard')
  gear.value = result.equipment || { id: Number(route.params.equipmentId), manufacturer: result.values['Vnos podatkov!B5'], model: result.values['Vnos podatkov!B6'], size: result.values['Vnos podatkov!B7'], serial: result.values['Vnos podatkov!B9'] }

 } catch(e) { error.value = e.message } finally { loading.value = false }
}
async function download(file){try{const response=await fetch(endpoint('document/' + file.id),{credentials:'include'});if(!response.ok)throw new Error(t('errors.downloadFailed'));const url=URL.createObjectURL(await response.blob()),a=document.createElement('a');a.href=url;a.download=file.filename;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000)}catch(e){error.value=e.message}}
onMounted(() => { window.addEventListener('beforeunload', unload); load() })
</script>

<style scoped>
.inspection-page .q-banner strong{overflow-wrap:anywhere}
</style>
