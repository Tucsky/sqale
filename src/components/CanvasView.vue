<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'

const emit = defineEmits<{
  canvasReady: [canvasElement: HTMLCanvasElement]
  viewportResize: [width: number, height: number]
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
  <div ref="wrapperElement" class="absolute inset-0">
    <canvas ref="canvasElement" class="h-full w-full" />
  </div>
</template>
