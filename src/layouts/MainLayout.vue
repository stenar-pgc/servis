<template>
  <q-layout v-if="session.user" view="lHh Lpr lFf">
    <q-header class="app-header text-dark" bordered>
      <q-toolbar class="q-px-lg">
        <q-btn
          flat
          round
          dense
          icon="menu"
          :aria-label="$t('navigation.openMenu')"
          class="lt-md q-mr-sm"
          @click="drawer = !drawer" />
        <div class="text-caption text-grey-7">
          {{ $t('common.workshop') }}
          <q-icon name="chevron_right" class="q-mx-sm" />
          <span class="text-dark">{{ $t(title) }}</span>
        </div>
        <q-space />
        <LanguageSwitcher class="q-mr-md" />
        <q-chip dense class="bg-teal-1 text-primary gt-xs" icon="verified_user">
          {{ $t(session.user.admin ? 'roles.admin' : 'roles.customer') }}
        </q-chip>
        <q-btn flat round to="/profil" class="q-ml-sm" :aria-label="$t('profile.title')">
          <q-avatar size="32px" color="primary" text-color="white" class="text-caption">{{ initials }}</q-avatar>
        </q-btn>
      </q-toolbar>
    </q-header>
    <q-drawer v-model="drawer" show-if-above :width="244" bordered class="app-drawer">
      <router-link to="/servisi" class="brand">
        <BrandLogo />
      </router-link>

      <q-list padding class="q-px-md">
        <q-item
          v-for="item in navigation"
          :key="item.to"
          clickable
          :to="item.to"
          active-class="nav-active"
          class="nav-item"
          :exact="item.to !== '/servisi'">
          <q-item-section avatar><q-icon :name="item.icon" size="21px" /></q-item-section>
          <q-item-section>{{ $t(item.label) }}</q-item-section>
        </q-item>
      </q-list>
      <div class="drawer-footer">
        <div class="row no-wrap items-center q-mb-md">
          <q-avatar color="grey-3" size="36px" text-color="primary">{{ initials }}</q-avatar>
          <div class="q-ml-sm ellipsis">
            <strong>{{ session.user.name }}</strong>
            <div class="text-caption text-grey-6 ellipsis">{{ session.user.mail }}</div>
          </div>
        </div>
        <q-btn flat no-caps dense icon="logout" :label="$t('auth.logout')" :loading="loggingOut" @click="logout" />
      </div>
    </q-drawer>
    <q-page-container><router-view :key="$route.path" /></q-page-container>
  </q-layout>
</template>
<script setup>
  import { computed, ref } from 'vue'
  import { useRoute, useRouter } from 'vue-router'
  import { useQuasar } from 'quasar'
  import LanguageSwitcher from '../components/LanguageSwitcher.vue'
  import BrandLogo from '../components/BrandLogo.vue'
  import { api, session } from '../services/api'
  const drawer = ref(false),
    loggingOut = ref(false),
    route = useRoute(),
    router = useRouter(),
    q = useQuasar()
  const navigation = computed(() => [
    {
      to: '/servisi',
      icon: 'build_circle',
      label: session.user.admin ? 'orders.adminTitle' : 'orders.myServices'
    },
    { to: '/oprema', icon: 'paragliding', label: session.user.admin ? 'equipment.register' : 'equipment.mine' },
    ...(session.user.admin
      ? [
          { to: '/stranke', icon: 'people_outline', label: 'customers.title' },
          { to: '/agencije', icon: 'handshake', label: 'agencies.title' },
          { to: '/popusti', icon: 'sell', label: 'discounts.title' },
          { to: '/placila', icon: 'account_balance_wallet', label: 'payouts.title' }
        ]
      : []),
    { to: '/profil', icon: 'person_outline', label: 'profile.title' }
  ])
  const title = computed(() => navigation.value.find(n => route.path.startsWith(n.to))?.label || 'Servis')
  const initials = computed(
    () =>
      session.user.name
        ?.split(' ')
        .map(n => n[0])
        .slice(0, 2)
        .join('') || 'S'
  )
  async function logout() {
    loggingOut.value = true
    try {
      await api('logout', {})
      session.user = null
      await router.push('/prijava')
    } catch (e) {
      q.notify({ type: 'negative', message: e.message })
    } finally {
      loggingOut.value = false
    }
  }
</script>
