<template>
  <div class="files-view-wrapper grid grid-cols-1 oc-width-expand focus:outline-0">
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
  height: 100%;
  position: relative;
  overflow-y: auto;
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
