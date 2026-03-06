<script setup lang="ts">
import { Eye, EyeOff, Lock, Pencil, Trash2, Unlock } from 'lucide-vue-next'

import {
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
} from '@/components/ui/context-menu'

const props = defineProps<{
  layerId: string
  visible: boolean
  locked: boolean
}>()

const emit = defineEmits<{
  toggleVisibility: [layerId: string]
  toggleLock: [layerId: string]
  bringToFront: [layerId: string]
  bringToBack: [layerId: string]
  editLayer: [layerId: string]
  deleteLayer: [layerId: string]
}>()
</script>

<template>
  <ContextMenuContent class="w-44">
    <ContextMenuItem @select="emit('toggleVisibility', props.layerId)">
      <Eye v-if="props.visible" class="mr-2 h-4 w-4" />
      <EyeOff v-else class="mr-2 h-4 w-4" />
      {{ props.visible ? 'Hide' : 'Show' }}
    </ContextMenuItem>

    <ContextMenuItem @select="emit('toggleLock', props.layerId)">
      <Lock v-if="props.locked" class="mr-2 h-4 w-4" />
      <Unlock v-else class="mr-2 h-4 w-4" />
      {{ props.locked ? 'Unlock' : 'Lock' }}
    </ContextMenuItem>

    <ContextMenuSeparator />

    <ContextMenuItem @select="emit('bringToFront', props.layerId)">Bring to front</ContextMenuItem>
    <ContextMenuItem @select="emit('bringToBack', props.layerId)">Bring to back</ContextMenuItem>

    <ContextMenuSeparator />

    <ContextMenuItem @select="emit('editLayer', props.layerId)">
      <Pencil class="mr-2 h-4 w-4" />
      Edit
    </ContextMenuItem>

    <ContextMenuItem class="text-destructive focus:text-destructive" @select="emit('deleteLayer', props.layerId)">
      <Trash2 class="mr-2 h-4 w-4" />
      Remove
    </ContextMenuItem>
  </ContextMenuContent>
</template>
