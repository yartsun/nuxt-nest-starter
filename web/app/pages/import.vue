<script setup lang="ts">
import { messageOf } from '~/utils/api-client'
import type { ImportResult } from '~/utils/types'

definePageMeta({ middleware: 'auth' })

const api = useApi()
const realtime = useRealtime()
const csv = ref('')
const error = ref('')
const jobId = ref<string | null>(null)
const progress = ref<{ processed: number, total: number } | null>(null)
const result = ref<ImportResult | null>(null)
const file = ref<HTMLInputElement | null>(null)
const busy = computed(() => Boolean(jobId.value) && !result.value && !error.value)

const template = `data:text/csv;charset=utf-8,${encodeURIComponent(CSV_TEMPLATE)}`

realtime.on<{ jobId: string, processed: number, total: number }>('import.progress', (event) => {
  if (event.jobId === jobId.value) progress.value = event
})
realtime.on<ImportResult>('import.completed', (event) => {
  if (event.jobId === jobId.value) result.value = event
})
realtime.on<{ jobId: string, reason: string }>('import.failed', (event) => {
  if (event.jobId === jobId.value) error.value = `Import failed: ${event.reason}`
})

async function readFile(event: Event) {
  const selected = (event.target as HTMLInputElement).files?.[0]
  if (selected) csv.value = await selected.text()
}

async function start() {
  error.value = ''
  result.value = null
  progress.value = null
  try {
    const job = await api<{ jobId: string, rows: number }>('/imports', { method: 'POST', body: { csv: csv.value } })
    jobId.value = job.jobId
    progress.value = { processed: 0, total: job.rows }
    if (!realtime.connected.value) void poll(job.jobId)
  }
  catch (err) {
    error.value = messageOf(err, 'Could not start the import')
  }
}

/** Fallback when the socket is down: ask the API until the job finishes. */
async function poll(id: string) {
  while (jobId.value === id && !result.value && !error.value) {
    await new Promise(resolve => setTimeout(resolve, 1500))
    const status = await api<{ state: string, result: ImportResult | null, failedReason: string | null }>(`/imports/${id}`)
    if (status.state === 'completed' && status.result) result.value = { ...status.result, jobId: id }
    if (status.state === 'failed') error.value = `Import failed: ${status.failedReason}`
  }
}
</script>

<template>
  <div class="mx-auto max-w-3xl space-y-6">
    <div>
      <h1 class="text-2xl font-semibold text-highlighted">Import from CSV</h1>
      <p class="mt-1 text-sm text-muted">
        The file is checked right away, then processed by the background worker. Progress arrives over the socket.
      </p>
    </div>

    <UCard :ui="{ body: 'space-y-4' }">
      <div class="flex flex-wrap gap-2">
        <UButton icon="i-lucide-file-up" label="Choose file" color="neutral" variant="outline" @click="file?.click()" />
        <UButton icon="i-lucide-download" label="Download template" color="neutral" variant="ghost" :to="template" download="catalog-template.csv" external />
        <UButton icon="i-lucide-clipboard-paste" label="Use template" color="neutral" variant="ghost" @click="csv = CSV_TEMPLATE" />
        <input ref="file" type="file" accept=".csv,text/csv" class="hidden" @change="readFile">
      </div>
      <UTextarea
        v-model="csv"
        :rows="10"
        class="w-full font-mono"
        placeholder="name,category,price,tags,in_stock,description"
        aria-label="CSV content"
      />
      <UAlert v-if="error" color="error" variant="subtle" icon="i-lucide-circle-alert" :title="error" />
      <UButton icon="i-lucide-upload" label="Start import" :disabled="!csv.trim() || busy" :loading="busy" @click="start" />
    </UCard>

    <UCard v-if="progress" :ui="{ body: 'space-y-4' }">
      <div class="flex items-center justify-between text-sm">
        <span class="font-medium text-highlighted">{{ result ? 'Import finished' : 'Importing…' }}</span>
        <span class="tabular-nums text-muted">{{ result ? progress.total : progress.processed }} / {{ progress.total }} rows</span>
      </div>
      <UProgress :model-value="result ? progress.total : progress.processed" :max="Math.max(progress.total, 1)" />
      <div v-if="result" class="space-y-3">
        <div class="flex gap-2">
          <UBadge :label="`${result.created} created`" color="success" variant="subtle" />
          <UBadge v-if="result.skipped" :label="`${result.skipped} skipped`" color="warning" variant="subtle" />
        </div>
        <ul v-if="result.errors.length" class="space-y-1 text-sm">
          <li v-for="row in result.errors" :key="row.line" class="text-muted">
            <span class="font-mono text-highlighted">line {{ row.line }}</span> — {{ row.message }}
          </li>
        </ul>
        <UButton to="/" label="Open the catalog" trailing-icon="i-lucide-arrow-right" variant="soft" />
      </div>
    </UCard>
  </div>
</template>
