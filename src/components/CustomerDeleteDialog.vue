<template>
  <q-dialog :model-value="true" :persistent="deleting" @hide="$emit('close')">
    <q-card class="editor">
      <q-card-section>
        <h2>{{ $t('customers.deleteTitle') }}</h2>
        <p class="q-mt-md">{{ $t('customers.deleteReview', { name: customer.name }) }}</p>
        <div v-if="loading" class="q-pa-md text-center"><q-spinner color="primary" /></div>
        <template v-else-if="preview">
          <div class="bg-grey-1 rounded-borders q-pa-md q-mb-md">
            <div v-for="(count, key) in preview.counts" :key="key" class="row justify-between q-mb-xs">
              <span>{{ $t(countLabels[key]) }}</span><strong>{{ count }}</strong>
            </div>
          </div>
          <p class="text-grey-7">{{ $t(preview.has_account ? 'customers.deleteAccountHint' : 'customers.deleteContactHint') }}</p>
          <q-checkbox v-model="deleteRelated" :disable="preview.self" :label="$t('customers.deleteRelated')" />
          <p class="text-caption text-grey-7 q-ml-xl">{{ $t('customers.deleteRelatedHint') }}</p>
          <p v-if="needsRelated && !deleteRelated" class="text-caption text-negative">{{ $t('errors.customerDeleteRelated') }}</p>
          <p v-if="preview.self" class="text-negative">{{ $t('errors.deleteSelf') }}</p>
        </template>
        <ErrorBanner :message="error" :retry="!preview" @retry="load" />
      </q-card-section>
      <q-card-actions align="right">
        <q-btn flat no-caps :label="$t('common.cancel')" v-close-popup :disable="deleting" />
        <q-btn unelevated no-caps color="negative" :label="$t('common.delete')" :disable="loading || !preview || preview.self || (needsRelated && !deleteRelated)" :loading="deleting" @click="remove" />
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>
<script setup>
  import { computed, onMounted, ref } from 'vue'
  import { api } from '../services/api'
  import ErrorBanner from './ErrorBanner.vue'

  const props = defineProps({ customer: { type: Object, required: true } })
  const emit = defineEmits(['close', 'deleted'])
  const preview = ref(null)
  const loading = ref(true)
  const deleting = ref(false)
  const deleteRelated = ref(false)
  const error = ref('')
  const countLabels = { orders: 'services.title', equipment: 'equipment.title', documents: 'documents.title', agencies: 'agencies.title', payments: 'payouts.title' }
  const needsRelated = computed(() => preview.value && !preview.value.has_account && (preview.value.counts.orders || preview.value.counts.equipment || preview.value.counts.agencies))
  async function load() {
    loading.value = true
    error.value = ''
    try { preview.value = await api('customerdeletion', { id: props.customer.id }) }
    catch (e) { error.value = e.message }
    finally { loading.value = false }
  }
  async function remove() {
    deleting.value = true
    error.value = ''
    try {
      await api('deletecustomer', { id: props.customer.id, delete_related: deleteRelated.value })
      emit('deleted')
    } catch (e) { error.value = e.message }
    finally { deleting.value = false }
  }
  onMounted(load)
</script>
