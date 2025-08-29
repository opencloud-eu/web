<template>
  <div class="files-view-wrapper grid grid-cols-1 flex-1 focus:outline-0 h-full overflow-y-auto">
    <div id="files-view" v-bind="$attrs" class="outline-0">
      <slot />
    </div>
  </div>

  <portal v-if="isEmbedModeEnabled" to="app.runtime.footer">
    <embed-actions />
  </portal>
</template>

<script lang="ts">
import { defineComponent } from 'vue'
import { useEmbedMode } from '@opencloud-eu/web-pkg'
import EmbedActions from './EmbedActions/EmbedActions.vue'

export default defineComponent({
  components: { EmbedActions },
  inheritAttrs: false,
  setup() {
    const { isEnabled: isEmbedModeEnabled } = useEmbedMode()

    return { isEmbedModeEnabled }
  }
})
</script>

<style lang="scss" scoped>
.files-view-wrapper {
  position: relative;
  grid-template-rows: max-content max-content 1fr;
  gap: 0 0;
  grid-template-areas:
    'header'
    'upload'
    'main';
}

#files-view {
  grid-area: main;
  z-index: 0;
}
</style>
