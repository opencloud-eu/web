<template>
  <main id="files" class="flex h-full max-h-full relative">
    <div
      v-if="dragareaEnabled"
      class="absolute inset-0 z-90 bg-sky-600/20 border-2 border-dashed border-role-outline rounded-xl pointer-events-none"
    />
    <router-view tabindex="0" class="files-wrapper flex-1 h-full flex-nowrap sm:flex-wrap" />
  </main>
</template>
<script lang="ts">
import { defineComponent, onBeforeUnmount, watch, ref } from 'vue'
import { useRoute, eventBus, useResourcesStore } from '@opencloud-eu/web-pkg'

export default defineComponent({
  setup() {
    const dragareaEnabled = ref(false)
    const { resetSelection } = useResourcesStore()

    watch(useRoute(), () => {
      resetSelection()
    })

    const hideDropzone = () => {
      dragareaEnabled.value = false
    }
    const onDragOver = (event: DragEvent) => {
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
    return { dragareaEnabled }
  }
})
</script>
