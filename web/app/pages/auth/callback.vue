<script setup lang="ts">
// The API already set the refresh cookie; exchanging it here gives this tab an access token.
const auth = useAuthStore()
onMounted(async () => {
  await navigateTo((await auth.refresh()) ? '/' : '/login?error=oauth_failed', { replace: true })
})
</script>

<template>
  <div class="flex justify-center py-24 text-muted">
    <UIcon name="i-lucide-loader-circle" class="size-6 animate-spin" />
  </div>
</template>
