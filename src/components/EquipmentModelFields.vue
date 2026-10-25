<template>
  <q-select
    v-model="manufacturer"
    outlined
    dense
    use-input
    fill-input
    hide-selected
    new-value-mode="add-unique"
    :input-debounce="0"
    :options="manufacturerOptions"
    :label="$t('equipment.manufacturer') + (props.required ? ' *' : '')"
    :rules="props.required ? [required] : []"
    @filter="filterManufacturers"
    @input-value="value => (manufacturer = value)"
    @blur="manufacturer = manufacturer.trim()">
    <template #no-option>
      <q-item>
        <q-item-section class="text-grey-7">{{ $t('equipment.customSuggestion') }}</q-item-section>
      </q-item>
    </template>
  </q-select>
  <q-select
    v-model="model"
    outlined
    dense
    use-input
    fill-input
    hide-selected
    new-value-mode="add-unique"
    :input-debounce="0"
    :options="modelOptions"
    :label="$t('equipment.model') + (props.required ? ' *' : '')"
    :rules="props.required ? [required] : []"
    @filter="filterModels"
    @input-value="value => (model = value)"
    @blur="model = model.trim()">
    <template #no-option>
      <q-item>
        <q-item-section class="text-grey-7">{{ $t('equipment.customSuggestion') }}</q-item-section>
      </q-item>
    </template>
  </q-select>
</template>
<script setup>
  import { computed, ref, watch } from 'vue'
  import catalog from '../assets/paragliders.json'
  import { t } from '../i18n'

  const manufacturer = defineModel('manufacturer', { type: String, default: '' })
  const model = defineModel('model', { type: String, default: '' })
  const props = defineProps({
    type: { type: String, default: 'Jadralno padalo' },
    required: { type: Boolean, default: true }
  })
  const manufacturerOptions = ref(catalog.manufacturers.map(brand => brand.name))
  const modelOptions = ref([])
  const required = value => !!value?.trim() || t('validation.required')
  const normalize = value =>
    value
      .normalize('NFKC')
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '')
  const models = computed(() => {
    if (props.type !== 'Jadralno padalo') return []
    const name = normalize(manufacturer.value)
    const brand = catalog.manufacturers.find(brand =>
      [brand.name, ...brand.aliases].some(alias => normalize(alias) === name)
    )
    return brand?.models || []
  })

  watch(
    models,
    value => {
      modelOptions.value = value
    },
    { immediate: true }
  )

  function filterManufacturers(value, update) {
    const search = normalize(value)
    update(() => {
      manufacturerOptions.value = catalog.manufacturers
        .filter(brand => [brand.name, ...brand.aliases].some(name => normalize(name).includes(search)))
        .map(brand => brand.name)
    })
  }

  function filterModels(value, update) {
    const search = normalize(value)
    update(() => {
      modelOptions.value = models.value.filter(name => normalize(name).includes(search))
    })
  }
</script>
