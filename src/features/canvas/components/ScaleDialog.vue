<script setup lang="ts">
import { ref, watch } from 'vue'
import { Ruler } from 'lucide-vue-next'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
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
  <Dialog :open="props.open" @update:open="(value) => !value && emit('close')">
    <DialogContent class="sm:max-w-md">
      <DialogHeader>
        <DialogTitle class="flex items-center gap-2">
          <Ruler class="h-5 w-5" />
          Scale calibration
        </DialogTitle>
        <DialogDescription>Enter the real-world distance (meters) between the two picked points.</DialogDescription>
      </DialogHeader>

      <div class="space-y-2">
        <label class="text-sm font-medium">
          Distance in meters
          <Input v-model="realDistanceMeters" type="number" min="0.01" step="0.01" class="mt-1" />
        </label>
      </div>

      <DialogFooter class="gap-2">
        <Button variant="secondary" @click="emit('close')">Cancel</Button>
        <Button @click="applyCalibration">Apply scale</Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
