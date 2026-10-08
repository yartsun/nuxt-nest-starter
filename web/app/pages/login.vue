<script setup lang="ts">
import { messageOf } from '~/utils/api-client'

definePageMeta({ middleware: 'guest' })

const route = useRoute()
const auth = useAuthStore()
const config = useRuntimeConfig()
const state = reactive({ email: '', password: '' })
const error = ref(oauthError(route.query.error))
const loading = ref(false)
const { data: providers } = await useAsyncData(
  'auth-providers',
  () => $fetch<{ google: boolean, github: boolean }>('/auth/providers', { baseURL: config.public.apiBase }),
  { server: false },
)

function oauthError(code: unknown) {
  return {
    account_exists: 'This email already has an account. Sign in with your password.',
    oauth_failed: 'Sign-in with the provider did not complete.',
    oauth_unavailable: 'That sign-in method is not configured.',
  }[String(code)] ?? ''
}

async function submit() {
  loading.value = true
  error.value = ''
  try {
    await auth.login(state.email, state.password)
    await navigateTo(typeof route.query.redirect === 'string' && route.query.redirect.startsWith('/') ? route.query.redirect : '/')
  }
  catch (err) {
    error.value = messageOf(err, 'Could not sign in')
  }
  finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="mx-auto max-w-sm space-y-6 py-8">
    <div class="text-center">
      <h1 class="text-2xl font-semibold text-highlighted">Sign in</h1>
      <p class="mt-1 text-sm text-muted">
        No account yet? <NuxtLink to="/register" class="text-primary">Create one</NuxtLink>
      </p>
    </div>
    <div v-if="providers?.google || providers?.github" class="grid gap-2">
      <UButton v-if="providers.google" :to="`${config.public.apiBase}/auth/google`" external icon="i-lucide-chrome" label="Continue with Google" color="neutral" variant="outline" block />
      <UButton v-if="providers.github" :to="`${config.public.apiBase}/auth/github`" external icon="i-lucide-github" label="Continue with GitHub" color="neutral" variant="outline" block />
      <USeparator label="or" class="my-2" />
    </div>
    <UForm :state="state" class="space-y-4" @submit="submit">
      <UAlert v-if="error" color="error" variant="subtle" icon="i-lucide-circle-alert" :title="error" />
      <UFormField label="Email" name="email" required>
        <UInput v-model="state.email" type="email" autocomplete="email" class="w-full" />
      </UFormField>
      <UFormField label="Password" name="password" required>
        <UInput v-model="state.password" type="password" autocomplete="current-password" class="w-full" />
      </UFormField>
      <UButton type="submit" label="Sign in" :loading="loading" block />
    </UForm>
  </div>
</template>
