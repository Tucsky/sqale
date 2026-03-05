<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import {
  Box,
  ChevronDown,
  ChevronRight,
  Eye,
  EyeOff,
  Home,
  Image,
  Layers,
  Lock,
  Square,
  Unlock,
} from 'lucide-vue-next'

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
  renameLayer: [layerId: string, name: string]
}>()

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

function isRenameable(node: LayerNode): boolean {
  return node.type !== LayerType.Collection
}

function canToggle(node: LayerNode): boolean {
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
    class="absolute right-4 top-20 z-20 w-72 max-h-[70vh] overflow-y-auto rounded-xl border border-border bg-white/95 p-2 shadow-xl backdrop-blur"
  >
    <div class="mb-2 px-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Layers</div>

    <div class="space-y-1">
      <div
        v-for="row in layerRows"
        :key="row.node.id"
        class="group flex items-center gap-1 rounded-md px-1 py-1 text-sm"
        :class="props.selectedLayerId === row.node.id ? 'bg-accent text-accent-foreground' : 'hover:bg-muted'"
        :style="{ paddingLeft: `${row.depth * 14 + 6}px` }"
        @click="emit('selectLayer', row.node.id)"
      >
        <button
          v-if="row.node.children.length > 0"
          class="h-5 w-5 rounded hover:bg-white"
          @click.stop="toggleCollapsed(row.node.id)"
        >
          <ChevronRight v-if="collapsedById[row.node.id]" class="h-4 w-4" />
          <ChevronDown v-else class="h-4 w-4" />
        </button>
        <span v-else class="inline-block h-5 w-5" />

        <component :is="getIconComponent(row.node.type)" class="h-4 w-4 text-muted-foreground" />

        <input
          v-if="editingLayerId === row.node.id"
          v-model="editingName"
          class="h-7 min-w-0 flex-1 rounded border border-input px-2 text-sm"
          @keydown.enter="commitRename"
          @blur="commitRename"
        />
        <span v-else class="min-w-0 flex-1 truncate" @dblclick.stop="beginRename(row.node)">{{ row.node.name }}</span>

        <button
          class="h-6 w-6 rounded hover:bg-white"
          :disabled="!canToggle(row.node)"
          @click.stop="emit('toggleVisibility', row.node.id)"
        >
          <Eye v-if="row.node.visible" class="h-4 w-4" />
          <EyeOff v-else class="h-4 w-4" />
        </button>

        <button
          class="h-6 w-6 rounded hover:bg-white"
          :disabled="!canToggle(row.node)"
          @click.stop="emit('toggleLock', row.node.id)"
        >
          <Lock v-if="row.node.locked" class="h-4 w-4" />
          <Unlock v-else class="h-4 w-4" />
        </button>
      </div>
    </div>
  </aside>
</template>
