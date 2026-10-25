<template>
  <q-expansion-item v-model="expanded" class="q-mt-lg" icon="checklist" :label="$t('services.quickSelect')">
    <div class="q-pt-md">
      <div v-for="group in groups" :key="group.id" class="service-item">
        <div class="row items-center no-wrap">
          <q-checkbox
            :model-value="selected[group.id]"
            :label="$t(group.label)"
            :disable="readonly"
            @update:model-value="value => toggle(group, value)"
            class="col" />
          <q-badge color="grey-2" text-color="dark">
            {{ group.from ? $t('common.from') + ' ' : '' }}{{ money(group.price) }}
            {{ group.id === 'repair' ? $t('services.perHour') : '' }}
          </q-badge>
        </div>
        <p v-if="group.id === 'inspection'" class="text-caption text-grey-7 q-mb-sm">{{ $t(group.note) }}</p>
        <p v-if="group.id === 'porosity' || group.id === 'measurement'" class="text-caption text-grey-7 q-mb-sm">
          {{ $t('services.standaloneHint') }}
        </p>
        <p
          v-if="validationAttempted && invalidGroups.includes(group.id)"
          role="alert"
          class="text-negative text-caption q-mb-sm">
          {{ $t('validation.serviceQuantity') }}
        </p>
        <div v-if="selected[group.id] && (group.quantities || group.note)" class="q-pa-sm">
          <div v-for="code in group.codes" :key="code">
            <div
              v-if="group.quantities && (code !== 'repair' || editing)"
              class="row no-wrap items-center bg-grey-1 rounded-borders q-pa-sm q-mb-sm">
              <div class="col q-pr-md">
                <div>{{ labels[code] ? $t(labels[code]) : translateText(item(code).label) }}</div>
                <div class="text-caption text-grey-7">
                  {{ money(price(item(code))) }} {{ $t(code === 'repair' ? 'services.perHour' : 'services.perItem') }}
                </div>
              </div>
              <q-btn
                flat
                round
                dense
                icon="remove"
                :disable="readonly || !quantities[code]"
                :aria-label="$t('services.decreaseQuantity')"
                @click="change(code, -1)" />
              <q-input
                outlined
                dense
                :model-value="quantities[code] || 0"
                type="number"
                min="0"
                max="999"
                :step="code === 'repair' ? 0.25 : 1"
                :aria-label="translateText(item(code).label)"
                :disable="readonly"
                style="width: 76px"
                @update:model-value="value => setQuantity(code, value)" />
              <q-btn
                flat
                round
                dense
                icon="add"
                :disable="readonly"
                :aria-label="$t('services.increaseQuantity')"
                @click="change(code, 1)" />
            </div>
          </div>
          <p v-if="group.note && group.id !== 'inspection'" class="text-caption text-grey-7 q-mb-sm">
            {{ $t(group.note) }}
          </p>
          <template v-if="group.id === 'inspection'">
            <q-checkbox v-model="english" :label="$t('services.englishReport')" :disable="readonly" />
            <q-checkbox
              v-model="photos"
              :label="$t('services.photosOption')"
              :disable="readonly || !wingCount"
              @update:model-value="value => setQuantity('photos', value ? wingCount : 0)" />
          </template>
        </div>
      </div>
    </div>
  </q-expansion-item>
</template>
<script setup>
  import { computed, reactive, ref, watch } from 'vue'
  import { useFormChild } from 'quasar'
  import { translateText } from '../i18n'
  import { money } from '../services/api'

  const quantities = defineModel('quantities', { type: Object, required: true })
  const english = defineModel('english', { type: Boolean, default: false })
  const props = defineProps({ catalog: Array, price: Function, readonly: Boolean, editing: Boolean })
  const selected = reactive({
    inspection: false,
    reserve: false,
    porosity: false,
    measurement: false,
    lines: false,
    repair: false
  })
  const expanded = ref(false)
  const photos = ref(false)
  const item = code => props.catalog.find(service => service.code === code) || { code, price: 0, label: '' }
  const labels = {
    basic: 'services.basicWings',
    advanced: 'services.advancedWings',
    solo: 'services.soloReserves',
    steer: 'services.steerableReserves',
    main: 'services.mainLine',
    side: 'services.secondaryLine',
    repair: 'services.workHours'
  }
  const groups = computed(() => [
    {
      id: 'inspection',
      label: 'services.inspection',
      codes: ['basic', 'advanced'],
      price: item('basic').price,
      from: true,
      quantities: true,
      note: 'services.inspectionIncludes'
    },
    {
      id: 'reserve',
      label: 'services.reserve',
      codes: ['solo', 'steer'],
      price: item('solo').price,
      from: true,
      quantities: true,
      note: 'services.reserveIncludes'
    },
    { id: 'porosity', label: 'catalog.porosity', codes: ['porosity'], price: item('porosity').price },
    {
      id: 'measurement',
      label: 'catalog.measurement',
      codes: ['measurement'],
      price: item('measurement').price
    },
    {
      id: 'lines',
      label: 'services.lines',
      codes: ['main', 'side'],
      price: item('side').price,
      from: true,
      quantities: true
    },
    {
      id: 'repair',
      label: 'services.repair',
      codes: ['repair'],
      price: item('repair').price,
      quantities: true,
      note: 'services.repairHint'
    }
  ])
  const validationAttempted = ref(false)
  const invalidGroups = computed(() =>
    groups.value
      .filter(
        group => selected[group.id] && group.quantities && !group.codes.some(code => Number(quantities.value[code]) > 0)
      )
      .map(group => group.id)
  )
  useFormChild({
    validate: () => {
      validationAttempted.value = true
      if (invalidGroups.value.length) expanded.value = true
      return props.readonly || invalidGroups.value.length === 0
    },
    resetValidation: () => {
      validationAttempted.value = false
    },
    requiresQForm: true
  })

  const wingCount = computed(() => Number(quantities.value.basic || 0) + Number(quantities.value.advanced || 0))

  watch(
    () => quantities.value,
    value => {
      for (const group of groups.value) {
        if (group.codes.some(code => Number(value[code]) > 0)) selected[group.id] = true
      }
      photos.value = Number(value.photos) > 0
    },
    { deep: true, immediate: true }
  )

  watch(wingCount, count => {
    if (Number(quantities.value.photos) > 0) setQuantity('photos', count)
  })

  function toggle(group, value) {
    selected[group.id] = value
    if (!value) {
      for (const code of group.codes) setQuantity(code, 0)
      if (group.id === 'inspection') {
        setQuantity('photos', 0)
        english.value = false
      }
    } else if (!group.quantities || group.id === 'repair') {
      setQuantity(group.codes[0], 1)
    }
  }

  function setQuantity(code, value) {
    let quantity = Math.max(0, Math.min(999, Number(value) || 0))
    if (code === 'photos') quantity = Math.min(quantity, wingCount.value)
    quantities.value = { ...quantities.value, [code]: quantity }
  }

  function change(code, delta) {
    setQuantity(code, Number(quantities.value[code] || 0) + delta)
  }
</script>
