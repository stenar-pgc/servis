<template>
  <button type="button" class="stat-card summary-stat-card" :class="{ 'summary-stat-card-active': active }" :aria-pressed="active" @click="$emit('select')">
    <div class="summary-stat-details">
      <div class="number">{{ count }}</div>
      <span class="summary-stat-label">{{ label }}</span>
    </div>
    <q-icon :name="icon" size="32px" :class="iconClass" />
  </button>
</template>
<script setup>
  defineProps({ label: String, count: [Number, String], icon: String, iconClass: String, active: Boolean })
  defineEmits(['select'])
</script>
<style scoped>
  .summary-stat-card {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
    width: 100%;
    min-height: 128px;
    padding: 22px;
    color: inherit;
    font: inherit;
    text-align: left;
    cursor: pointer;
    transition: border-color 150ms, box-shadow 150ms, transform 150ms;
  }
  .summary-stat-card:hover {
    border-color: #82bdd1;
    box-shadow: 0 4px 14px #153f4b12;
    transform: translateY(-2px);
  }
  .summary-stat-card:focus-visible { outline: 2px solid var(--q-primary); outline-offset: 3px; }
  .summary-stat-card-active { border-color: var(--q-primary); box-shadow: inset 0 0 0 1px var(--q-primary); }
  .summary-stat-details { min-width: 0; }
  .summary-stat-card .number { margin: 0 0 6px; font-size: 34px; }
  .summary-stat-label { color: #627d88; font-size: 13px; line-height: 1.4; }
  .summary-stat-card .q-icon { flex-shrink: 0; padding: 12px; border-radius: 50%; }
  @media (max-width: 599px) {
    .summary-stat-card { padding: 16px; gap: 10px; }
    .summary-stat-card .q-icon { padding: 9px; }
  }
  @media (prefers-reduced-motion: reduce) {
    .summary-stat-card { transition: none; }
    .summary-stat-card:hover { transform: none; }
  }
</style>
