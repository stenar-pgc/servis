<template>
  <section v-if="customerId || equipmentId" class="related-records q-mb-lg">
    <div class="row items-center no-wrap q-gutter-md">
      <q-icon :name="equipmentId ? 'inventory_2' : 'person_outline'" size="30px" color="primary" />
      <div class="related-identity">
        <strong>{{ equipmentId ? equipmentLabel(equipment || {}) || $t('equipment.title') : customerName || $t('customers.customer') }}</strong>
        <div v-if="equipment?.serial" class="text-caption text-grey-7">{{ equipment.serial }}</div>
        <router-link v-if="equipment?.customer_id != null" :to="{ path: '/servisi', query: { customer: equipment.customer_id } }" class="text-caption text-primary">{{ equipment.customer_name }}</router-link>
      </div>
    </div>
    <div class="row items-center q-gutter-sm">
      <q-btn flat no-caps icon="build" :label="$t('services.title')" :class="route.path === '/servisi' ? 'bg-light-blue-1' : ''" :to="{ path: '/servisi', query: scope }" />
      <q-btn flat no-caps icon="inventory_2" :label="$t('equipment.title')" :class="route.path === '/oprema' ? 'bg-light-blue-1' : ''" :to="{ path: '/oprema', query: scope }" />
      <q-btn flat no-caps icon="close" :label="$t('related.clear')" :to="{ path: route.path, query: clearScope }" />
    </div>
  </section>
</template>
<script setup>
import {computed} from 'vue'
import {useRoute} from 'vue-router'
import {equipmentLabel} from '../services/records'
const props=defineProps({customerId:{type:String,default:''},customerName:{type:String,default:''},equipmentId:{type:String,default:''},equipment:{type:Object,default:null}})
const route=useRoute()
const scope=computed(()=>props.equipmentId?{equipment:props.equipmentId}:{customer:props.customerId})
const clearScope=computed(()=>Object.fromEntries(Object.entries(route.query).filter(([key])=>!['customer','equipment'].includes(key))))
</script>
<style scoped>
.related-records{display:flex;align-items:center;justify-content:space-between;gap:16px;padding:18px 20px;background:white;border:1px solid #dce7ec;border-radius:10px}.related-identity{min-width:0;overflow-wrap:anywhere}.related-identity strong{display:block}@media(max-width:750px){.related-records{align-items:flex-start;flex-direction:column}.related-records>.row:last-child{flex-wrap:wrap}}
</style>
