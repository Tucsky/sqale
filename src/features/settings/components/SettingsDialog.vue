<script setup lang="ts">
import { computed, ref } from 'vue'
import { Settings } from 'lucide-vue-next'

import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  formatLengthInUnit,
  getLengthUnitLabel,
  getLengthUnitOptionLabel,
  getSurfaceUnitOptionLabel,
  isMeasurementUnit,
} from '@/features/settings/model/measurementUnits'
import { ThemeMode, applyThemeMode, persistThemeMode, readThemeMode, resolveThemeStorage } from '@/lib/theme'
import {
  GRID_SPACING_OPTIONS,
  MEASUREMENT_UNIT_OPTIONS,
  type GridSpacing,
  type MeasurementUnit,
} from '@/types/domain'

const props = defineProps<{
  open: boolean
  metersPerPixel: number
  lengthUnit: MeasurementUnit
  surfaceUnit: MeasurementUnit
  gridVisible: boolean
  gridSpacing: GridSpacing
  gridSnap: boolean
}>()

const emit = defineEmits<{
  close: []
  updateLengthUnit: [unit: MeasurementUnit]
  updateSurfaceUnit: [unit: MeasurementUnit]
  updateGridVisible: [enabled: boolean]
  updateGridSpacing: [spacing: GridSpacing]
  updateGridSnap: [enabled: boolean]
}>()

const lengthUnitValue = computed(() => props.lengthUnit)
const surfaceUnitValue = computed(() => props.surfaceUnit)
const spacingValue = computed(() => String(props.gridSpacing))
const themeStorage = resolveThemeStorage()
const themeMode = ref(readThemeMode(themeStorage))
const darkModeEnabled = computed(() => themeMode.value === ThemeMode.Dark)

function updateLengthUnit(value: unknown): void {
  if (!isMeasurementUnit(value)) {
    return
  }

  emit('updateLengthUnit', value)
}

function updateSurfaceUnit(value: unknown): void {
  if (!isMeasurementUnit(value)) {
    return
  }

  emit('updateSurfaceUnit', value)
}

function updateGridVisibility(checked: boolean | 'indeterminate'): void {
  emit('updateGridVisible', checked === true)
}

function updateGridSnap(checked: boolean | 'indeterminate'): void {
  emit('updateGridSnap', checked === true)
}

function updateGridSpacing(value: unknown): void {
  const nextSpacing = Number(value)
  if (!Number.isFinite(nextSpacing)) {
    return
  }

  emit('updateGridSpacing', nextSpacing as GridSpacing)
}

function updateThemeMode(checked: boolean | 'indeterminate'): void {
  const nextThemeMode = checked === true ? ThemeMode.Dark : ThemeMode.Light
  if (themeMode.value === nextThemeMode) {
    return
  }

  themeMode.value = nextThemeMode
  applyThemeMode(typeof document === 'undefined' ? null : document.documentElement, nextThemeMode)
  persistThemeMode(themeStorage, nextThemeMode)
}
</script>

<template>
  <Dialog :open="props.open" @update:open="(value) => !value && emit('close')">
    <DialogContent class="sm:max-w-md">
      <DialogHeader>
        <DialogTitle class="flex items-center gap-2">
          <Settings class="h-5 w-5" />
          Settings
        </DialogTitle>
        <DialogDescription>Current units, scale, grid, and appearance settings for this floor.</DialogDescription>
      </DialogHeader>

      <div class="space-y-4">
        <section class="space-y-3 rounded-md border p-3">
          <div class="text-sm font-medium">Measurements</div>

          <div class="grid grid-cols-2 gap-2">
            <div class="space-y-1">
              <Label>Length unit</Label>
              <Select :model-value="lengthUnitValue" @update:model-value="updateLengthUnit">
                <SelectTrigger>
                  <SelectValue placeholder="Select length unit" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem
                    v-for="unit in MEASUREMENT_UNIT_OPTIONS"
                    :key="unit"
                    :value="unit"
                  >
                    {{ getLengthUnitOptionLabel(unit) }}
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div class="space-y-1">
              <Label>Surface unit</Label>
              <Select :model-value="surfaceUnitValue" @update:model-value="updateSurfaceUnit">
                <SelectTrigger>
                  <SelectValue placeholder="Select surface unit" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem
                    v-for="unit in MEASUREMENT_UNIT_OPTIONS"
                    :key="`surface-${unit}`"
                    :value="unit"
                  >
                    {{ getSurfaceUnitOptionLabel(unit) }}
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          

          <p class="text-sm">
            Current scale:
            <strong>
              1 px = {{ formatLengthInUnit(props.metersPerPixel, props.lengthUnit) }} {{ getLengthUnitLabel(props.lengthUnit) }}
            </strong>
          </p>
        </section>

        <section class="space-y-3 rounded-md border p-3">
          <div class="text-sm font-medium">Grid</div>

          <div class="flex gap-4">
            <div class="flex items-center gap-2">
              <Checkbox :checked="props.gridVisible" @update:checked="updateGridVisibility" />
              <Label>Show grid</Label>
            </div>

            <div class="flex items-center gap-2">
              <Checkbox :checked="props.gridSnap" @update:checked="updateGridSnap" />
              <Label>Snap to grid</Label>
            </div>
          </div>

          <div class="space-y-1">
            <Label>Spacing</Label>
            <Select :model-value="spacingValue" @update:model-value="updateGridSpacing">
              <SelectTrigger>
                <SelectValue placeholder="Select grid spacing" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem v-for="spacing in GRID_SPACING_OPTIONS" :key="spacing" :value="String(spacing)">
                  {{ formatLengthInUnit(spacing, props.lengthUnit) }} {{ getLengthUnitLabel(props.lengthUnit) }}
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

        </section>

        <section class="space-y-3 rounded-md border p-3">
          <div class="text-sm font-medium">Appearance</div>

          <div class="flex items-center gap-2">
            <Checkbox :checked="darkModeEnabled" @update:checked="updateThemeMode" />
            <Label>Dark mode</Label>
          </div>
        </section>
      </div>

      <DialogFooter>
        <Button variant="secondary" @click="emit('close')">Close</Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
