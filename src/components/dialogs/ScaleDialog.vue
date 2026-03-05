<script setup lang="ts">
import { ref, watch } from 'vue'
import { Ruler } from 'lucide-vue-next'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

const props = defineProps<{
  open: boolean
  measuredDistance: number
}>()

const emit = defineEmits<{
  close: []
  apply: [distanceMeters: number]
}>()

const realDistanceMeters = ref('')

watch(
  () => props.open,
  (isOpen) => {
    if (!isOpen) {
      return
    }

    realDistanceMeters.value = props.measuredDistance > 0 ? props.measuredDistance.toFixed(2) : ''
  },
)

function applyCalibration(): void {
  const parsedDistance = Number(realDistanceMeters.value)
  if (!Number.isFinite(parsedDistance) || parsedDistance <= 0) {
    return
  }

  emit('apply', parsedDistance)
}
</script>

<template>
  <div v-if="props.open" class="absolute inset-0 z-50 flex items-center justify-center bg-slate-900/30 p-4">
    <div class="w-full max-w-md rounded-xl border border-border bg-white p-5 shadow-xl">
      <div class="mb-2 flex items-center gap-2 text-lg font-semibold">
        <Ruler class="h-5 w-5" />
        Scale calibration
      </div>

      <p class="text-sm text-muted-foreground">
        Enter the real-world distance (meters) between the two picked points.
      </p>

      <div class="mt-4 space-y-2">
        <label class="text-sm font-medium">
          Distance in meters
          <Input v-model="realDistanceMeters" type="number" min="0.01" step="0.01" class="mt-1" />
        </label>
      </div>

      <div class="mt-5 flex justify-end gap-2">
        <Button variant="secondary" @click="emit('close')">Cancel</Button>
        <Button @click="applyCalibration">Apply scale</Button>
      </div>
    </div>
  </div>
</template>
