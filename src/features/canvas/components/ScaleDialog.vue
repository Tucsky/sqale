<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { Ruler, Square } from 'lucide-vue-next'

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
import { ScaleCalibrationMode } from '@/types/domain'

const props = defineProps<{
  open: boolean
  calibrationMode: (typeof ScaleCalibrationMode)[keyof typeof ScaleCalibrationMode]
  measuredDistance: number
  measuredSurfaceSqm: number
}>()

const emit = defineEmits<{
  close: []
  apply: [distanceMeters: number]
}>()

const realDistanceMeters = ref('')
const realSurfaceSqm = ref('')

const isTwoPointCalibration = computed(() => props.calibrationMode === ScaleCalibrationMode.TwoPoint)

watch(
  () => props.open,
  (isOpen) => {
    if (!isOpen) {
      return
    }

    if (isTwoPointCalibration.value) {
      realDistanceMeters.value = props.measuredDistance > 0 ? props.measuredDistance.toFixed(2) : ''
      realSurfaceSqm.value = ''
      return
    }

    realSurfaceSqm.value = props.measuredSurfaceSqm > 0 ? props.measuredSurfaceSqm.toFixed(2) : ''
    realDistanceMeters.value = ''
  },
)

function applyCalibration(): void {
  const parsedCalibrationValue = isTwoPointCalibration.value
    ? Number(realDistanceMeters.value)
    : Number(realSurfaceSqm.value)
  if (!Number.isFinite(parsedCalibrationValue) || parsedCalibrationValue <= 0) {
    return
  }

  emit('apply', parsedCalibrationValue)
}
</script>

<template>
  <Dialog :open="props.open" @update:open="(value) => !value && emit('close')">
    <DialogContent class="sm:max-w-md">
      <DialogHeader>
        <DialogTitle class="flex items-center gap-2">
          <Ruler v-if="isTwoPointCalibration" class="h-5 w-5" />
          <Square v-else class="h-5 w-5" />
          Scale calibration
        </DialogTitle>
        <DialogDescription v-if="isTwoPointCalibration">
          Enter the real-world distance (meters) between the two picked points.
        </DialogDescription>
        <DialogDescription v-else>
          Enter the real-world surface (m²) for the selected calibration surface.
        </DialogDescription>
      </DialogHeader>

      <div class="space-y-2">
        <label v-if="isTwoPointCalibration" class="text-sm font-medium">
          Distance in meters
          <Input v-model="realDistanceMeters" type="number" min="0.01" step="0.01" class="mt-1" />
        </label>
        <label v-else class="text-sm font-medium">
          Surface in m²
          <Input v-model="realSurfaceSqm" type="number" min="0.01" step="0.01" class="mt-1" />
        </label>
      </div>

      <DialogFooter class="gap-2">
        <Button variant="secondary" @click="emit('close')">Cancel</Button>
        <Button @click="applyCalibration">Apply calibration</Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
