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
import {
  formatAreaInUnit,
  formatLengthInUnit,
  getAreaInputStep,
  getAreaUnitLabel,
  getLengthInputStep,
  getLengthUnitLabel,
  unitAreaToSquareMeters,
  unitToMeters,
} from '@/features/settings/model/measurementUnits'
import { ScaleCalibrationMode, type MeasurementUnit } from '@/types/domain'

const props = defineProps<{
  open: boolean
  calibrationMode: (typeof ScaleCalibrationMode)[keyof typeof ScaleCalibrationMode]
  measuredDistance: number
  measuredSurfaceSqm: number
  lengthUnit: MeasurementUnit
  surfaceUnit: MeasurementUnit
}>()

const emit = defineEmits<{
  close: []
  apply: [calibrationValue: number]
}>()

const realDistanceInput = ref('')
const realSurfaceInput = ref('')

const isTwoPointCalibration = computed(() => props.calibrationMode === ScaleCalibrationMode.TwoPoint)

watch(
  () => [props.open, props.lengthUnit, props.surfaceUnit, props.measuredDistance, props.measuredSurfaceSqm] as const,
  ([isOpen]) => {
    if (!isOpen) {
      return
    }

    if (isTwoPointCalibration.value) {
      realDistanceInput.value = props.measuredDistance > 0
        ? formatLengthInUnit(props.measuredDistance, props.lengthUnit)
        : ''
      realSurfaceInput.value = ''
      return
    }

    realSurfaceInput.value = props.measuredSurfaceSqm > 0
      ? formatAreaInUnit(props.measuredSurfaceSqm, props.surfaceUnit)
      : ''
    realDistanceInput.value = ''
  },
)

const lengthUnitLabel = computed(() => getLengthUnitLabel(props.lengthUnit))
const areaUnitLabel = computed(() => getAreaUnitLabel(props.surfaceUnit))
const distanceInputStep = computed(() => getLengthInputStep(props.lengthUnit))
const areaInputStep = computed(() => getAreaInputStep(props.surfaceUnit))
const distanceInputMin = computed(() => distanceInputStep.value)
const areaInputMin = computed(() => areaInputStep.value)

function applyCalibration(): void {
  const parsedCalibrationValue = isTwoPointCalibration.value ? Number(realDistanceInput.value) : Number(realSurfaceInput.value)
  if (!Number.isFinite(parsedCalibrationValue) || parsedCalibrationValue <= 0) {
    return
  }

  const calibrationValue = isTwoPointCalibration.value
    ? unitToMeters(parsedCalibrationValue, props.lengthUnit)
    : unitAreaToSquareMeters(parsedCalibrationValue, props.surfaceUnit)

  emit('apply', calibrationValue)
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
          Enter the real-world distance ({{ lengthUnitLabel }}) between the two picked points.
        </DialogDescription>
        <DialogDescription v-else>
          Enter the real-world surface ({{ areaUnitLabel }}) for the selected calibration surface.
        </DialogDescription>
      </DialogHeader>

      <div class="space-y-2">
        <label v-if="isTwoPointCalibration" class="text-sm font-medium">
          Distance in {{ lengthUnitLabel }}
          <Input v-model="realDistanceInput" type="number" :min="distanceInputMin" :step="distanceInputStep" class="mt-1" />
        </label>
        <label v-else class="text-sm font-medium">
          Surface in {{ areaUnitLabel }}
          <Input v-model="realSurfaceInput" type="number" :min="areaInputMin" :step="areaInputStep" class="mt-1" />
        </label>
      </div>

      <DialogFooter class="gap-2">
        <Button variant="secondary" @click="emit('close')">Cancel</Button>
        <Button @click="applyCalibration">Apply calibration</Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
