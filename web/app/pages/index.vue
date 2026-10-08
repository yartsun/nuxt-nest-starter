<script setup lang="ts">
import type { Item, SearchResult } from '~/utils/types'

const PAGE = 24
const route = useRoute()
const router = useRouter()
const api = useApi()
const auth = useAuthStore()
const toast = useToast()
const realtime = useRealtime()

const state = reactive(parseCatalogQuery(route.query))
const input = ref(state.q)
const more = ref<Item[]>([])
const loadingMore = ref(false)
const fresh = ref(new Set<string>())

let typing: ReturnType<typeof setTimeout> | undefined
watch(input, (value) => {
  clearTimeout(typing)
  typing = setTimeout(() => (state.q = value), 250)
})

const { data, status, refresh } = await useAsyncData(
  'catalog',
  () => api<SearchResult>('/search', { query: toSearchParams(state, PAGE) }),
  { watch: [() => JSON.stringify(state)] },
)

watch(() => JSON.stringify(state), () => {
  more.value = []
  router.replace({ query: toRouteQuery(state) })
})

const items = computed(() => [...(data.value?.hits ?? []), ...more.value])
const categories = computed(() => Object.entries(data.value?.categories ?? {}).sort(([a], [b]) => a.localeCompare(b)))
const allCount = computed(() => categories.value.reduce((sum, [, count]) => sum + count, 0))

async function loadMore() {
  loadingMore.value = true
  try {
    const page = await api<SearchResult>('/search', { query: toSearchParams(state, PAGE, items.value.length) })
    more.value.push(...page.hits)
  }
  finally {
    loadingMore.value = false
  }
}

// Live updates: a toast for other people's items, and a refetch once the worker has indexed.
realtime.on<Item>('item.created', (item) => {
  if (item.ownerId !== auth.user?.id) toast.add({ title: 'New item', description: item.name, icon: 'i-lucide-sparkles' })
  fresh.value.add(item.id)
  setTimeout(() => fresh.value.delete(item.id), 4000)
})
let pending: ReturnType<typeof setTimeout> | undefined
realtime.on('search.updated', () => {
  clearTimeout(pending)
  pending = setTimeout(() => {
    more.value = []
    refresh()
  }, 300)
})

const sorts = [
  { label: 'Best match', value: 'relevance' },
  { label: 'Price: low to high', value: 'price_asc' },
  { label: 'Price: high to low', value: 'price_desc' },
  { label: 'Newest', value: 'newest' },
]
</script>

<template>
  <div class="space-y-6">
    <div class="flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 class="text-2xl font-semibold text-highlighted">Catalog</h1>
        <p class="mt-1 text-sm text-muted">
          Typo-tolerant search by Meilisearch. Changes from other people appear without a reload.
        </p>
      </div>
      <ClientOnly>
        <UButton v-if="auth.isAuthenticated" to="/items/new" icon="i-lucide-plus" label="Add item" />
      </ClientOnly>
    </div>

    <div class="flex flex-col gap-3 sm:flex-row">
      <UInput
        v-model="input"
        icon="i-lucide-search"
        placeholder="Search name, tags or description…"
        size="lg"
        class="flex-1"
        :loading="status === 'pending'"
        aria-label="Search the catalog"
      />
      <USelect v-model="state.sort" :items="sorts" size="lg" class="sm:w-52" aria-label="Sort" />
      <USwitch v-model="state.inStock" label="In stock only" class="self-center" />
    </div>

    <div class="flex flex-wrap gap-2">
      <UButton
        :label="`All · ${allCount}`"
        size="sm"
        :color="state.category ? 'neutral' : 'primary'"
        :variant="state.category ? 'outline' : 'solid'"
        @click="state.category = ''"
      />
      <UButton
        v-for="[name, count] in categories"
        :key="name"
        :label="`${name} · ${count}`"
        size="sm"
        :color="state.category === name ? 'primary' : 'neutral'"
        :variant="state.category === name ? 'solid' : 'outline'"
        @click="state.category = state.category === name ? '' : name"
      />
    </div>

    <p v-if="data" class="text-sm text-muted">
      {{ data.total }} {{ data.total === 1 ? 'result' : 'results' }} · {{ data.processingTimeMs }} ms
    </p>

    <UEmpty
      v-if="data && !items.length"
      icon="i-lucide-search-x"
      title="Nothing found"
      description="Try another word or clear the filters."
    />
    <div v-else class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      <ItemCard
        v-for="item in items"
        :key="item.id"
        :item="item"
        :fresh="fresh.has(item.id)"
        :editable="Boolean(auth.user) && item.ownerId === auth.user?.id"
      />
    </div>

    <div v-if="data && items.length < data.total" class="flex justify-center">
      <UButton label="Load more" color="neutral" variant="outline" :loading="loadingMore" @click="loadMore" />
    </div>
  </div>
</template>
