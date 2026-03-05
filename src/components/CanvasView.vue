<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'
import { ContextMenu, ContextMenuTrigger } from '@/components/ui/context-menu'

const props = defineProps<{
  contextMenuOpen: boolean
}>()

const emit = defineEmits<{
  canvasReady: [canvasElement: HTMLCanvasElement]
  viewportResize: [width: number, height: number]
  contextMenuOpenChange: [open: boolean]
}>()

const wrapperElement = ref<HTMLDivElement | null>(null)
const canvasElement = ref<HTMLCanvasElement | null>(null)

let resizeObserver: ResizeObserver | null = null

onMounted(() => {
  if (!wrapperElement.value || !canvasElement.value) {
    return
  }

  emit('canvasReady', canvasElement.value)

  resizeObserver = new ResizeObserver((entries) => {
    const entry = entries[0]
    if (!entry) {
      return
    }

    emit('viewportResize', entry.contentRect.width, entry.contentRect.height)
  })

  resizeObserver.observe(wrapperElement.value)
})

onBeforeUnmount(() => {
  resizeObserver?.disconnect()
  resizeObserver = null
})
</script>

<template>
  <ContextMenu :open="props.contextMenuOpen" @update:open="emit('contextMenuOpenChange', $event)">
    <ContextMenuTrigger as-child>
      <div ref="wrapperElement" class="absolute inset-0">
        <canvas ref="canvasElement" class="h-full w-full" />
      </div>
    </ContextMenuTrigger>
    <slot name="context-menu-content" />
  </ContextMenu>
</template>
