<template>
  <q-select
    :model-value="selectedCustomer"
    :options="options"
    option-label="name"
    option-value="id"
    use-input
    hide-selected
    fill-input
    input-debounce="0"
    @filter="filter"
    @update:model-value="value => $emit('update:modelValue', value ? Number(value.id) : null)">
    <template #option="scope">
      <q-item v-bind="scope.itemProps">
        <q-item-section>
          <q-item-label>{{ scope.opt.name }}</q-item-label>
          <q-item-label caption>{{ scope.opt.mail }}</q-item-label>
        </q-item-section>
      </q-item>
    </template>
  </q-select>
</template>
<script setup>
  import { computed, ref } from 'vue'

  const props = defineProps({ modelValue: [Number, String], customers: { type: Array, default: () => [] } })
  defineEmits(['update:modelValue'])
  const search = ref('')
  const selectedCustomer = computed(() =>
    props.modelValue == null
      ? null
      : props.customers.find(customer => Number(customer.id) === Number(props.modelValue)) || null
  )
  const options = computed(() =>
    props.customers.filter(customer =>
      `${customer.name} ${customer.mail || ''}`.toLocaleLowerCase().includes(search.value.toLocaleLowerCase())
    )
  )
  function filter(value, update) {
    update(() => {
      search.value = value
    })
  }
</script>
