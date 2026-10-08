<script setup lang="ts">
import type { FormError } from '@nuxt/ui'
import type { Item } from '~/utils/types'

export interface ItemPayload {
  name: string
  category: string
  price: number
  description: string
  tags: string[]
  inStock: boolean
}

const props = defineProps<{ initial?: Partial<Item>, submitLabel: string, error?: string, loading?: boolean }>()
const emit = defineEmits<{ submit: [ItemPayload] }>()

const state = reactive<ItemPayload>({
  name: props.initial?.name ?? '',
  category: props.initial?.category ?? '',
  price: props.initial?.price ?? 0,
  description: props.initial?.description ?? '',
  tags: [...(props.initial?.tags ?? [])],
  inStock: props.initial?.inStock ?? true,
})

function validate(value: Partial<ItemPayload>): FormError[] {
  const errors: FormError[] = []
  if (!value.name?.trim()) errors.push({ name: 'name', message: 'Required' })
  if (!value.category?.trim()) errors.push({ name: 'category', message: 'Required' })
  if (value.price === undefined || value.price < 0) errors.push({ name: 'price', message: 'Must be zero or more' })
  if ((value.tags?.length ?? 0) > 10) errors.push({ name: 'tags', message: 'At most 10 tags' })
  return errors
}
</script>

<template>
  <UForm :state="state" :validate="validate" class="space-y-5" @submit="emit('submit', { ...state, tags: [...state.tags] })">
    <UAlert v-if="error" color="error" variant="subtle" icon="i-lucide-circle-alert" :title="error" />
    <UFormField label="Name" name="name" required>
      <UInput v-model="state.name" maxlength="120" class="w-full" autofocus />
    </UFormField>
    <div class="grid gap-5 sm:grid-cols-2">
      <UFormField label="Category" name="category" required>
        <UInput v-model="state.category" maxlength="40" placeholder="Desk, Audio, Lighting…" class="w-full" />
      </UFormField>
      <UFormField label="Price" name="price" required>
        <UInputNumber
          v-model="state.price"
          :min="0"
          :step="0.01"
          :format-options="{ style: 'currency', currency: 'USD' }"
          class="w-full"
        />
      </UFormField>
    </div>
    <UFormField label="Tags" name="tags" help="Press Enter after each tag">
      <UInputTags v-model="state.tags" placeholder="Add a tag" class="w-full" />
    </UFormField>
    <UFormField label="Description" name="description">
      <UTextarea v-model="state.description" :rows="4" maxlength="2000" class="w-full" />
    </UFormField>
    <USwitch v-model="state.inStock" label="In stock" />
    <div class="flex gap-2">
      <UButton type="submit" :label="submitLabel" :loading="loading" />
      <slot name="actions" />
    </div>
  </UForm>
</template>
