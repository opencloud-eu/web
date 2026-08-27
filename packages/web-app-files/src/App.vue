<template>
  <main id="files" class="flex h-full max-h-full relative">
    <router-view tabindex="0" class="files-wrapper flex-1 h-full flex-nowrap sm:flex-wrap" />
  </main>
</template>
<script setup lang="ts">
import { watch, unref } from 'vue'
import { useRoute, useResourcesStore } from '@opencloud-eu/web-pkg'

const { resetSelection } = useResourcesStore()
const route = useRoute()

watch(
  () => unref(route).path,
  () => {
    resetSelection()
  }
)
</script>
