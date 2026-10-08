<script setup lang="ts">
import type { FormError } from '@nuxt/ui'
import { messageOf } from '~/utils/api-client'

definePageMeta({ middleware: 'guest' })

const auth = useAuthStore()
const state = reactive({ name: '', email: '', password: '' })
const error = ref('')
const loading = ref(false)

const validate = (value: typeof state): FormError[] =>
  value.password && value.password.length < 10 ? [{ name: 'password', message: 'At least 10 characters' }] : []

async function submit() {
  loading.value = true
  error.value = ''
  try {
    await auth.register(state.name, state.email, state.password)
    await navigateTo('/')
  }
  catch (err) {
    error.value = messageOf(err, 'Could not create the account')
  }
  finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="mx-auto max-w-sm space-y-6 py-8">
    <div class="text-center">
      <h1 class="text-2xl font-semibold text-highlighted">Create an account</h1>
      <p class="mt-1 text-sm text-muted">
        Already registered? <NuxtLink to="/login" class="text-primary">Sign in</NuxtLink>
      </p>
    </div>
    <UForm :state="state" :validate="validate" class="space-y-4" @submit="submit">
      <UAlert v-if="error" color="error" variant="subtle" icon="i-lucide-circle-alert" :title="error" />
      <UFormField label="Name" name="name" required>
        <UInput v-model="state.name" autocomplete="name" class="w-full" />
      </UFormField>
      <UFormField label="Email" name="email" required>
        <UInput v-model="state.email" type="email" autocomplete="email" class="w-full" />
      </UFormField>
      <UFormField label="Password" name="password" required help="At least 10 characters">
        <UInput v-model="state.password" type="password" autocomplete="new-password" class="w-full" />
      </UFormField>
      <UButton type="submit" label="Create account" :loading="loading" block />
    </UForm>
  </div>
</template>
