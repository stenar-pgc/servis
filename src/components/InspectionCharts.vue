<template>
  <div class="inspection-charts">
    <div class="row q-col-gutter-lg">
      <section class="col-12 col-lg-6">
        <h2>{{ $t('inspection.porosity') }}</h2>
        <div class="porosity-wing" role="img" :aria-label="$t('inspection.porosity')">
          <img src="/inspection-wing.png" alt="" />
          <div class="porosity-points"><div v-for="point in porosity" :key="point.index"><small>{{ point.index }} m</small><strong :style="{ background: porosityColor(point.value) }">{{ point.value == null ? '—' : point.value >= 800 ? '800+' : point.value }}<small v-if="point.value != null"> s</small></strong></div></div>
        </div>
        <div class="row q-gutter-lg q-mt-sm"><div><small>{{ $t('inspection.average') }}</small><div class="text-h6">{{ number(hasPorosity ? calc.safe('Vnos podatkov', 'E14') : null) }} s</div></div><div><small>{{ $t('inspection.minimum') }}</small><div class="text-h6">{{ number(hasPorosity ? calc.safe('Vnos podatkov', 'E15') : null) }} s</div></div></div>
      </section>
      <section class="col-12 col-lg-6">
        <h2>{{ $t('inspection.condition') }}</h2>
        <div v-for="rating in ratings" :key="rating.cell" class="rating-row"><span>{{ $t('inspection.' + rating.label) }}</span><div class="rating-track"><div :style="{ width: Math.max(0, Math.min(1, rating.value || 0)) * 100 + '%' }" /></div><strong>{{ rating.value == null ? '—' : Math.round(rating.value * 100) + '%' }}</strong></div>
        <p class="text-caption text-grey-7">{{ $t('inspection.calculationNotice') }}</p>
      </section>
    </div>
    <q-separator class="q-my-lg" />
    <div class="row q-col-gutter-lg">
      <section v-for="stage in stages" :key="stage.sheet" class="col-12 col-md-6">
        <h2>{{ $t('inspection.' + stage.label) }}</h2>
        <svg viewBox="0 0 560 250" role="img" :aria-label="$t('inspection.lineDeviation')" class="deviation-chart">
          <rect x="42" :y="y(10, stage.limit)" width="490" :height="y(-10, stage.limit) - y(10, stage.limit)" fill="#e9f6fa" />
          <g v-for="tick in [-stage.limit, -10, 0, 10, stage.limit]" :key="tick"><line x1="42" x2="532" :y1="y(tick, stage.limit)" :y2="y(tick, stage.limit)" stroke="#ccd5d9" :stroke-dasharray="tick === 0 ? '' : '3 3'" /><text x="35" :y="y(tick, stage.limit) + 4" text-anchor="end" font-size="11">{{ tick }}</text></g>
          <g v-for="(axis, index) in stage.axes" :key="axis.name">
            <rect v-if="axis.min !== null" :x="70 + index * (440 / groups.length)" :y="y(axis.max, stage.limit)" width="32" :height="Math.max(2, y(axis.min, stage.limit) - y(axis.max, stage.limit))" fill="#039acc" />
            <rect v-if="axis.max > 10" :x="70 + index * (440 / groups.length)" :y="y(axis.max, stage.limit)" width="32" :height="Math.max(0, y(Math.max(10, axis.min), stage.limit) - y(axis.max, stage.limit))" fill="#f99b1c" />
            <rect v-if="axis.min !== null && axis.min < -10" :x="70 + index * (440 / groups.length)" :y="y(Math.min(-10, axis.max), stage.limit)" width="32" :height="Math.max(0, y(axis.min, stage.limit) - y(Math.min(-10, axis.max), stage.limit))" fill="#f99b1c" />
            <line v-if="axis.average !== null" :x1="66 + index * (440 / groups.length)" :x2="106 + index * (440 / groups.length)" :y1="y(axis.average, stage.limit)" :y2="y(axis.average, stage.limit)" stroke="#182e39" stroke-width="2" />
            <text :x="86 + index * (440 / groups.length)" y="236" text-anchor="middle" font-size="13">{{ axis.name }}</text>
          </g><text x="8" y="16" font-size="11">mm</text>
        </svg>
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
const stages = computed(() => [{ sheet: props.layout === 'F' ? 'F' : 'A', label: 'before' }, { sheet: props.layout === 'F' ? 'trimanje F' : 'B', label: 'after' }].map(stage => {
 const axes = groups.value.map((name, axis) => { const values = positions.value.map(p => deviation(stage.sheet,p.side,axis,p.index)).filter(v => typeof v === 'number'); return { name, min: values.length ? Math.min(...values) : null, max: values.length ? Math.max(...values) : null, average: values.length ? values.reduce((a,b)=>a+b,0)/values.length : null } })
 return { ...stage, axes, limit: Math.max(20, ...axes.flatMap(a => [Math.ceil(Math.abs(a.min || 0)/10)*10, Math.ceil(Math.abs(a.max || 0)/10)*10])) }
}))
const y = (value, limit) => 120 - (value / limit) * 95
function heatColor(v) { if (typeof v !== 'number') return '#f4f6f7'; const center=[182,215,168],edge=v<0?[255,0,0]:[74,134,232],ratio=Math.min(1,Math.abs(v)/40); return `rgb(${center.map((n,i)=>Math.round(n+(edge[i]-n)*ratio)).join(',')})` }
function porosityColor(v) { return v == null ? '#f4f6f7' : v<10?'#e06666':v<40?'#f6b26b':v<150?'#ffe599':v<200?'#d9ead3':v<350?'#b6d7a8':'#93c47d' }
</script>
<style scoped>
.porosity-wing { position: relative; padding-top: 20px; }
.porosity-wing img { width: 100%; height: 100px; object-fit: fill; }
.porosity-points { display: flex; justify-content: space-between; margin-top: -20px; position: relative; gap: 3px; }
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
