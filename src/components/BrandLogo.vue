<template>
  <div class="stenar-logo" :class="{ 'stenar-logo-compact': compact }">
    <img src="/stenar-logo.png" alt="Stenar" width="160" height="56" />
    <span>SERVIS CENTER</span>
  </div>
</template>
<script setup>
  defineProps({ compact: Boolean })
</script>
<style scoped>
  .stenar-logo { display: flex; flex-direction: column; align-items: center; gap: 2px; }
  .stenar-logo img { display: block; width: 160px; height: 56px; object-fit: contain; filter: brightness(0); }
  .stenar-logo span { color: #df8100; font: 700 11px/1.3 Roboto, sans-serif; letter-spacing: 2.2px; }
  .stenar-logo-compact img { width: 108px; height: 38px; }
  .stenar-logo-compact span { font-size: 8px; letter-spacing: 1.8px; }
</style>
