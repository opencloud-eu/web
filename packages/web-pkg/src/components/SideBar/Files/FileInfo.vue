<template>
  <div class="file_info flex justify-between p-2">
    <div class="flex items-center">
      <resource-icon
        v-if="isSubPanelActive"
        :resource="resource"
        size="large"
        class="file_info__icon mr-2 relative"
      />
      <div class="file_info__body">
        <h3 data-testid="files-info-name" class="font-semibold m-0 text-base break-all">
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
<style>
@reference '@opencloud-eu/design-system/tailwind';

@layer utilities {
  .file_info button {
    @apply whitespace-nowrap;
  }

  .file_info .file_info__favorite .oc-star {
    @apply inline-block;
  }
}
</style>
<style lang="scss">
.file_info {
  &__favorite {
    .oc-star {
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
