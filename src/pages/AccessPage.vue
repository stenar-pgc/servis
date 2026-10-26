<template>
  <q-page class="login-page flex flex-center">
    <q-card flat bordered class="login-wrap q-pa-lg">
      <q-card-section>
        <div class="eyebrow">STENAR SERVIS</div>
        <h1>{{ $t('auth.emailAccess') }}</h1>
        <p class="text-grey-7 q-mt-sm">{{ $t('auth.accessHint') }}</p>
      </q-card-section>
      <q-card-section v-if="opening" role="status">
        <q-spinner color="primary" class="q-mr-sm" />{{ $t('auth.openingAccount') }}
      </q-card-section>
      <q-form v-else @submit="requestLink" class="q-px-md q-pb-md q-gutter-md">
        <q-input
          outlined
          v-model="mail"
          type="email"
          autocomplete="email"
          :label="$t('contact.email')"
          :rules="[value => !!value || $t('validation.emailRequired')]" />
        <ErrorBanner :message="error" />
        <p v-if="sent" role="status">{{ $t('auth.accessSent') }}</p>
        <q-btn
          unelevated
          no-caps
          color="primary"
          type="submit"
          :label="$t(sent ? 'auth.resendEmail' : 'auth.sendAccess')"
          :loading="loading"
          class="full-width" />
      </q-form>
      <q-card-actions align="center">
        <q-btn flat no-caps to="/prijava" :label="$t('auth.backToLogin')" />
      </q-card-actions>
    </q-card>
  </q-page>
</template>
<script setup>
  import { onMounted, ref } from 'vue'
  import { useRoute, useRouter } from 'vue-router'
  import { api, session } from '../services/api'
  import ErrorBanner from '../components/ErrorBanner.vue'

  const route = useRoute()
  const router = useRouter()
  const mail = ref('')
  const error = ref('')
  const opening = ref(!!route.params.token)
  const loading = ref(false)
  const sent = ref(route.query.poslano === '1')

  async function requestLink() {
    error.value = ''
    sent.value = false
    loading.value = true
    try {
      await api('requestaccess', { mail: mail.value })
      sent.value = true
      if (route.params.token) await router.replace('/povezava-za-prijavo?poslano=1')
    } catch (e) {
      error.value = e.message
    } finally {
      loading.value = false
    }
  }

  onMounted(async () => {
    if (!route.params.token) return
    try {
      const result = await api('access', { token: route.params.token })
      session.user = result.user
      session.ready = true
      session.error = ''
      await router.replace(result.order_id ? '/servisi/' + result.order_id : '/servisi')
    } catch (e) {
      error.value = e.message
    } finally {
      opening.value = false
    }
  })
</script>
