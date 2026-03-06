<script setup lang="ts">
import { computed, nextTick, ref } from 'vue'
import { Image as ImageIcon, Layers, Plus, Trash2 } from 'lucide-vue-next'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { getFloorRoomsAreaSqm } from '@/features/floors/model/floorArea'
import type { FloorModel } from '@/types/domain'

const props = defineProps<{
  open: boolean
  floors: FloorModel[]
  currentFloorId: string
}>()

const emit = defineEmits<{
  close: []
  selectFloor: [floorId: string]
  createFloor: [name: string]
  deleteFloor: [floorId: string]
  renameFloor: [floorId: string, name: string]
}>()

const newFloorName = ref('')
const editingFloorId = ref<string | null>(null)
const editingFloorName = ref('')
const floorAreaById = computed(() => {
  const areaByFloorId = new Map<string, number>()
  for (const floor of props.floors) {
    areaByFloorId.set(floor.id, getFloorRoomsAreaSqm(floor))
  }
  return areaByFloorId
})

function createFloor(): void {
  const name = newFloorName.value.trim()
  if (!name) {
    return
  }

  emit('createFloor', name)
  emit('close')
}

function loadFloor(id: string): void {
  emit('selectFloor', id)
  emit('close')
}

function beginRename(floor: FloorModel): void {
  editingFloorId.value = floor.id
  editingFloorName.value = floor.name

  nextTick(() => {
    const renameInput = document.getElementById(`floor-rename-${floor.id}`) as HTMLInputElement | null
    renameInput?.focus()
    renameInput?.select()
  })
}

function commitRename(): void {
  if (!editingFloorId.value) {
    return
  }

  const name = editingFloorName.value.trim()
  if (name) {
    emit('renameFloor', editingFloorId.value, name)
  }

  editingFloorId.value = null
  editingFloorName.value = ''
}

function formatFloorArea(floorId: string): string {
  const areaSqm = floorAreaById.value.get(floorId) ?? 0
  return `${areaSqm.toFixed(2)} m²`
}
</script>

<template>
  <Dialog :open="props.open" @update:open="(value) => !value && emit('close')">
    <DialogContent class="sm:max-w-xl">
      <DialogHeader>
        <DialogTitle class="flex items-center gap-2">
          <Layers class="h-5 w-5" />
          Floors
        </DialogTitle>
      </DialogHeader>

      <div class="max-h-72 space-y-2 overflow-y-auto pr-1">
        <div
          v-for="floor in props.floors"
          :key="floor.id"
          class="flex items-center gap-3 rounded-lg border border-border px-3 py-2"
          :class="floor.id === props.currentFloorId ? 'bg-accent/60' : ''"
        >
          <div class="h-8 w-8 shrink-0 overflow-hidden rounded border border-border/70 bg-muted">
            <img
              v-if="floor.planImage"
              :src="floor.planImage.dataUrl"
              :alt="`${floor.name} plan`"
              class="h-full w-full object-cover"
            />
            <div v-else class="flex h-full w-full items-center justify-center text-muted-foreground">
              <ImageIcon class="h-3.5 w-3.5" />
            </div>
          </div>

          <div class="min-w-0 flex-1">
            <Input
              v-if="editingFloorId === floor.id"
              :id="`floor-rename-${floor.id}`"
              v-model="editingFloorName"
              class="h-6 px-2"
              @keydown.enter="commitRename"
              @blur="commitRename"
            />
            <button
              v-else
              class="w-full truncate text-left text-sm font-medium"
              @dblclick="beginRename(floor)"
            >
              {{ floor.name }}
            </button>
            <p class="truncate text-xs text-muted-foreground">{{ formatFloorArea(floor.id) }}</p>
          </div>

          <Button size="sm" variant="outline" @click="loadFloor(floor.id)">Load</Button>
          <Button
            size="icon"
            variant="ghost"
            :disabled="props.floors.length <= 1"
            @click="emit('deleteFloor', floor.id)"
          >
            <Trash2 class="h-4 w-4 text-rose-600" />
          </Button>
        </div>
      </div>


      <DialogFooter>
        <div class="flex gap-2">
          <Input class="grow" v-model="newFloorName" placeholder="New floor name" />
          <Button class="shink-0 px-4" size="lg" variant="outline" @click="createFloor">
            <Plus class="h-4 w-4" />
            Add floor
          </Button>
        </div>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
