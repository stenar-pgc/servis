<template>
  <q-page class="login-page flex flex-center">
    <q-card flat bordered class="login-wrap q-pa-lg">
      <q-card-section>
        <div class="eyebrow">STENAR SERVIS</div>
        <h1>{{ $t('auth.resetTitle') }}</h1>
        <p class="text-grey-7 q-mt-sm">{{ $t(settingPassword ? 'auth.activationHint' : 'auth.resetHint') }}</p>
      </q-card-section>
      <q-form @submit="submit" class="q-px-md q-pb-md q-gutter-md">
        <template v-if="settingPassword">
          <q-input
            outlined
            v-model="form.pass"
            :label="$t('auth.newPassword')"
            type="password"
            autocomplete="new-password"
            :rules="[value => value.length >= 8 || $t('auth.passwordLength')]" />
          <q-input
            outlined
            v-model="form.pass2"
            :label="$t('auth.repeatPassword')"
            type="password"
            autocomplete="new-password"
            :rules="[value => value === form.pass || $t('validation.passwordMismatch')]" />
        </template>
        <q-input
          v-else
          outlined
          v-model="form.mail"
          :label="$t('contact.email')"
          type="email"
          autocomplete="email"
          :rules="[value => !!value || $t('validation.emailRequired')]" />
        <ErrorBanner :message="error" />
        <p v-if="sent" role="status">{{ $t('auth.resetSent') }}</p>
        <q-btn
          unelevated
          no-caps
          color="primary"
          type="submit"
          :label="$t(settingPassword ? 'auth.savePassword' : sent ? 'auth.resendEmail' : 'auth.sendReset')"
          :loading="loading"
          class="full-width" />
        <q-btn v-if="settingPassword" flat no-caps to="/pozabljeno-geslo" :label="$t('auth.requestNewLink')" />
      </q-form>
      <q-card-actions align="center">
        <q-btn flat no-caps to="/prijava" :label="$t('auth.backToLogin')" />
      </q-card-actions>
    </q-card>
  </q-page>
</template>
<script setup>
  import { computed, reactive, ref } from 'vue'
  import { useRoute, useRouter } from 'vue-router'
  import { api, session } from '../services/api'
  import { t } from '../i18n'
  import ErrorBanner from '../components/ErrorBanner.vue'

  const route = useRoute()
  const router = useRouter()
  const settingPassword = computed(() => !!route.params.uid)
  const form = reactive({ mail: '', pass: '', pass2: '' })
  const sent = ref(false)
  const loading = ref(false)
  const error = ref('')

  async function submit() {
    loading.value = true
    error.value = ''
    sent.value = false
    try {
      if (settingPassword.value) {
        const result = await api('activate', {
          uid: route.params.uid,
          token: route.params.token,
          pass: form.pass,
          pass2: form.pass2
        })
        session.user = result.user
        await router.push('/servisi')
      } else {
        await api('reset', { mail: form.mail })
        sent.value = true
      }
    } catch (e) {
      error.value = settingPassword.value && e.message === t('errors.activationExpired')
        ? t('auth.resetExpired')
        : e.message
    } finally {
      loading.value = false
    }
  }
</script>
