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
  <div class="pointer-events-none absolute right-4 top-4 z-30">
    <Button
      size="sm"
      variant="outline"
      class="pointer-events-auto"
      @click="emit('toggleLayers')"
    >
      <Layers class="h-5 w-5" :class="props.layersOpen ? 'text-primary' : ''" />
      Layers
    </Button>
  </div>
</template>
