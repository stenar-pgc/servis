<template>
  <div class="inspection-charts">
    <div class="row q-col-gutter-lg">
      <section class="col-12 col-lg-6 inspection-summary-panel">
        <h2>{{ $t('inspection.porosity') }}</h2>
        <div class="porosity-wing" role="img" :aria-label="$t('inspection.porosity')">
          <svg viewBox="0 0 560 130" class="porosity-canopy" aria-hidden="true"><defs><clipPath id="porosity-canopy-clip"><path d="M16 18 C250 -2 466 30 548 110 L536 123 C463 56 250 29 16 42 Z" /></clipPath></defs><path d="M16 18 C250 -2 466 30 548 110 L536 123 C463 56 250 29 16 42 Z" fill="#079dca" /><g clip-path="url(#porosity-canopy-clip)" stroke="white" stroke-width="5"><path d="M80 12 L77 49 M150 13 L143 54 M220 14 L210 62 M290 23 L276 74 M360 38 L340 89 M430 57 L409 107 M492 79 L468 124" /></g><circle v-for="point in porosity" :key="point.index" :cx="18+point.index*74" :cy="21+88*(point.index/7)**2" r="5" fill="#f99b1c" stroke="white" stroke-width="1.2" /></svg>
          <div class="porosity-points"><div v-for="point in porosity" :key="point.index"><small>{{ point.index }} m</small><strong :style="{ background: porosityColor(point.value) }">{{ point.value == null ? '—' : point.value >= 800 ? '800+' : point.value }}<small v-if="point.value != null"> s</small></strong></div></div>
        </div>
        <div class="row q-gutter-lg q-mt-sm"><div><small>{{ $t('inspection.average') }}</small><div class="text-h6">{{ number(hasPorosity ? calc.safe('Vnos podatkov', 'E14') : null) }} s</div></div><div><small>{{ $t('inspection.minimum') }}</small><div class="text-h6">{{ number(hasPorosity ? calc.safe('Vnos podatkov', 'E15') : null) }} s</div></div></div>
      </section>
      <section class="col-12 col-lg-6 inspection-summary-panel">
        <h2>{{ $t('inspection.condition') }}</h2>
        <div v-for="rating in ratings" :key="rating.cell" class="rating-row"><span>{{ $t('inspection.' + rating.label) }}</span><div class="rating-track"><div :style="{ width: Math.max(0, Math.min(1, rating.value || 0)) * 100 + '%' }" /></div><strong>{{ rating.value == null ? '—' : Math.round(rating.value * 100) + '%' }}</strong></div>
        <p class="text-caption text-grey-7">{{ $t('inspection.calculationNotice') }}</p>
      </section>
    </div>
    <q-separator class="q-my-lg" />
    <div class="row q-col-gutter-lg">
      <section v-for="stage in stages" :key="stage.sheet" class="col-12 col-md-6 inspection-profile-panel">
        <h2>{{ $t('inspection.' + stage.label) }}</h2>
        <InspectionProfileChart :axes="stage.axes" :limit="stage.limit" />
        <p class="text-caption">{{ $t('inspection.rangeLegend') }}</p>
      </section>
    </div>
    <section v-for="stage in stages" :key="stage.label" class="q-mt-lg">
      <h2>{{ $t('inspection.' + stage.label) }} · {{ $t('inspection.lineDeviation') }} (mm)</h2>
      <div class="heatmap-scroll"><table class="heatmap"><thead><tr><th></th><th :colspan="lineCount">{{ $t('inspection.right') }}</th><th :colspan="lineCount">{{ $t('inspection.left') }}</th></tr><tr><th></th><th v-for="position in positions" :key="position.side + position.index">{{ position.index }}</th></tr></thead><tbody><tr v-for="(name, axis) in groups" :key="name"><th>{{ name }}</th><td v-for="position in positions" :key="position.side + position.index" :style="{ background: heatColor(deviation(stage.sheet, position.side, axis, position.index)) }" :title="`${name}${position.index} ${$t('inspection.' + position.side)}`">{{ number(deviation(stage.sheet, position.side, axis, position.index), 0) }}</td></tr></tbody></table></div>
      <div class="heatmap-legend"><span>−40 mm</span><div /><span>0</span><div /><span>+40 mm</span></div>
    </section>
    <q-expansion-item :label="$t('inspection.strength')" class="q-mt-lg">
      <q-markup-table flat wrap-cells><thead><tr><th>{{ $t('inspection.lineName') }}</th><th>{{ $t('inspection.material') }}</th><th>8g (kg)</th><th>10g (kg)</th><th>{{ $t('inspection.breaking') }} (kg)</th></tr></thead><tbody><tr v-for="r in [10,11,12]" :key="r"><td>{{ values['Meritev nosilnosti vrvic!G' + r] || '—' }}</td><td>{{ values['Meritev nosilnosti vrvic!K' + r] || '—' }}</td><td>{{ number(values['Meritev nosilnosti vrvic!O' + r]) }}</td><td>{{ number(values['Meritev nosilnosti vrvic!T' + r]) }}</td><td>{{ number(values['Meritev nosilnosti vrvic!Y' + r]) }}</td></tr></tbody></q-markup-table>
    </q-expansion-item>
  </div>
