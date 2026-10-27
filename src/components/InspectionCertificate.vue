<template>
  <section class="section-card certificate-view">
    <div v-if="editable" class="row q-col-gutter-md q-mb-lg">
      <q-input class="col-12 col-sm-6" outlined dense type="date" :label="$t('inspection.inspectionDate')" :model-value="values.inspection_date" @update:model-value="update('inspection_date',$event||null)" />
      <q-input class="col-12 col-sm-6" outlined dense type="number" min="0" step="1" :label="$t('inspection.referenceNumber')" :model-value="values.inspection_number" @update:model-value="update('inspection_number',$event===''?null:Number($event))" />
    </div>
    <div v-if="kind==='reserve'" class="row q-col-gutter-xl">
      <div class="col-12 col-md-7"><h2 class="q-mb-lg">{{ $t('certificate.inspection') }}</h2>
        <div v-for="item in checks" :key="item.key" class="certificate-check">
          <span>{{ $t('certificate.'+item.key) }}</span>
          <q-select v-if="editable" outlined dense clearable emit-value map-options :model-value="values[item.key]" :options="checkOptions" :aria-label="$t('certificate.'+item.key)" @update:model-value="update(item.key,$event)" />
          <span v-else class="certificate-state"><q-icon :name="values[item.key]==='pass'?'check_circle':values[item.key]==='fail'?'cancel':values[item.key]==='na'?'remove_circle_outline':'radio_button_unchecked'" :color="values[item.key]==='fail'?'negative':values[item.key]==='pass'?'orange-7':'grey-5'" size="24px" />{{ stateLabel(values[item.key]) }}</span>
        </div>
      </div>
      <div class="col-12 col-md-5 certificate-rating"><q-icon name="paragliding" color="primary" size="42px" /><h2>{{ $t('certificate.condition_rating') }}</h2>
        <q-rating v-if="editable || values.condition_rating!=null" :model-value="values.condition_rating||0" :readonly="!editable" :max="5" size="31px" color="orange-7" icon="star_border" icon-selected="star" :aria-label="$t('certificate.condition_rating')" @update:model-value="update('condition_rating',$event||null)" /><span v-else class="text-grey-6">{{ $t('certificate.notEntered') }}</span>
      </div>
    </div>
    <template v-else>
      <h2 class="q-mb-md">{{ $t('certificate.work_done') }}</h2><q-input v-if="editable" outlined type="textarea" autogrow :aria-label="$t('certificate.work_done')" :model-value="values.work_done" @update:model-value="update('work_done',$event||null)" /><p v-else class="certificate-notes">{{ values.work_done || '—' }}</p>
      <h2 class="q-mb-md q-mt-lg">{{ $t('certificate.condition') }}</h2><q-input v-if="editable" outlined type="textarea" autogrow :aria-label="$t('certificate.condition')" :model-value="values.condition" @update:model-value="update('condition',$event||null)" /><p v-else class="certificate-notes">{{ values.condition || '—' }}</p>
      <h2 class="q-mb-md q-mt-lg">{{ $t('certificate.measurements') }}</h2>
      <div v-for="index in measurementRows" :key="index" class="certificate-measurement">
        <template v-if="editable"><q-input outlined dense :label="$t('certificate.measurementName')" :aria-label="$t('certificate.measurementName')+' '+index" :model-value="values[`measure${index}_label`]" @update:model-value="update(`measure${index}_label`,$event||null)" /><q-input outlined dense type="number" :label="$t('certificate.measurementValue')" :aria-label="$t('certificate.measurementValue')+' '+index" :model-value="values[`measure${index}_value`]" @update:model-value="update(`measure${index}_value`,$event===''?null:Number($event))" /><q-input outlined dense :label="$t('certificate.unit')" :aria-label="$t('certificate.unit')+' '+index" maxlength="10" :model-value="values[`measure${index}_unit`]" @update:model-value="update(`measure${index}_unit`,$event||null)" /></template>
        <template v-else><span>{{ values[`measure${index}_label`] || '—' }}</span><strong>{{ values[`measure${index}_value`] ?? '—' }}</strong><span>{{ values[`measure${index}_unit`] }}</span></template>
      </div>
      <p v-if="!measurementRows.length" class="text-grey-6">{{ $t('certificate.notEntered') }}</p>
    </template>
    <q-separator class="q-my-lg" /><h2 class="q-mb-md">{{ $t(kind==='reserve'?'certificate.reserveNotes':'certificate.notes') }}</h2>
    <q-input v-if="editable" outlined type="textarea" autogrow :aria-label="$t(kind==='reserve'?'certificate.reserveNotes':'certificate.notes')" :model-value="values.notes" @update:model-value="update('notes',$event||null)" /><p v-else class="certificate-notes">{{ values.notes || '—' }}</p>
  </section>
</template>
<script setup>
import {computed} from 'vue'
import {t} from '../i18n'
const props=defineProps({kind:{type:String,required:true},values:{type:Object,required:true},editable:Boolean})
const emit=defineEmits(['update'])
const update=(key,value)=>emit('update',key,value)
const checks=['canopy_check','line_check','riser_check','container_check'].map(key=>({key}))
const checkOptions=computed(()=>['pass','fail','na'].map(value=>({value,label:t('certificate.'+value)})))
const stateLabel=value=>t('certificate.'+(value||'notEntered'))
const measurementRows=computed(()=>[1,2,3,4,5,6].filter(i=>props.editable||props.values[`measure${i}_label`]||props.values[`measure${i}_value`]!=null))
</script>
<style scoped>
.certificate-check{display:flex;align-items:center;justify-content:space-between;gap:20px;padding:14px 0;border-bottom:1px solid #edf1f3}.certificate-check .q-select{width:200px}.certificate-state{display:flex;align-items:center;gap:9px;color:#5c7783}.certificate-rating{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:18px;padding:30px 15px}.certificate-rating h2{text-align:center}.certificate-notes{white-space:pre-wrap;line-height:1.7;margin:0}.certificate-measurement{display:grid;grid-template-columns:minmax(0,1fr) 150px 90px;gap:12px;align-items:center;margin-bottom:12px}@media(max-width:599px){.certificate-check{align-items:flex-start;gap:10px}.certificate-check .q-select{width:160px;flex-shrink:0}.certificate-measurement{grid-template-columns:minmax(0,1fr) 85px 64px;gap:8px}}
</style>
