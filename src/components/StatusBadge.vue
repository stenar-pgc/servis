<template>
  <q-badge rounded :color="status.bg" :text-color="status.color" class="status-badge">
    <span class="status-dot" />
    {{ $t(status.label) }}
  </q-badge>
</template>
<script setup>
  import { computed } from 'vue'
  import { statuses } from '../services/api'
  const props = defineProps({ value: String })
  const status = computed(() => statuses.find(s => s.value === props.value) || statuses[0])
</script>
