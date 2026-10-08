<script setup lang="ts">
import type { ItemPayload } from '~/components/ItemForm.vue'
import { messageOf } from '~/utils/api-client'
import type { Item } from '~/utils/types'

definePageMeta({ middleware: 'auth' })

const api = useApi()
const toast = useToast()
const error = ref('')
const loading = ref(false)

async function create(payload: ItemPayload) {
  loading.value = true
  error.value = ''
  try {
    const item = await api<Item>('/items', { method: 'POST', body: payload })
    toast.add({ title: 'Item added', description: item.name, color: 'success', icon: 'i-lucide-check' })
    await navigateTo('/')
  }
  catch (err) {
    error.value = messageOf(err, 'Could not save the item')
  }
  finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="mx-auto max-w-2xl space-y-6">
    <h1 class="text-2xl font-semibold text-highlighted">Add an item</h1>
    <UCard>
      <ItemForm submit-label="Add item" :error="error" :loading="loading" @submit="create" />
    </UCard>
  </div>
</template>
