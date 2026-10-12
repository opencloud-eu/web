<template>
  <div class="item-filter flex" :class="`item-filter-${filterName}`">
    <oc-filter-chip
      :is-toggle="true"
      :filter-label="filterLabel"
      :is-toggle-active="filterActive"
      @toggle-filter="toggleFilter"
      @clear-filter="toggleFilter"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, unref, watch } from 'vue'
import omit from 'lodash-es/omit'
import { useRoute, useRouteQuery, useRouter, queryItemAsString } from '../composables'

const { filterLabel, filterName } = defineProps<{
  filterLabel: string
  filterName: string
}>()

const emit = defineEmits<{
  (e: 'toggleFilter', filterActive: boolean): void
}>()

const router = useRouter()
const currentRoute = useRoute()
const filterActive = ref<boolean>(false)

const queryParam = `q_${filterName}`
const currentRouteQuery = useRouteQuery(queryParam)
const setRouteQuery = () => {
  return router.push({
    query: {
      ...omit(unref(currentRoute).query, [queryParam]),
      ...(unref(filterActive) && { [queryParam]: 'true' })
    }
  })
}

const toggleFilter = async () => {
  filterActive.value = !unref(filterActive)
  await setRouteQuery()
  emit('toggleFilter', unref(filterActive))
}

watch(
  currentRouteQuery,
  (value) => {
    filterActive.value = queryItemAsString(value) === 'true'
  },
  { immediate: true }
)
</script>
