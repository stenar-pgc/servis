<template>
  <div>
    <div class="row q-col-gutter-md q-mb-lg">
      <div v-for="group in headerGroups" :key="group.id" :class="['col-12', longField(group.id) ? '' : 'col-sm-6 col-md-4']">
        <q-select v-if="field(group).options" outlined dense :model-value="values[group.fields[0]]" :options="field(group).options" :label="$t('inspection.' + group.label)" clearable @update:model-value="set(group.fields[0], $event)" />
        <q-input v-else outlined dense :model-value="values[group.fields[0]]" :type="field(group).type === 'date' ? 'date' : longField(group.id) ? 'textarea' : 'text'" :inputmode="field(group).type === 'number' ? 'decimal' : undefined" :label="$t('inspection.' + group.label)" :style="{ backgroundColor: field(group).color }" @update:model-value="set(group.fields[0], $event)" />
      </div>
    </div>
    <q-banner class="bg-blue-1 q-mb-lg">{{ $t('inspection.laserHelp') }}</q-banner>
    <div class="row q-gutter-md q-mb-md">
      <q-select v-model="direction" outlined dense :options="[{ label: $t('inspection.down'), value: 'down' }, { label: $t('inspection.across'), value: 'across' }]" emit-value map-options :label="$t('inspection.entryDirection')" style="min-width:190px" />
      <q-select v-model="unit" outlined dense :options="['mm','cm','m']" :label="$t('inspection.laserUnit')" style="min-width:140px" />
    </div>
    <ErrorBanner :message="error" />
    <q-expansion-item v-for="group in matrixGroups" :key="group.id" :label="`${$t('inspection.' + group.label)} · ${group.sheet}`" header-class="bg-grey-2" class="q-mb-md" :default-opened="group.id === 'porosity'">
      <div class="measurement-scroll q-pa-sm">
        <table class="measurement-grid"><thead><tr><th>#</th><th v-for="(header, index) in group.headers.length ? group.headers : [group.unit]" :key="index">{{ header }}</th></tr></thead>
          <tbody><tr v-for="row in rows(group)" :key="row.index"><th>{{ row.index }}</th><td v-for="key in row.keys" :key="key" :style="{ background: template.fields[key].color }">
            <label v-if="template.fields[key].label" class="text-caption">{{ template.fields[key].label }}</label>
            <select v-if="template.fields[key].options" :aria-label="key" :value="values[key] ?? ''" @change="set(key, $event.target.value)"><option value=""></option><option v-for="option in template.fields[key].options" :key="option">{{ option }}</option></select>
            <input v-else :data-key="key" :aria-label="key" :inputmode="template.fields[key].type === 'number' ? 'decimal' : 'text'" :value="values[key] ?? ''" @change="change(key, $event.target)" @focus="$event.target.select()" @keydown="advance($event, group, key)" @paste="paste($event, group, key)" />
          </td></tr></tbody>
        </table>
      </div>
    </q-expansion-item>
  </div>
</template>
<script setup>
import { computed, nextTick, ref } from 'vue'
import template from '../assets/inspection-template.json'
import { t } from '../i18n'
import ErrorBanner from './ErrorBanner.vue'
const props = defineProps({ values: { type: Object, required: true }, layout: { type: String, default: 'standard' } })
const emit = defineEmits(['update'])
const direction = ref('down'), unit = ref('mm'), error = ref('')
const headerGroups = template.groups.filter(g => g.fields.length === 1 && g.sheet === 'Vnos podatkov')
const field = group => template.fields[group.fields[0]]
const longField = id => /Repairs|notes|Notes/.test(id)
const matrixGroups = computed(() => template.groups.filter(g => g.fields.length > 1 && (g.sheet === 'Vnos podatkov' || (props.layout === 'F' ? g.sheet === 'F' || g.sheet.endsWith(' F') : g.sheet !== 'F' && !g.sheet.endsWith(' F')))))
function parse(key, value, laser = false) {
 const f = template.fields[key]
 if (value === '' || value == null) return null
 if (f.type !== 'number') return String(value)
 const match = String(value).trim().replace('−', '-').match(/^([+-]?(?:\d+(?:[.,]\d*)?|[.,]\d+))\s*(mm|cm|m)?$/i)
 if (!match) throw new Error(t('inspection.invalidReading', { cell: key }))
 let result = Number(match[1].replace(',', '.'))
 if (laser && f.unit === 'mm' && f.metric === 'line_length') result *= ({ mm: 1, cm: 10, m: 1000 })[match[2]?.toLowerCase() || unit.value]
 else if (match[2]) throw new Error(t('inspection.invalidReading', { cell: key }))
 if (!Number.isFinite(result) || Math.abs(result) > 1000000 || (f.min != null && result < f.min) || (f.max != null && result > f.max) || (['line_length','nominal_length'].includes(f.metric) && result < 0)) throw new Error(t('inspection.invalidReading', { cell: key }))
 return Math.round(result * 100000) / 100000
}
function set(key, value, laser = false) { try { const parsed = parse(key, value, laser); emit('update', key, parsed); error.value = ''; return true } catch(e) { error.value = e.message; return false } }
function change(key, target) { if (target.value === String(props.values[key] ?? '')) return; if (set(key, target.value, true)) nextTick(() => { target.value = props.values[key] ?? '' }) }
function rows(group) { const output = []; for (let i=0;i<group.fields.length;i+=group.columns) output.push({index:template.fields[group.fields[i]].index,keys:group.fields.slice(i,i+group.columns)}); return output }
function ordered(group) { return direction.value === 'across' ? group.fields : [...group.fields].sort((a,b) => { const ai=group.fields.indexOf(a),bi=group.fields.indexOf(b); return ai%group.columns-bi%group.columns || Math.floor(ai/group.columns)-Math.floor(bi/group.columns) }) }
async function advance(event, group, key) {
 if (!['Enter','Tab'].includes(event.key)) return
 event.preventDefault()
 // A committed value is already in millimetres; do not convert it a second time on blur.
 if (event.target.value !== String(props.values[key] ?? '') && !set(key,event.target.value,true)) return
 await nextTick(); event.target.value = props.values[key] ?? ''
 const keys=ordered(group),index=keys.indexOf(key)+(event.shiftKey?-1:1),next=keys[index]
 if(next) { const input=[...event.target.closest('table').querySelectorAll('input[data-key]')].find(el=>el.dataset.key===next);input?.focus();input?.select() }
}
function paste(event, group, key) {
 const text=event.clipboardData.getData('text');if(!/[\t\n\r]/.test(text))return
 event.preventDefault();const inputs=text.trim().split(/[\t\r\n]+/),keys=ordered(group),start=keys.indexOf(key)
 if(start+inputs.length>keys.length){error.value=t('inspection.pasteTooLarge');return}
 try { const pending=inputs.map((v,i)=>[keys[start+i],parse(keys[start+i],v,true)]);pending.forEach(([k,v])=>emit('update',k,v));error.value='' } catch(e){error.value=e.message}
}
</script>
<style scoped>
.measurement-scroll { overflow: auto; }
.measurement-grid { border-collapse: collapse; min-width: 100%; }
.measurement-grid td,.measurement-grid th { border: 1px solid #d6dfe3; padding: 4px; }
.measurement-grid th { font-size: 12px; padding: 6px; }
.measurement-grid input,.measurement-grid select { width: 100%; min-width: 78px; padding: 8px; border: 1px solid transparent; background: transparent; color: #142f3a; font: inherit; }
.measurement-grid input:focus { outline: 2px solid #039acc; background: #fff; }
</style>
