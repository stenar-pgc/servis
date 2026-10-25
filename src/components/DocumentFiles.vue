<template>
  <div v-for="file in files" :key="file.id" class="row items-center no-wrap q-mt-sm">
    <q-icon name="picture_as_pdf" color="primary" size="24px" class="q-mr-md" />
    <div class="col">
      <div class="ellipsis">{{ file.filename }}</div>
      <div v-if="file.report_number" class="text-caption text-grey-7">{{ file.report_number }}</div>
    </div>
    <q-btn flat round dense icon="download" :aria-label="$t('documents.download')" @click="$emit('download', file)" />
    <q-btn
      v-if="editable"
      flat
      round
      dense
      icon="close"
      :aria-label="$t('documents.remove')"
      @click="$emit('remove', file)" />
  </div>
</template>
<script setup>
  defineProps({ files: { type: Array, default: () => [] }, editable: Boolean })
  defineEmits(['download', 'remove'])
</script>
