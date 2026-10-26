<template>
  <q-layout view="hHh lpR fFf">
    <q-header bordered class="app-header text-dark">
      <q-toolbar class="q-px-lg">
        <router-link to="/narocilo" class="brand q-pa-none">
          <BrandLogo compact />
        </router-link>
        <q-space />
        <LanguageSwitcher />
        <q-btn flat no-caps to="/prijava" :label="$t('auth.login')" class="q-ml-md" />
      </q-toolbar>
    </q-header>
    <q-page-container>
      <router-view />
    </q-page-container>
  </q-layout>
</template>
<script setup>
  import LanguageSwitcher from '../components/LanguageSwitcher.vue'
  import BrandLogo from '../components/BrandLogo.vue'
</script>
