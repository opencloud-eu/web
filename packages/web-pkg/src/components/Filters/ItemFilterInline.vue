<template>
  <div>
    <div
      class="item-inline-filter inline-flex outline outline-offset-[-1px] rounded-md"
      :class="`item-inline-filter-${filterName}`"
    >
      <oc-button
        v-for="(option, index) in filterOptions"
        :id="option.name"
        :key="index"
        class="item-inline-filter-option py-1 px-2 first:rounded-l-md last:rounded-r-md h-[32px]"
        :class="{
          'item-inline-filter-option-selected': activeOption === option.name
        }"
        :appearance="activeOption === option.name ? 'filled' : 'raw-inverse'"
        :color-role="activeOption === option.name ? 'secondaryContainer' : 'surface'"
        :no-hover="activeOption === option.name"
        @click="toggleFilter(option)"
      >
        <span class="truncate item-inline-filter-option-label" v-text="option.label" />
      </oc-button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref, unref } from 'vue'
import omit from 'lodash-es/omit'
import { useRoute, useRouteQuery, useRouter, queryItemAsString } from '../../composables'
import { InlineFilterOption } from './types'

const { filterName, filterOptions } = defineProps<{
  filterName: string
  filterOptions: InlineFilterOption[]
}>()

const emit = defineEmits<{
  (e: 'toggleFilter', option: InlineFilterOption): void
}>()

const router = useRouter()
const currentRoute = useRoute()
const activeOption = ref<string>(filterOptions[0].name)

const queryParam = `q_${filterName}`
const currentRouteQuery = useRouteQuery(queryParam)
const setRouteQuery = (optionName: string) => {
  return router.push({
    query: {
      ...omit(unref(currentRoute).query, [queryParam]),
      [queryParam]: optionName
    }
  })
}

const toggleFilter = async (option: InlineFilterOption) => {
  activeOption.value = option.name
  await setRouteQuery(option.name)
  emit('toggleFilter', option)
}

onMounted(() => {
  const queryStr = queryItemAsString(unref(currentRouteQuery))
  if (queryStr) {
    const selected = filterOptions.find(({ name }) => name === queryStr)
    if (selected) {
      activeOption.value = queryStr
      emit('toggleFilter', selected)
    }
  }
})
</script>
<style>
@reference '@opencloud-eu/design-system/tailwind';

@layer components {
  .item-inline-filter {
    outline-color: var(--color-role-outline-variant);
  }
}
</style>
