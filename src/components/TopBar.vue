<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'
import { Layers, Menu, Settings } from 'lucide-vue-next'

import { Button } from '@/components/ui/button'

const props = defineProps<{
  layersOpen: boolean
}>()

const emit = defineEmits<{
  toggleLayers: []
  openSettings: []
  openFloors: []
}>()

const menuOpen = ref(false)
const menuRoot = ref<HTMLDivElement | null>(null)

const onDocumentClick = (event: MouseEvent): void => {
  if (!menuRoot.value) {
    return
  }

  const targetNode = event.target as Node
  if (menuRoot.value.contains(targetNode)) {
    return
  }

  menuOpen.value = false
}

onMounted(() => {
  document.addEventListener('click', onDocumentClick)
})

onBeforeUnmount(() => {
  document.removeEventListener('click', onDocumentClick)
})

function openSettings(): void {
  menuOpen.value = false
  emit('openSettings')
}

function openFloors(): void {
  menuOpen.value = false
  emit('openFloors')
}
</script>

<template>
  <div class="pointer-events-none absolute inset-x-0 top-0 z-30 flex items-start justify-between p-4">
    <div ref="menuRoot" class="pointer-events-auto relative">
      <Button size="icon" variant="secondary" class="rounded-full bg-white/95 shadow-panel" @click="menuOpen = !menuOpen">
        <Menu class="h-5 w-5" />
      </Button>

      <div
        v-if="menuOpen"
        class="absolute left-0 mt-2 w-56 rounded-xl border border-border bg-white p-2 shadow-panel backdrop-blur"
      >
        <button
          class="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm hover:bg-muted"
          @click="openSettings"
        >
          <Settings class="h-4 w-4" />
          Settings
        </button>
        <button
          class="mt-1 flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm hover:bg-muted"
          @click="openFloors"
        >
          <Layers class="h-4 w-4" />
          Floors management
        </button>
      </div>
    </div>

    <Button
      size="icon"
      variant="secondary"
      class="pointer-events-auto rounded-full bg-white/95 shadow-panel"
      @click="emit('toggleLayers')"
    >
      <Layers class="h-5 w-5" :class="props.layersOpen ? 'text-sky-600' : ''" />
    </Button>
  </div>
</template>
