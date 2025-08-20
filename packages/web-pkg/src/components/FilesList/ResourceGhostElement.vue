<template>
  <div id="ghost-element" class="ghost-element pt-1 pl-4">
    <div class="ghost-element-layer1 oc-rounded">
      <resource-icon class="p-1" :resource="previewItems[0]" />
      <div v-if="showSecondLayer" class="ghost-element-layer2 oc-rounded" />
      <div v-if="showThirdLayer" class="ghost-element-layer3 oc-rounded" />
    </div>
    <span class="badge p-1 text-sm leading-2">{{ itemCount }}</span>
  </div>
</template>

<script lang="ts">
import { defineComponent, PropType } from 'vue'
import { Resource } from '@opencloud-eu/web-client'
import ResourceIcon from './ResourceIcon.vue'

/**
 * Please head to the OpenCloud web ResourceTable component (https://github.com/opencloud-eu/web/blob/main/packages/web-app-files/src/components/FilesList/ResourceTable.vue) for a demo of the Ghost Element.
 */
export default defineComponent({
  name: 'ResourceGhostElement',
  components: { ResourceIcon },
  props: {
    previewItems: {
      type: Array as PropType<Resource[]>,
      required: true
    }
  },
  computed: {
    layerCount() {
      return Math.min(this.previewItems.length, 3)
    },
    showSecondLayer() {
      return this.layerCount > 1
    },
    showThirdLayer() {
      return this.layerCount > 2
    },
    itemCount() {
      return this.previewItems.length
    }
  }
})
</script>

<style lang="scss">
.ghost-element-layer1 {
  position: relative;
  background-color: var(--oc-role-surface-container-high);

  .ghost-element-layer2 {
    position: absolute;
    background-color: var(--oc-role-surface-container-high);
    filter: brightness(0.82);
    top: 3px;
    left: 3px;
    right: -3px;
    bottom: -3px;
    z-index: -1;
  }
  .ghost-element-layer3 {
    position: absolute;
    background-color: var(--oc-role-surface-container-high);
    filter: brightness(0.72);
    top: 6px;
    left: 6px;
    right: -6px;
    bottom: -6px;
    z-index: -2;
  }
}
.ghost-element {
  background-color: transparent;
  z-index: var(--oc-z-index-modal);
  position: absolute;
  .icon-wrapper {
    position: relative;
  }
  .badge {
    position: absolute;
    top: -2px;
    right: -8px;
    -webkit-border-radius: 30px;
    -moz-border-radius: 30px;
    border-radius: 30px;
    min-width: var(--oc-space-small);
    height: var(--oc-space-small);
    text-align: center;

    background: red;
    color: white;
  }
}
</style>
