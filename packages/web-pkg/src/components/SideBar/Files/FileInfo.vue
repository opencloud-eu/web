<template>
  <div class="flex justify-between p-2">
    <div class="flex items-center">
      <resource-icon
        v-if="isSubPanelActive"
        :resource="resource"
        size="large"
        class="mr-2 relative"
      />
      <div>
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
