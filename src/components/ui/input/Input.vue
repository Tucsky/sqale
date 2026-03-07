<script setup lang="ts">
import type { HTMLAttributes } from 'vue'
import { ref, watch } from 'vue'
import { cn } from '@/lib/utils'

const props = defineProps<{
  modelValue?: string | number
  defaultValue?: string | number
  modelModifiers?: Record<string, boolean>
  class?: HTMLAttributes['class']
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', payload: string | number): void
}>()

const localValue = ref(props.modelValue ?? props.defaultValue ?? '')

watch(
  () => props.modelValue,
  v => (localValue.value = v ?? '')
)

function emitValue(e: Event) {
  let v: string | number = (e.target as HTMLInputElement).value

  if (props.modelModifiers?.number) {
    const n = Number(v)
    if (!Number.isNaN(n)) v = n
  }

  emit('update:modelValue', v)
}
</script>

<template>
  <input
    :value="localValue"
    @input="!props.modelModifiers?.lazy && emitValue($event)"
    @change="props.modelModifiers?.lazy && emitValue($event)"
    :class="cn('flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50', props.class)"
  />
</template>
