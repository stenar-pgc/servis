<template>
  <q-banner v-if="message" rounded class="bg-red-1 text-negative q-mb-md" role="alert">
    <template #avatar><q-icon name="error_outline" /></template>
    {{ message }}
    <template v-if="retry" #action>
      <q-btn flat no-caps :label="$t('common.retry')" @click="$emit('retry')" />
    </template>
  </q-banner>
</template>
<script setup>
  defineProps({ message: String, retry: Boolean })
  defineEmits(['retry'])
</script>
