<template>
  <div class="profile-chart">
    <svg :viewBox="`0 0 ${width} ${height}`" role="img" :aria-label="$t('inspection.lineDeviation')" class="deviation-chart">
      <defs><clipPath :id="clipId"><path :d="outline" /></clipPath></defs>
      <rect :x="left" :y="y(10)" :width="plotWidth" :height="y(-10)-y(10)" fill="#f2f9fc" />
      <g class="wing-profile" :transform="`translate(${left},${y(0)-43}) scale(${plotWidth/513},.88)`" aria-hidden="true">
        <path :d="outline" fill="#deeff6" stroke="#90c5da" stroke-width="1.25" />
        <g :clip-path="`url(#${clipId})`"><line v-for="(axis,index) in axes" :key="axis.name" :x1="(index+.5)*513/Math.max(1,axes.length)" :x2="(index+.5)*513/Math.max(1,axes.length)-15" y1="0" y2="92" stroke="#badbe8" stroke-width="1.2" /><path d="M0 62 Q227 44 513 75" stroke="#badbe8" stroke-width="1" fill="none" /></g>
      </g>
      <g v-for="tick in ticks" :key="tick"><line :x1="left" :x2="right" :y1="y(tick)" :y2="y(tick)" :stroke="tick===0?'#7498a8':'#d5e5ec'" :stroke-dasharray="tick===0?'':'3 4'" /><text :x="left-10" :y="y(tick)+4" text-anchor="end">{{ tick }}</text></g>
      <g v-for="(axis,index) in axes" :key="axis.name">
        <rect v-if="axis.min!=null" :x="x(index)-barWidth/2" :y="y(axis.max)" :width="barWidth" :height="Math.max(1.5,y(axis.min)-y(axis.max))" fill="#039acc" fill-opacity=".7"><title>{{ axis.name }}: {{ number(axis.min) }} … {{ number(axis.max) }} mm</title></rect>
        <rect v-if="axis.max>10" :x="x(index)-barWidth/2" :y="y(axis.max)" :width="barWidth" :height="y(Math.max(10,axis.min))-y(axis.max)" fill="#ee9b3b" />
        <rect v-if="axis.min!=null && axis.min < -10" :x="x(index)-barWidth/2" :y="y(Math.min(-10,axis.max))" :width="barWidth" :height="y(axis.min)-y(Math.min(-10,axis.max))" fill="#ee9b3b" />
        <text :x="x(index)" :y="height-14" text-anchor="middle" class="axis-label">{{ axis.name }}</text>
      </g>
      <g v-for="side in sides" :key="side.name" :class="'profile-'+side.name">
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
const outline='M0 62 C29 20 90 -3 168 0 C286 1 417 35 513 75 C442 89 112 94 23 87 C9 85 1 76 0 62 Z'
const sides=[{name:'right',color:'#006783'},{name:'left',color:'#e58d26'}]
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
