<template>
  <div class="file_info oc-flex oc-flex-between p-2">
    <div class="oc-flex oc-flex-middle">
      <resource-icon
        v-if="isSubPanelActive"
        :resource="resource"
        size="large"
        class="file_info__icon mr-2 oc-position-relative"
      />
      <div class="file_info__body oc-text-overflow">
        <h3 data-testid="files-info-name" class="oc-font-semibold">
          <resource-name
            :name="name"
            :extension="resource.extension"
            :type="resource.type"
            :full-path="resource.webDavPath"
            :is-extension-displayed="areFileExtensionsShown"
            :is-path-displayed="false"
            :truncate-name="false"
          />
        </h3>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, inject, unref } from 'vue'
import { Resource, SpaceResource } from '@opencloud-eu/web-client'
import { useGetMatchingSpace, useResourcesStore } from '../../../composables'
import ResourceIcon from '../../FilesList/ResourceIcon.vue'
import ResourceName from '../../FilesList/ResourceName.vue'

const { isSubPanelActive = true } = defineProps<{
  isSubPanelActive?: boolean
}>()

const resourcesStore = useResourcesStore()
const { isPersonalSpaceRoot } = useGetMatchingSpace()

const resource = inject<Resource>('resource')
const space = inject<SpaceResource>('space')
const areFileExtensionsShown = computed(() => resourcesStore.areFileExtensionsShown)

const name = computed(() => {
  return isPersonalSpaceRoot(unref(resource)) ? unref(space).name : unref(resource).name
})
</script>

<style lang="scss">
.file_info {
  button {
    white-space: nowrap;
  }

  &__body {
    text-align: left;

    h3 {
      font-size: var(--oc-font-size-medium);
      margin: 0;
      word-break: break-all;
    }
  }

  &__favorite {
    .oc-star {
      display: inline-block;

      &-shining svg {
        fill: #ffba0a !important;

        path:not([fill='none']) {
          stroke: var(--oc-role-secondary);
        }
      }
    }
  }
}
</style>
