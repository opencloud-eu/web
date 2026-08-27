<template>
  <div
    v-if="dragareaEnabled"
    class="absolute inset-0 z-90 bg-sky-600/20 border-2 border-dashed border-role-outline rounded-xl pointer-events-none"
  />
</template>

<script setup lang="ts">
import { onBeforeUnmount, ref } from 'vue'
import { useEventBus } from '@opencloud-eu/web-pkg'

const eventBus = useEventBus()

const dragareaEnabled = ref(false)

function hideDropzone() {
  dragareaEnabled.value = false
}
function onDragOver(event: DragEvent) {
  dragareaEnabled.value = (event.dataTransfer.types || []).some((e) => e === 'Files')
}

const dragOver = eventBus.subscribe('drag-over', onDragOver)
const dragOut = eventBus.subscribe('drag-out', hideDropzone)
const drop = eventBus.subscribe('drop', hideDropzone)

onBeforeUnmount(() => {
  eventBus.unsubscribe('drag-over', dragOver)
  eventBus.unsubscribe('drag-out', dragOut)
  eventBus.unsubscribe('drop', drop)
})
</script>
