<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue'
import {
  Box,
  ChevronDown,
  ChevronRight,
  Home,
  Image,
  Layers,
  Lock,
  Square,
  Trash2,
  Unlock,
} from 'lucide-vue-next'

import { Button } from '@/components/ui/button'
import { ContextMenu, ContextMenuTrigger } from '@/components/ui/context-menu'
import { Input } from '@/components/ui/input'
import LayerContextMenu from '@/features/layers/components/LayerContextMenu.vue'
import { LayerType, type LayerNode } from '@/types/domain'

interface LayerRow {
  node: LayerNode
  depth: number
}

const props = defineProps<{
  rootNode: LayerNode | null
  selectedLayerId: string | null
}>()

const emit = defineEmits<{
  selectLayer: [layerId: string]
  toggleVisibility: [layerId: string]
  toggleLock: [layerId: string]
  bringToFront: [layerId: string]
  bringToBack: [layerId: string]
  renameLayer: [layerId: string, name: string]
  deleteLayer: [layerId: string]
  editLayer: [layerId: string]
  calibrateLayer: [layerId: string]
}>()

const panelElement = ref<HTMLElement | null>(null)
const collapsedById = ref<Record<string, boolean>>({})
const editingLayerId = ref<string | null>(null)
const editingName = ref('')

watch(
  () => props.rootNode,
  (nextRootNode) => {
    if (!nextRootNode) {
      return
    }

    initializeExpandedState(nextRootNode)
  },
  { immediate: true },
)

watch(
  () => props.selectedLayerId,
  async (selectedLayerId) => {
    if (!selectedLayerId || !props.rootNode) {
      return
    }

    revealSelectedLayerPath(props.rootNode, selectedLayerId)
    await nextTick()

    const selectedRowElement = panelElement.value?.querySelector<HTMLElement>(`[data-layer-row-id="${selectedLayerId}"]`)
    selectedRowElement?.scrollIntoView({
      block: 'nearest',
    })
  },
)

const layerRows = computed<LayerRow[]>(() => {
  if (!props.rootNode) {
    return []
  }

  const rows: LayerRow[] = []

  const walk = (node: LayerNode, depth: number): void => {
    rows.push({ node, depth })
    if (collapsedById.value[node.id]) {
      return
    }

    for (const childNode of node.children) {
      walk(childNode, depth + 1)
    }
  }

  walk(props.rootNode, 0)
  return rows
})

function initializeExpandedState(rootNode: LayerNode): void {
  const walk = (node: LayerNode): void => {
    if (node.children.length > 0 && collapsedById.value[node.id] === undefined) {
      collapsedById.value[node.id] = false
    }

    for (const childNode of node.children) {
      walk(childNode)
    }
  }

  walk(rootNode)
}

function revealSelectedLayerPath(rootNode: LayerNode, selectedLayerId: string): void {
  const walk = (node: LayerNode): boolean => {
    if (node.id === selectedLayerId) {
      return true
    }

    for (const childNode of node.children) {
      if (!walk(childNode)) {
        continue
      }

      if (collapsedById.value[node.id]) {
        collapsedById.value[node.id] = false
      }

      return true
    }

    return false
  }

  walk(rootNode)
}

function isSceneLayer(node: LayerNode): boolean {
  return node.type === LayerType.PlanImage || node.type === LayerType.Room || node.type === LayerType.Furniture
}

function isRenameable(node: LayerNode): boolean {
  return node.type !== LayerType.Collection
}

function toggleCollapsed(nodeId: string): void {
  collapsedById.value[nodeId] = !collapsedById.value[nodeId]
}

function beginRename(node: LayerNode): void {
  if (!isRenameable(node)) {
    return
  }

  editingLayerId.value = node.id
  editingName.value = node.name
}

