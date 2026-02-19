<template>
  <div
    class="files-view-wrapper relative grid grid-cols-1 flex-1 focus:outline-0 h-full overflow-y-auto gap-0"
  >
    <div id="files-view" v-bind="$attrs" class="outline-0 z-0 flex flex-col">
      <slot />
    </div>
  </div>

  <teleport v-if="isEmbedModeEnabled" to="#app-runtime-footer">
    <embed-actions />
  </teleport>
</template>

<script setup lang="ts">
import { useEmbedMode } from '@opencloud-eu/web-pkg'
import EmbedActions from './EmbedActions/EmbedActions.vue'

defineOptions({ inheritAttrs: false })

const { isEnabled: isEmbedModeEnabled } = useEmbedMode()
</script>
