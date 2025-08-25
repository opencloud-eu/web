<template>
  <div
    class="files-view-wrapper grid grid-cols-1 [grid-template-rows:max-content_max-content_1fr] oc-width-expand"
  >
    <div id="files-view" v-bind="$attrs">
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
  gap: 0 0;
  grid-template-areas:
    'header'
    'upload'
    'main';

  &:focus {
    outline: none;
  }
}

#files-view {
  grid-area: main;
  z-index: 0;
  outline: none;
}
</style>
