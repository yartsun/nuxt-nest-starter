<script setup lang="ts">
const auth = useAuthStore()
const { connected } = useRealtime()
const route = useRoute()

const links = computed(() => [
  { label: 'Catalog', to: '/', icon: 'i-lucide-layout-grid' },
  ...(auth.isAuthenticated
    ? [
        { label: 'Add item', to: '/items/new', icon: 'i-lucide-plus' },
        { label: 'Import CSV', to: '/import', icon: 'i-lucide-upload' },
      ]
    : []),
])

const userMenu = computed(() => [
  [{ label: auth.user?.email ?? '', type: 'label' as const }],
  [{ label: 'Sign out', icon: 'i-lucide-log-out', onSelect: () => signOut() }],
])

async function signOut() {
  await auth.logout()
  await navigateTo('/')
}
</script>

<template>
  <div class="min-h-screen bg-default">
    <header class="sticky top-0 z-30 border-b border-default bg-default/85 backdrop-blur">
      <UContainer class="flex h-16 items-center gap-6">
        <NuxtLink to="/" class="flex items-center gap-2 font-semibold text-highlighted">
          <span class="grid size-8 place-items-center rounded-lg bg-primary text-inverted">
            <UIcon name="i-lucide-layers" class="size-4" />
          </span>
          Starter
        </NuxtLink>
        <ClientOnly>
          <nav class="hidden items-center gap-1 sm:flex">
            <UButton
              v-for="link in links"
              :key="link.to"
              :to="link.to"
              :icon="link.icon"
              :label="link.label"
              color="neutral"
              :variant="route.path === link.to ? 'soft' : 'ghost'"
              size="sm"
            />
          </nav>
        </ClientOnly>
        <div class="ml-auto flex items-center gap-2">
          <UBadge :color="connected ? 'success' : 'neutral'" variant="subtle" class="gap-1.5">
            <span class="size-1.5 rounded-full" :class="connected ? 'bg-success' : 'bg-dimmed'" />
            {{ connected ? 'Live' : 'Offline' }}
          </UBadge>
          <UColorModeButton />
          <ClientOnly>
            <UDropdownMenu v-if="auth.user" :items="userMenu">
              <UButton color="neutral" variant="ghost" trailing-icon="i-lucide-chevron-down">
                <UAvatar :src="auth.user.avatarUrl ?? undefined" :alt="auth.user.name" size="xs" />
                <span class="hidden md:inline">{{ auth.user.name }}</span>
              </UButton>
            </UDropdownMenu>
            <UButton v-else to="/login" label="Sign in" size="sm" />
          </ClientOnly>
        </div>
      </UContainer>
      <ClientOnly>
        <nav v-if="links.length > 1" class="flex gap-1 overflow-x-auto border-t border-default px-4 py-2 sm:hidden">
          <UButton
            v-for="link in links"
            :key="link.to"
            :to="link.to"
            :icon="link.icon"
            :label="link.label"
            color="neutral"
            :variant="route.path === link.to ? 'soft' : 'ghost'"
            size="xs"
          />
        </nav>
      </ClientOnly>
    </header>
    <UContainer as="main" class="py-8">
      <slot />
    </UContainer>
  </div>
</template>
