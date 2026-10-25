<template>
  <q-layout>
    <q-page-container>
      <q-page class="login-page flex flex-center">
        <div class="login-wrap">
          <div class="row justify-end q-mb-lg"><LanguageSwitcher /></div>
          <div class="brand justify-center q-mb-xl">
            <img src="/favicon.svg" alt="" width="48" height="48" />
            <div>
              stenar
              <span>{{ $t('common.tagline') }}</span>
            </div>
          </div>
          <q-card flat bordered class="q-pa-lg">
            <q-card-section>
              <div class="eyebrow">{{ $t('auth.welcome') }}</div>
              <h1 class="q-mb-sm">{{ $t('auth.title') }}</h1>
              <p class="text-grey-7">
                {{ $t('auth.subtitle') }}
              </p>
            </q-card-section>
            <q-form @submit="submit" class="q-px-md q-pb-md q-gutter-md">
              <q-input
                outlined
                v-model="mail"
                :label="$t('contact.email')"
                type="email"
                autocomplete="username"
                :rules="[v => !!v || $t('validation.emailRequired')]" />
              <q-input
                outlined
                v-model="pass"
                :label="$t('auth.password')"
                type="password"
                autocomplete="current-password"
                :rules="[v => !!v || $t('validation.passwordRequired')]" />
              <ErrorBanner :message="error" />
              <q-btn
                unelevated
                no-caps
                color="primary"
                type="submit"
                :label="$t('auth.login')"
                icon-right="arrow_forward"
                class="full-width"
                :loading="loading" />
              <q-btn
                outline
                no-caps
                color="primary"
                to="/registracija"
                :label="$t('auth.createAccount')"
                class="full-width" />
              <q-btn outline no-caps color="primary" to="/narocilo" :label="$t('auth.guestOrder')" class="full-width" />
              <p class="text-caption text-grey-7 q-mb-none">
                {{ $t('auth.loginHint') }}
              </p>
              <a
                href="https://app.niceclouds.si/lostpass"
                target="_blank"
                rel="noopener"
                class="text-caption text-primary">
                {{ $t('auth.forgotPassword') }}
              </a>
            </q-form>
          </q-card>
          <p class="text-center text-caption text-grey-6 q-mt-lg">
            {{ $t('auth.footer') }}
          </p>
        </div>
      </q-page>
    </q-page-container>
  </q-layout>
</template>
<script setup>
  import { ref } from 'vue'
  import { useRouter } from 'vue-router'
  import { login, session } from '../services/api'
  import LanguageSwitcher from '../components/LanguageSwitcher.vue'
  import ErrorBanner from '../components/ErrorBanner.vue'
  const mail = ref(''),
    pass = ref(''),
    loading = ref(false),
    error = ref(''),
    router = useRouter()
  async function submit() {
    loading.value = true
    error.value = ''
    try {
      await login(mail.value, pass.value)
      await router.push('/servisi')
    } catch (e) {
      error.value = e.message
    } finally {
      loading.value = false
    }
  }
</script>
