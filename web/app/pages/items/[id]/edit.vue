<script setup lang="ts">
import type { ItemPayload } from '~/components/ItemForm.vue'
import { messageOf } from '~/utils/api-client'
import type { Item } from '~/utils/types'

definePageMeta({ middleware: 'auth' })

const route = useRoute()
const api = useApi()
const auth = useAuthStore()
const toast = useToast()
const id = String(route.params.id)
const error = ref('')
const saving = ref(false)
const { data: item, error: loadError } = await useAsyncData(`item-${id}`, () => api<Item>(`/items/${id}`))
const owner = computed(() => item.value?.ownerId === auth.user?.id)

async function save(payload: ItemPayload) {
  saving.value = true
  error.value = ''
  try {
    await api<Item>(`/items/${id}`, { method: 'PATCH', body: payload })
    toast.add({ title: 'Saved', color: 'success', icon: 'i-lucide-check' })
    await navigateTo('/')
  }
  catch (err) {
    error.value = messageOf(err, 'Could not save the item')
  }
  finally {
    saving.value = false
  }
}

async function remove() {
  if (!window.confirm(`Delete "${item.value?.name}"?`)) return
  try {
    await api(`/items/${id}`, { method: 'DELETE' })
    toast.add({ title: 'Deleted', icon: 'i-lucide-trash-2' })
    await navigateTo('/')
  }
  catch (err) {
    error.value = messageOf(err, 'Could not delete the item')
  }
}
</script>

<template>
  <div class="mx-auto max-w-2xl space-y-6">
    <h1 class="text-2xl font-semibold text-highlighted">Edit item</h1>
    <UAlert v-if="loadError" color="error" variant="subtle" title="This item does not exist anymore." />
    <UAlert v-else-if="item && !owner" color="warning" variant="subtle" title="Only the owner can edit this item." />
    <UCard v-else-if="item">
      <ItemForm :initial="item" submit-label="Save changes" :error="error" :loading="saving" @submit="save">
        <template #actions>
          <UButton label="Delete" color="error" variant="ghost" icon="i-lucide-trash-2" class="ml-auto" @click="remove" />
        </template>
      </ItemForm>
    </UCard>
  </div>
</template>
