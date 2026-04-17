<template>
  <div v-if="resource" class="flex justify-between min-w-0 p-0">
    <div class="flex items-center min-w-0">
      <resource-icon :resource="resource" size="large" class="mr-2 relative shrink-0" />
      <div class="min-w-0">
        <h2 data-testid="files-info-name" class="font-semibold m-0 text-base min-w-0">
          <resource-name
            :name="name"
            :extension="resource.extension"
            :type="resource.type"
            :full-path="resource.webDavPath"
            :is-extension-displayed="areFileExtensionsShown"
            :is-path-displayed="false"
            :truncate-name="true"
            :is-favorite="resource.starred"
            class="block min-w-0"
          />
        </h2>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, inject, unref, type Ref } from 'vue'
import { Resource, SpaceResource } from '@opencloud-eu/web-client'
import { useGetMatchingSpace, useResourcesStore } from '../../../composables'
import ResourceIcon from '../../FilesList/ResourceIcon.vue'
import ResourceName from '../../FilesList/ResourceName.vue'

defineProps<{
  isSubPanelActive?: boolean
}>()

const resourcesStore = useResourcesStore()
const { isPersonalSpaceRoot } = useGetMatchingSpace()

const resource = inject<Ref<Resource | undefined> | undefined>('resource')
const space = inject<Ref<SpaceResource | undefined> | undefined>('space')
const areFileExtensionsShown = computed(() => resourcesStore.areFileExtensionsShown)

const name = computed(() => {
  if (!unref(resource)) {
    return ''
  }

  return isPersonalSpaceRoot(unref(resource))
    ? unref(space)?.name || unref(resource).name
    : unref(resource).name
})
</script>
