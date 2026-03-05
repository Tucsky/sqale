<script setup lang="ts">
import { Settings } from 'lucide-vue-next'

import { Button } from '@/components/ui/button'

const props = defineProps<{
  open: boolean
  metersPerPixel: number
  gridSnap: boolean
}>()

const emit = defineEmits<{
  close: []
  updateGridSnap: [enabled: boolean]
}>()
</script>

<template>
  <div v-if="props.open" class="absolute inset-0 z-40 flex items-center justify-center bg-slate-900/30 p-4">
    <div class="w-full max-w-md rounded-xl border border-border bg-white p-5 shadow-xl">
      <div class="mb-4 flex items-center gap-2 text-lg font-semibold">
        <Settings class="h-5 w-5" />
        Settings
      </div>

      <div class="space-y-3 text-sm">
        <div class="rounded-lg bg-muted p-3">
          Current scale: <strong>1 px = {{ props.metersPerPixel.toFixed(4) }} m</strong>
        </div>

        <label class="flex items-center gap-2 rounded-lg border border-border p-3">
          <input
            type="checkbox"
            :checked="props.gridSnap"
            @change="emit('updateGridSnap', ($event.target as HTMLInputElement).checked)"
          />
          Enable grid snapping when moving furniture
        </label>
      </div>

      <div class="mt-5 flex justify-end">
        <Button variant="secondary" @click="emit('close')">Close</Button>
      </div>
    </div>
  </div>
</template>
