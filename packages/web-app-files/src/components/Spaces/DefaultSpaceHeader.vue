<template>
  <space-header v-if="isSpaceFrontpage" :space="currentSpace" class="px-4" />
</template>

<script setup lang="ts">
import { computed, unref } from 'vue'
import { storeToRefs } from 'pinia'
import { isProjectSpaceResource } from '@opencloud-eu/web-client'
import { useResourcesStore, useSpacesStore } from '@opencloud-eu/web-pkg'
import SpaceHeader from './SpaceHeader.vue'

const { currentSpace } = storeToRefs(useSpacesStore())
const { currentFolder } = storeToRefs(useResourcesStore())

const isSpaceFrontpage = computed(() => {
  return isProjectSpaceResource(unref(currentSpace)) && unref(currentFolder)?.path === '/'
})
</script>
