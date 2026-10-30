<template>
  <q-dialog :model-value="true" :maximized="$q.screen.lt.sm" :aria-label="file.filename" @hide="$emit('close')">
    <q-card class="pdf-preview column no-wrap" :class="{ 'pdf-preview-mobile': $q.screen.lt.sm }">
      <q-toolbar class="q-px-md">
        <q-icon name="picture_as_pdf" color="primary" size="26px" class="q-mr-sm" />
        <q-toolbar-title class="text-body1 ellipsis">{{ file.filename }}</q-toolbar-title>
        <q-btn flat round icon="download" :aria-label="$t('documents.download')" @click="$emit('download')" />
        <q-btn flat round icon="close" :aria-label="$t('common.close')" v-close-popup />
      </q-toolbar>
      <q-separator />
      <div v-if="loading" class="col flex flex-center" role="status" :aria-label="$t('documents.loading')">
        <q-spinner color="primary" size="40px" />
      </div>
      <div v-else-if="error" class="col q-pa-md">
        <ErrorBanner :message="error" retry @retry="load" />
      </div>
      <iframe v-else-if="url" :src="url" :title="file.filename" class="col pdf-preview-frame" />
    </q-card>
  </q-dialog>
</template>
<script setup>
  import { onBeforeUnmount, ref, watch } from 'vue'
  import { endpoint } from '../services/api'
  import { t } from '../i18n'
  import ErrorBanner from './ErrorBanner.vue'

  const props = defineProps({ file: { type: Object, required: true } })
  defineEmits(['close', 'download'])
  const loading = ref(false)
  const error = ref('')
  const url = ref('')
  let controller

  function clear() {
    controller?.abort()
    if (url.value) URL.revokeObjectURL(url.value)
    url.value = ''
  }

  async function load() {
    clear()
    const request = new AbortController()
    controller = request
    loading.value = true
    error.value = ''
    try {
      const response = await fetch(endpoint('document/' + props.file.id), {
        credentials: 'include',
        signal: request.signal
      })
      if (!response.ok) throw new Error(t('documents.previewFailed'))
      const blob = new Blob([await response.blob()], { type: 'application/pdf' })
      if (!request.signal.aborted) url.value = URL.createObjectURL(blob)
    } catch (e) {
      if (!request.signal.aborted) error.value = t('documents.previewFailed')
    } finally {
      if (!request.signal.aborted) loading.value = false
    }
  }

  watch(() => props.file.id, load, { immediate: true })
  onBeforeUnmount(clear)
</script>
<style scoped>
  .pdf-preview { width: 1100px; max-width: 95vw; height: 90vh; max-height: 95vh; }
  .pdf-preview-mobile { width: 100%; max-width: 100%; height: 100%; max-height: 100%; }
  .pdf-preview-frame { width: 100%; min-height: 0; border: 0; background: #edf0ee; }
</style>
