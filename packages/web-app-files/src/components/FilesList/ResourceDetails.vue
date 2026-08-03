<template>
  <div class="resource-details flex flex-col items-center">
    <div class="w-md lg:w-lg xl:w-2xl">
      <file-info />
      <file-details class="mb-4" />
      <file-actions />
    </div>
  </div>
</template>

<script setup lang="ts">
import { provide, computed } from 'vue'
import { Resource, SpaceResource } from '@opencloud-eu/web-client'

import FileActions from '../SideBar/Actions/FileActions.vue'
import FileDetails from '../SideBar/Details/FileDetails.vue'
import { FileInfo } from '@opencloud-eu/web-pkg'

const { singleResource = null, space = null } = defineProps<{
  singleResource?: Resource | null
  space?: SpaceResource | null
}>()

provide(
  'resource',
  computed(() => singleResource)
)
provide(
  'space',
  computed(() => space)
)
</script>
