<script setup lang="ts">
import { ref } from 'vue'
import { Layers, Plus, Trash2 } from 'lucide-vue-next'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
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

function createFloor(): void {
  const name = newFloorName.value.trim()
  if (!name) {
    return
  }

  emit('createFloor', name)
  newFloorName.value = ''
}

function beginRename(floor: FloorModel): void {
  editingFloorId.value = floor.id
  editingFloorName.value = floor.name
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
</script>

<template>
  <Dialog :open="props.open" @update:open="(value) => !value && emit('close')">
    <DialogContent class="sm:max-w-xl">
      <DialogHeader>
        <DialogTitle class="flex items-center gap-2">
          <Layers class="h-5 w-5" />
          Floors management
        </DialogTitle>
      </DialogHeader>

      <div class="max-h-72 space-y-2 overflow-y-auto pr-1">
        <div
          v-for="floor in props.floors"
          :key="floor.id"
          class="flex items-center gap-2 rounded-lg border border-border px-3 py-2"
          :class="floor.id === props.currentFloorId ? 'bg-accent/60' : ''"
        >
          <Input
            v-if="editingFloorId === floor.id"
            v-model="editingFloorName"
            class="flex-1"
            @keydown.enter="commitRename"
            @blur="commitRename"
          />
          <button v-else class="flex-1 text-left text-sm font-medium" @dblclick="beginRename(floor)">
            {{ floor.name }}
          </button>

          <Button size="sm" variant="secondary" @click="emit('selectFloor', floor.id)">Use</Button>
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

      <div class="mt-4 flex gap-2">
        <Input v-model="newFloorName" placeholder="New floor name" />
        <Button variant="secondary" @click="createFloor">
          <Plus class="h-4 w-4" />
          Add floor
        </Button>
      </div>

      <DialogFooter>
        <Button variant="secondary" @click="emit('close')">Close</Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
