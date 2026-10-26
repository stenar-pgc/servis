<template>
  <q-page class="login-page flex flex-center">
    <q-card flat bordered class="login-wrap q-pa-lg">
      <q-card-section>

        <h1>{{ $t(activating ? 'auth.activationTitle' : 'auth.createAccount') }}</h1>
        <p class="text-grey-7 q-mt-sm">
          {{ $t(activating ? 'auth.activationHint' : 'auth.registerHint') }}
        </p>
      </q-card-section>
      <q-card-section v-if="registered">
        <q-icon name="mark_email_read" size="40px" color="primary" class="q-mb-md" />
        <h2>{{ $t('auth.checkEmail') }}</h2>
        <p class="q-mt-md">{{ $t('auth.accessHint') }}</p>
        <p class="text-grey-7">{{ form.mail }}</p>
        <ErrorBanner :message="error" />
        <q-btn outline no-caps color="primary" :label="$t('auth.resendEmail')" :loading="loading" @click="resend" />
      </q-card-section>
      <q-form v-else @submit="submit" class="q-px-md q-pb-md q-gutter-md">
        <template v-if="!activating">
          <div class="form-grid">
            <q-input
              outlined
              v-model="form.first"
              :label="$t('contact.firstName')"
              autocomplete="given-name"
              :rules="[required]" />
            <q-input
              outlined
              v-model="form.last"
              :label="$t('contact.lastName')"
              autocomplete="family-name"
              :rules="[required]" />
          </div>
          <q-input
            outlined
            v-model="form.mail"
            :label="$t('contact.email')"
            type="email"
            autocomplete="email"
            :rules="[required]" />
          <q-input
            outlined
            v-model="form.phone"
            :label="$t('contact.phone')"
            type="tel"
            autocomplete="tel"
            :rules="[required]" />
          <p class="text-caption text-grey-7">{{ $t('auth.accessHint') }}</p>
        </template>
        <template v-else>
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
        <ErrorBanner :message="error" />
        <q-btn
          unelevated
          no-caps
          color="primary"
          type="submit"
          :label="$t(activating ? 'auth.activate' : 'auth.createAccount')"
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
  import { reactive, ref } from 'vue'
  import { useRoute, useRouter } from 'vue-router'
  import { useQuasar } from 'quasar'
  import { api, session } from '../services/api'
  import { i18n, t } from '../i18n'
  import ErrorBanner from '../components/ErrorBanner.vue'

  const route = useRoute()
  const router = useRouter()
  const q = useQuasar()
  const activating = !!route.params.uid
  const registered = ref(false)
  const loading = ref(false)
  const error = ref('')
  const form = reactive({ first: '', last: '', mail: '', phone: '', pass: '', pass2: '' })
  const required = value => !!value || t('validation.required')

  async function submit() {
    loading.value = true
    error.value = ''
    try {
      if (activating) {
        const result = await api('activate', {
          uid: route.params.uid,
          token: route.params.token,
          pass: form.pass,
          pass2: form.pass2
        })
        session.user = result.user
        await router.push('/servisi')
      } else {
        const result = await api('register', { ...form, language: i18n.global.locale.value })
        registered.value = true
        if (!result.access_sent) error.value = t('errors.emailFailed')
      }
    } catch (e) {
      error.value = e.message
    } finally {
      loading.value = false
    }
  }

  async function resend() {
    loading.value = true
    error.value = ''
    try {
      await api('requestaccess', { mail: form.mail })
      q.notify({ type: 'positive', message: t('auth.accessSent') })
    } catch (e) {
      error.value = e.message
    } finally {
      loading.value = false
    }
  }
</script>