</template>
<script setup>
import { computed } from 'vue'
import InspectionProfileChart from './InspectionProfileChart.vue'
import { inspectionCalculator, inspectionRatingValues, columnName } from '../services/inspection-calculation'
const props = defineProps({ values: { type: Object, required: true }, layout: { type: String, default: 'standard' } })
const calc = computed(() => inspectionCalculator(props.values))
const groups = computed(() => props.layout === 'F' ? ['A','B','C','D','E','F','Br'] : ['A','B','C','D','E','Br'])
const lineCount = computed(() => props.layout === 'F' ? 25 : 23)
const positions = computed(() => [...Array.from({ length: lineCount.value }, (_, i) => ({ side: 'right', index: lineCount.value - i })), ...Array.from({ length: lineCount.value }, (_, i) => ({ side: 'left', index: i + 1 }))])
const porosity = computed(() => Array.from({ length: 8 }, (_, index) => ({ index, value: props.values['Vnos podatkov!B' + (14 + index)] })))
const hasPorosity = computed(() => porosity.value.some(point => typeof point.value === 'number'))
const ratingCalc = computed(() => inspectionCalculator(inspectionRatingValues(props.values, props.layout)))
const ratings = computed(() => {
  const values = inspectionRatingValues(props.values, props.layout)
  const offset = values['Vnos podatkov!B25'] === 'ne' || values['Vnos podatkov!B29'] !== 'da' ? 'A!AB28' : 'kontrolna meritev!AB28'
  const available = [typeof values['Vnos podatkov!B26'] === 'number', typeof values['Vnos podatkov!B27'] === 'number', Boolean(values['Vnos podatkov!B1'] && values['Vnos podatkov!B10']), hasPorosity.value, typeof values[offset] === 'number']
  available.push(available.every(Boolean))
  return ['canopyRating','linesRating','age','porosity','equalizing','overall'].map((label, i) => ({ label, cell: 'F' + (23+i), value: available[i] ? ratingCalc.value.safe('Vnos podatkov', 'F' + (23+i)) : null }))
})
const number = (value, precision = 1) => typeof value === 'number' && Number.isFinite(value) ? Number(value.toFixed(precision)) : '—'
function deviation(sheet, side, axis, index) {
  // No reading is different from a zero deviation; do not visualize an inferred measurement.
  const measured = calc.value.safe(sheet, columnName(3 + axis + (side === 'left' ? groups.value.length : 0)) + (index + 3))
  if (typeof measured !== 'number') return null
  return calc.value.safe(sheet, columnName((props.layout === 'F' ? (side === 'right' ? 28 : 37) : (side === 'right' ? 25 : 33)) + axis) + (index + 3))
}
const stages = computed(() => [{ sheet: props.layout === 'F' ? 'F' : 'A', label: 'before' }, { sheet: props.layout === 'F' ? (props.values['Vnos podatkov!B25'] === 'ne' ? 'F' : 'trimanje F') : 'B', label: 'after' }].map(stage => {
 const profileGroups=groups.value.filter(name=>name!=='Br')
 const allAxes=profileGroups.map((name,axis)=>{
  const sides=Object.fromEntries(['right','left'].map(side=>[side,positions.value.filter(p=>p.side===side).map(p=>deviation(stage.sheet,side,axis,p.index)).filter(v=>typeof v==='number')]))
  const readings=[...sides.right,...sides.left]
  return{name,min:readings.length?Math.min(...readings):null,max:readings.length?Math.max(...readings):null,right:sides.right.length?sides.right.reduce((a,b)=>a+b,0)/sides.right.length:null,left:sides.left.length?sides.left.reduce((a,b)=>a+b,0)/sides.left.length:null}
 })
 const activeAxes=allAxes.filter(axis=>axis.min!=null),axes=activeAxes.length?activeAxes:allAxes

 return { ...stage, axes, limit: Math.max(20, ...axes.flatMap(a => [Math.ceil(Math.abs(a.min || 0)/10)*10, Math.ceil(Math.abs(a.max || 0)/10)*10])) }
}))
function heatColor(v) { if (typeof v !== 'number') return '#f4f6f7'; const center=[182,215,168],edge=v<0?[255,0,0]:[74,134,232],ratio=Math.min(1,Math.abs(v)/40); return `rgb(${center.map((n,i)=>Math.round(n+(edge[i]-n)*ratio)).join(',')})` }
function porosityColor(v) { return v == null ? '#f4f6f7' : v<10?'#e06666':v<40?'#f6b26b':v<150?'#ffe599':v<200?'#d9ead3':v<350?'#b6d7a8':'#93c47d' }
</script>
<style scoped>
.inspection-summary-panel h2,.inspection-profile-panel h2{margin-bottom:14px}.inspection-profile-panel>p{color:#78909b;margin-top:12px}.porosity-wing { position: relative; padding-top: 20px; }
.porosity-canopy { display:block;width:100%;height:auto;max-height:130px; }
.porosity-points { display: flex; justify-content: space-between; margin-top: 4px; position: relative; gap: 3px; }
.porosity-points strong { display: block; padding: 5px; border-radius: 4px; font-size: 13px; }
.porosity-points small { font-size: 10px; }
.rating-row { display: grid; grid-template-columns: 145px 1fr 46px; gap: 8px; align-items: center; margin: 10px 0; font-size: 12px; }
.rating-track { background: #e8f0f4; height: 18px; border-radius: 2px; overflow: hidden; }
.rating-track div { background: #039acc; height: 100%; }
.deviation-chart { width: 100%; }
.heatmap-scroll { overflow: auto; }
.heatmap { border-collapse: collapse; width: 100%; font-size: 10px; text-align: center; }
.heatmap th,.heatmap td { min-width: 24px; padding: 5px 2px; border: 1px solid white; }
.heatmap-legend { display: flex; gap: 6px; font-size: 11px; justify-content: end; align-items: center; margin: 6px 0; }
.heatmap-legend div { height: 10px; width: 80px; background: linear-gradient(to right,#ff0000,#b6d7a8); }
.heatmap-legend div:nth-of-type(2) { background: linear-gradient(to right,#b6d7a8,#4a86e8); }
</style>
