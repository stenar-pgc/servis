<template>
  <div class="profile-chart">
    <svg :viewBox="`0 0 ${width} ${height}`" role="img" :aria-label="$t('inspection.lineDeviation')" class="deviation-chart">
      <defs><clipPath :id="clipId"><rect :x="left" :y="top" :width="plotWidth" :height="bottom-top" /></clipPath></defs>
      <rect :x="left" :y="y(10)" :width="plotWidth" :height="y(-10)-y(10)" fill="#f2f9fc" />
      <image class="wing-profile" href="/inspection-wing.png" :x="left-35" :y="y(0)-profileHeight/2" :width="profileWidth" :height="profileHeight" preserveAspectRatio="xMidYMid meet" aria-hidden="true" />
      <g v-for="tick in ticks" :key="tick"><line :x1="left" :x2="right" :y1="y(tick)" :y2="y(tick)" :stroke="tick===0?'#7498a8':'#d5e5ec'" :class="tick===0?'zero-line':''" :stroke-dasharray="tick===0?'':'3 4'" /><text :x="left-10" :y="y(tick)+4" text-anchor="end">{{ tick }}</text></g>
      <g v-for="(axis,index) in axes" :key="axis.name">
        <g :clip-path="`url(#${clipId})`" class="profile-bars">
          <rect v-for="(segment,part) in axis.segments" :key="part" :x="x(index)-barWidth/2" :y="y(Math.max(segment.start,segment.end))" :width="barWidth" :height="Math.abs(y(segment.start)-y(segment.end))" :fill="segment.outside?'#e69138':'#039acc'" :class="segment.outside?'bar-outside':'bar-within'" :data-start="segment.start" :data-end="segment.end"><title>{{ axis.name }}: {{ number(axis.min) }} … {{ number(axis.max) }} mm</title></rect>
        </g>
        <text :x="x(index)" :y="height-14" text-anchor="middle" class="axis-label">{{ axis.min==null?'':axis.name }}</text>
      </g>
      <g v-for="side in sides" :key="side.name" :class="'profile-'+side.name" :clip-path="`url(#${clipId})`">
        <path :d="path(side.name)" fill="none" :stroke="side.color" stroke-width="2.6" stroke-linejoin="round" />
        <circle v-for="point in points(side.name)" :key="point.index" :cx="point.x" :cy="point.y" r="3.5" :fill="side.color"><title>{{ $t('inspection.'+side.name) }} {{ axes[point.index].name }}: {{ number(point.value) }} mm</title></circle>
        <path :d="trend(side.name)" fill="none" :stroke="side.color" stroke-opacity=".45" stroke-width="1.4" stroke-dasharray="5 4" />
      </g>
      <text x="8" y="14">mm</text>
      <text v-if="!hasReadings" :x="(left+right)/2" :y="height/2" text-anchor="middle" class="empty-label">{{ $t('inspection.noChartReadings') }}</text>
    </svg>
    <div class="profile-legend"><span v-for="side in sides" :key="side.name"><i :style="{background:side.color}" />{{ $t('inspection.'+side.name) }}</span><span class="profile-trend">{{ $t('inspection.trendLine') }}</span></div>
  </div>
</template>
<script setup>
import {computed,useId} from 'vue'
const props=defineProps({axes:{type:Array,required:true},limit:{type:Number,default:20}})
const clipId='wing-'+useId().replaceAll(':',''),width=560,height=258,left=45,right=540,top=24,bottom=220,plotWidth=right-left
const profileWidth=plotWidth*1.03,profileHeight=profileWidth*90/513
const sides=[{name:'right',color:'#004b64'},{name:'left',color:'#b45f06'}]
const ticks=computed(()=>[-props.limit,-10,0,10,props.limit])
const x=index=>left+(index+.5)*plotWidth/Math.max(1,props.axes.length)
const y=value=>top+(props.limit-value)*(bottom-top)/(props.limit*2)
const barWidth=computed(()=>Math.min(46,plotWidth/Math.max(1,props.axes.length)*.43))
const hasReadings=computed(()=>props.axes.some(axis=>axis.min!=null))
const number=value=>Number(value.toFixed(1))
function points(side){return props.axes.flatMap((axis,index)=>typeof axis[side]==='number'?[{index,value:axis[side],x:x(index),y:y(axis[side])}]:[])}
function path(side){let previous=-2;return points(side).map(point=>{const command=point.index===previous+1?'L':'M';previous=point.index;return command+point.x+','+point.y}).join(' ')}
function trend(side){const data=points(side),n=data.length;if(n<2)return'';let sx=0,sy=0,sxx=0,sxy=0;for(const p of data){sx+=p.index;sy+=p.value;sxx+=p.index*p.index;sxy+=p.index*p.value}const divisor=n*sxx-sx*sx;if(!divisor)return'';const slope=(n*sxy-sx*sy)/divisor,intercept=(sy-slope*sx)/n,first=data[0].index,last=data.at(-1).index;return`M${x(first)},${y(intercept+slope*first)} L${x(last)},${y(intercept+slope*last)}`}
</script>
<style scoped>
.deviation-chart{display:block;width:100%;height:auto}.deviation-chart text{font:11px Roboto,sans-serif;fill:#6d8793}.deviation-chart .axis-label{font-size:13px;fill:#244956}.deviation-chart .empty-label{fill:#6a8491;font-size:13px}.profile-legend{display:flex;justify-content:center;flex-wrap:wrap;gap:12px 18px;font-size:11px;color:#67818d;margin-top:2px}.profile-legend span{display:inline-flex;align-items:center;gap:6px}.profile-legend i{width:20px;height:3px;border-radius:2px}.profile-trend:before{content:'';width:20px;border-top:1px dashed #8ba4ae}
</style>
