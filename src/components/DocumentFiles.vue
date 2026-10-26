<template>
  <div v-if="files.length" class="document-files">
    <div v-for="file in files" :key="file.id" class="row items-center no-wrap">
      <q-icon name="picture_as_pdf" color="primary" size="24px" class="q-mr-sm" />
      <div class="col document-file-details">
        <button type="button" class="document-file-name" :title="file.filename" :aria-label="$t('documents.preview') + ': ' + file.filename" @click="previewFile = file">
          {{ file.filename }}
        </button>
        <div v-if="file.report_number" class="text-caption text-grey-7">{{ file.report_number }}</div>
      </div>
      <q-btn flat round dense icon="download" :aria-label="$t('documents.download')" @click="$emit('download', file)"><q-tooltip>{{ $t('documents.download') }}</q-tooltip></q-btn>
      <q-btn v-if="editable" flat round dense icon="edit" :aria-label="$t('documents.edit')" @click="$emit('edit', file)"><q-tooltip>{{ $t('documents.edit') }}</q-tooltip></q-btn>
      <q-btn
        v-if="editable"
        flat
        round
        dense
        icon="delete_outline"
        color="negative"
        :aria-label="$t('documents.remove')"
        @click="$emit('remove', file)"><q-tooltip>{{ $t('documents.remove') }}</q-tooltip></q-btn>
    </div>
  </div>
  <PdfPreview v-if="previewFile" :file="previewFile" @close="previewFile = null" @download="$emit('download', previewFile)" />
</template>
<script setup>
  import { ref } from 'vue'
  import PdfPreview from './PdfPreview.vue'
  defineProps({ files: { type: Array, default: () => [] }, editable: Boolean })
  defineEmits(['download', 'remove', 'edit'])
  const previewFile = ref(null)
</script>
<style scoped>
  .document-files {
    display: flex;
    flex-direction: column;
    gap: 8px;
    min-width: 0;
  }
  .document-file-details { min-width: 0; }
  .document-file-name {
    display: block;
    max-width: 100%;
    padding: 0;
    border: 0;
    background: transparent;
    color: var(--q-primary);
    font: inherit;
    text-align: left;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    cursor: pointer;
  }
  .document-file-name:hover { text-decoration: underline; }
</style>
