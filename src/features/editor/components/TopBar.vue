<script setup lang="ts">
import { Layers } from 'lucide-vue-next'

import { Button } from '@/components/ui/button'

const props = defineProps<{
  layersOpen: boolean
}>()

const emit = defineEmits<{
  toggleLayers: []
}>()
</script>

<template>
  <div class="pointer-events-none absolute right-3 top-3 z-40 sm:right-4 sm:top-4">
    <Button
      size="sm"
      variant="outline"
      class="pointer-events-auto px-2"
      @click="emit('toggleLayers')"
    >
      <Layers class="h-5 w-5" :class="props.layersOpen ? 'text-primary' : ''" />
    </Button>
  </div>
</template>
