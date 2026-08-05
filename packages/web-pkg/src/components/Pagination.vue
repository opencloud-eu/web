<template>
  <oc-pagination
    v-if="pages > 1"
    :pages="pages"
    :current-page="currentPage"
    :max-displayed="3"
    :current-route="$route"
    class="files-pagination flex justify-center my-2"
  />
</template>

<script setup lang="ts">
import { watch } from 'vue'

const { pages, currentPage } = defineProps<{
  pages: number
  currentPage: number
}>()

watch(
  () => currentPage,
  () => {
    document.getElementsByClassName('files-view-wrapper')[0]?.scrollTo(0, 0)
  }
)
</script>
