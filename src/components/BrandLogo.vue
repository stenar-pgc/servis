<template>
  <div class="stenar-logo" :class="{ 'stenar-logo-compact': compact }">
    <img src="/stenar-logo.png" alt="Stenar" width="160" height="72" />
  </div>
</template>
<script setup>
  defineProps({ compact: Boolean })
</script>
<style scoped>
  .stenar-logo { display: flex; flex-direction: column; align-items: center; gap: 2px; }
  .stenar-logo img { display: block; width: 160px; height: 72px; object-fit: contain; }
  .stenar-logo-compact img { width: 108px; height: 49px; }
</style>
