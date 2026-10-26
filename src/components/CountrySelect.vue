<template>
  <q-select
    outlined
    :model-value="modelValue"
    :options="filteredOptions"
    :label="label || $t('contact.country')"
    emit-value
    map-options
    use-input
    hide-selected
    fill-input
    input-debounce="0"
    @filter="filter"
    @update:model-value="$emit('update:modelValue', $event)" />
</template>
<script setup>
  import { computed, ref } from 'vue'
  import countries from '../assets/countries.json'
  import { i18n } from '../i18n'

  defineProps({ modelValue: String, label: String })
  defineEmits(['update:modelValue'])
  const search = ref('')
  const options = computed(() => {
    const locale = i18n.global.locale.value
    const names = new Intl.DisplayNames([locale], { type: 'region' })
    return countries
      .map(value => ({ value, label: names.of(value) }))
      .sort((a, b) => (a.value === 'SI' ? -1 : b.value === 'SI' ? 1 : a.label.localeCompare(b.label, locale)))
  })
  const filteredOptions = computed(() =>
    options.value.filter(option => option.label.toLocaleLowerCase().includes(search.value.toLocaleLowerCase()))
  )
  function filter(value, update) {
    update(() => {
      search.value = value
    })
  }
</script>
