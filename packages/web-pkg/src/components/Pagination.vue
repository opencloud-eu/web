<template>
  <oc-pagination
    v-if="pages > 1"
    :pages="pages"
    :current-page="currentPage"
    :max-displayed="3"
    :current-route="paginationRoute"
    class="files-pagination flex justify-center my-2"
  />
</template>

<script setup lang="ts">
import { computed, unref, watch } from 'vue'
import { omit } from 'lodash-es'
import { useRoute } from '../composables'

const { pages, currentPage } = defineProps<{
  pages: number
  currentPage: number
}>()

const route = useRoute()
// a page picked by the user must not jump back to the resource from the scrollTo param later on
const paginationRoute = computed(() => {
  return { ...unref(route), query: omit(unref(route).query, 'scrollTo') }
})

watch(
  () => currentPage,
  () => {
    document.getElementsByClassName('files-view-wrapper')[0]?.scrollTo(0, 0)
  }
)
</script>
