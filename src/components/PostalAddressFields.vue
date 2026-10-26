<template>
  <div class="form-grid">
    <q-input
      v-if="withName"
      outlined
      :model-value="name"
      :label="$t('contact.recipient')"
      :rules="rules"
      :readonly="readonly"
      class="wide"
      @update:model-value="$emit('update:name', $event)" />
    <q-input
      outlined
      :model-value="address"
      :label="$t('contact.street')"
      :rules="rules"
      :readonly="readonly"
      class="wide"
      @update:model-value="$emit('update:address', $event)" />
    <q-input
      outlined
      :model-value="postalCode"
      :label="$t('contact.postalCode')"
      :rules="rules"
      :readonly="readonly"
      @update:model-value="$emit('update:postalCode', $event)" />
    <q-input
      outlined
      :model-value="city"
      :label="$t('contact.city')"
      :rules="rules"
      :readonly="readonly"
      @update:model-value="$emit('update:city', $event)" />
    <CountrySelect
      :model-value="country"
      :readonly="readonly"
      class="wide"
      @update:model-value="$emit('update:country', $event)" />
  </div>
</template>
<script setup>
  import { computed } from 'vue'
  import CountrySelect from './CountrySelect.vue'
  import { t } from '../i18n'

  const props = defineProps({
    name: String,
    address: String,
    postalCode: String,
    city: String,
    country: String,
    withName: Boolean,
    required: Boolean,
    readonly: Boolean
  })
  defineEmits(['update:name', 'update:address', 'update:postalCode', 'update:city', 'update:country'])
  const rules = computed(() =>
    props.required && !props.readonly ? [value => !!String(value || '').trim() || t('validation.required')] : []
  )
</script>
