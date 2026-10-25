<template>
  <q-btn-toggle
    v-model="locale"
    flat
    dense
    no-caps
    toggle-color="primary"
    :options="[
      { label: 'SL', value: 'sl' },
      { label: 'EN', value: 'en' }
    ]"
    aria-label="Jezik / Language" />
</template>
<script setup>
  import { useI18n } from 'vue-i18n'
  const { locale } = useI18n({ useScope: 'global' })
</script>
