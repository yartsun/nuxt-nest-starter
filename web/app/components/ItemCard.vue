<script setup lang="ts">
import type { Item } from '~/utils/types'

defineProps<{ item: Item, editable?: boolean, fresh?: boolean }>()
</script>

<template>
  <UCard
    class="flex h-full flex-col transition-shadow duration-700"
    :class="fresh ? 'ring-2 ring-primary shadow-lg' : ''"
    :ui="{ body: 'flex flex-1 flex-col gap-3' }"
  >
    <div class="flex items-start justify-between gap-3">
      <div class="min-w-0">
        <UBadge :label="item.category" color="neutral" variant="soft" size="sm" />
        <h3 class="mt-2 font-semibold text-highlighted">{{ item.name }}</h3>
      </div>
      <p class="shrink-0 text-lg font-semibold tabular-nums text-highlighted">{{ formatPrice(item.price) }}</p>
    </div>
    <p v-if="item.description" class="line-clamp-2 text-sm text-muted">{{ item.description }}</p>
    <div class="mt-auto flex flex-wrap items-center gap-1.5 pt-1">
      <UBadge v-if="!item.inStock" label="Out of stock" color="warning" variant="subtle" size="sm" />
      <UBadge v-for="tag in item.tags" :key="tag" :label="`#${tag}`" color="neutral" variant="outline" size="sm" />
      <UButton
        v-if="editable"
        :to="`/items/${item.id}/edit`"
        icon="i-lucide-pencil"
        color="neutral"
        variant="ghost"
        size="xs"
        class="ml-auto"
        aria-label="Edit item"
      />
    </div>
  </UCard>
</template>
