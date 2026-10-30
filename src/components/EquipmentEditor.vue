<template>
  <q-dialog v-model="open">
    <q-card class="editor">
      <q-form @submit="save">
        <q-card-section class="row items-center">
          <h2>{{ $t(form.id ? 'equipment.edit' : 'equipment.new') }}</h2>
          <q-space />
          <q-btn flat round dense icon="close" v-close-popup :aria-label="$t('common.close')" />
        </q-card-section>
        <q-separator />
        <q-card-section class="form-grid">
          <q-select
            outlined
            dense
            v-model="form.type"
            :options="equipmentTypes"
            :display-value="translateText(form.type)"
            :label="$t('equipment.type')"
            class="wide">
            <template #option="scope">
              <q-item v-bind="scope.itemProps">
                <q-item-section>{{ translateText(scope.opt) }}</q-item-section>
              </q-item>
            </template>
          </q-select>
          <EquipmentModelFields
            v-model:manufacturer="form.manufacturer"
            v-model:model="form.model"
            :type="form.type"
            :required="!session.user.admin" />
          <q-input outlined dense v-model="form.size" :label="$t('equipment.size')" />
          <q-input
            outlined
            dense
            v-model="form.serial"
            :label="$t('equipment.serial') + (session.user.admin ? '' : ' *')"
            :rules="session.user.admin ? [] : [required]" />
          <q-input
            outlined
            dense
            type="date"
            v-model="form.first_use"
            :label="$t('equipment.firstUse')"
            stack-label />
          <CustomerSelect
            v-if="session.user.admin"
            outlined
            dense
            v-model="form.customer_id"
            :customers="customers"
            :label="$t('equipment.owner')"
            :hint="$t('equipment.ownerOptional')"
            clearable
            class="wide" />
          <div class="wide">
            <q-separator class="q-my-sm" />
            <h2 class="q-mt-md">{{ $t('equipment.externalInspection') }}</h2>
            <div v-if="form.service_inspected_at" class="text-body2 q-mt-sm">
              {{ $t('equipment.serviceInspection', { date: date(form.service_inspected_at), valid: date(form.service_valid_until) || '—', order: orderNumber(form.service_inspection_order_id) }) }}
            </div>
            <div class="text-caption text-grey-6 q-mt-xs">{{ $t('equipment.externalInspectionHint') }}</div>
          </div>
          <q-input
            outlined
            dense
            type="date"
            v-model="form.last_inspection"
            :label="$t('equipment.lastInspection')"
            stack-label
            @update:model-value="setExpiry" />
          <q-input
            outlined
            dense
            type="date"
            v-model="form.valid_until"
            :label="$t('equipment.validUntil')"
            stack-label />
          <div class="wide text-caption text-grey-6">
            {{ $t('equipment.expiryHint') }}
          </div>
        </q-card-section>
        <q-card-section v-if="error"><ErrorBanner :message="error" /></q-card-section>
        <q-card-actions align="right" class="q-pa-md">
          <q-btn flat no-caps :label="$t('common.cancel')" v-close-popup />
          <q-btn
            unelevated
            no-caps
            color="primary"
            type="submit"
            icon="check"
            :label="$t('equipment.save')"
            :loading="saving" />
        </q-card-actions>
      </q-form>
    </q-card>
  </q-dialog>
</template>
<script setup>
  import CustomerSelect from './CustomerSelect.vue'
  import { reactive, ref, watch } from 'vue'
  import { api, date, equipmentTypes, orderNumber, session } from '../services/api'
  import { t, translateText } from '../i18n'
  import ErrorBanner from './ErrorBanner.vue'
  import EquipmentModelFields from './EquipmentModelFields.vue'
  const open = defineModel({ type: Boolean }),
    props = defineProps({
      equipment: Object,
      customerId: [Number, String],
      customers: { type: Array, default: () => [] }
    }),
    emit = defineEmits(['saved'])
  const form = reactive({}),
    saving = ref(false),
    error = ref('')
  const required = value => !!value || t('validation.required')
  watch(open, value => {
    if (value) {
      for (const key in form) delete form[key]
      Object.assign(
        form,
        {
          type: 'Jadralno padalo',
          manufacturer: '',
          model: '',
          size: '',
          serial: '',
          customer_id: props.customerId || (session.user.admin ? null : session.user.id),
          first_use: '',
          last_inspection: '',
          valid_until: ''
        },
        props.equipment || {}
      )
      error.value = ''
    }
  })
  function setExpiry(value) {
    if (!value) return
    const d = new Date(value + 'T12:00:00')
    d.setFullYear(d.getFullYear() + 2)
    form.valid_until = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  }
  async function save() {
    saving.value = true
    error.value = ''
    try {
      const r = await api('saveequipment', form)
      open.value = false
      emit('saved', r.id)
    } catch (e) {
      error.value = e.message
    } finally {
      saving.value = false
    }
  }
</script>