function commitRename(): void {
  if (!editingLayerId.value) {
    return
  }

  const nextName = editingName.value.trim()
  if (nextName) {
    emit('renameLayer', editingLayerId.value, nextName)
  }

  editingLayerId.value = null
  editingName.value = ''
}

function handleRowDoubleClick(event: MouseEvent, node: LayerNode): void {
  const target = event.target as HTMLElement
  if (target.closest('[data-layer-name]') || !isSceneLayer(node)) {
    return
  }

  emit('editLayer', node.id)
}

function getIconComponent(layerType: LayerType) {
  switch (layerType) {
    case LayerType.Floor:
      return Home
    case LayerType.PlanImage:
      return Image
    case LayerType.Room:
      return Square
    case LayerType.Furniture:
      return Box
    case LayerType.Collection:
      return Layers
    default:
      return Layers
  }
}
</script>

<template>
  <aside
    ref="panelElement"
    class="absolute right-4 top-20 z-20 w-72 max-h-[70vh] overflow-y-auto rounded-lg border bg-background/95 p-2 shadow-panel backdrop-blur"
  >
    <div class="mb-2 px-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Layers</div>

    <div class="space-y-1">
      <ContextMenu v-for="row in layerRows" :key="row.node.id">
        <ContextMenuTrigger as-child>
          <div
            :data-layer-row-id="row.node.id"
            class="group flex items-center gap-1 rounded-md px-1 py-1 text-sm"
            :class="props.selectedLayerId === row.node.id ? 'bg-accent text-accent-foreground' : 'hover:bg-muted/70'"
            :style="{ paddingLeft: `${row.depth * 14 + 6}px` }"
            @click="emit('selectLayer', row.node.id)"
            @dblclick="handleRowDoubleClick($event, row.node)"
          >
            <button
              v-if="row.node.children.length > 0"
              class="h-5 w-5 rounded"
              @click.stop="toggleCollapsed(row.node.id)"
            >
              <ChevronRight v-if="collapsedById[row.node.id]" class="h-4 w-4" />
              <ChevronDown v-else class="h-4 w-4" />
            </button>
            <span v-else class="inline-block h-5 w-5" />

            <component :is="getIconComponent(row.node.type)" class="h-4 w-4 text-muted-foreground" />

            <Input
              v-if="editingLayerId === row.node.id"
              v-model="editingName"
              class="h-7 min-w-0 flex-1"
              @keydown.enter="commitRename"
              @blur="commitRename"
              @dblclick.stop
            />
            <span v-else data-layer-name class="min-w-0 mr-auto truncate" @dblclick.stop="beginRename(row.node)">
              {{ row.node.name }}
            </span>

            <template v-if="isSceneLayer(row.node)">
              <Button
                size="icon"
                variant="ghost"
                class="h-8 w-8"
                @click.stop="emit('toggleLock', row.node.id)"
              >
                <Lock v-if="row.node.locked" class="h-4 w-4" />
                <Unlock v-else class="h-4 w-4" />
              </Button>

              <Button size="icon" variant="ghost" class="h-8 w-8" @click.stop="emit('deleteLayer', row.node.id)">
                <Trash2 class="h-4 w-4 text-destructive" />
              </Button>
            </template>
          </div>
        </ContextMenuTrigger>

        <LayerContextMenu
          v-if="isSceneLayer(row.node)"
          :layer-id="row.node.id"
          :layer-type="row.node.type"
          :visible="row.node.visible"
          :locked="row.node.locked"
          @toggle-visibility="emit('toggleVisibility', row.node.id)"
          @toggle-lock="emit('toggleLock', row.node.id)"
          @bring-to-front="emit('bringToFront', row.node.id)"
          @bring-to-back="emit('bringToBack', row.node.id)"
          @edit-layer="emit('editLayer', row.node.id)"
          @calibrate-layer="emit('calibrateLayer', row.node.id)"
          @delete-layer="emit('deleteLayer', row.node.id)"
        />
      </ContextMenu>
    </div>
  </aside>
</template>
