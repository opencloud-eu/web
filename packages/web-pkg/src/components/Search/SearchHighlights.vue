<template>
  <div
    v-if="highlights || matchingTags.length"
    class="search-highlights [&_mark]:bg-yellow-200 [&_mark]:font-semibold"
  >
    <!-- eslint-disable vue/no-v-html -->
    <span
      v-if="highlights"
      class="search-highlights-content truncate block text-sm"
      v-html="highlights"
    />
    <!--eslint-enable-->
    <div v-if="matchingTags.length" class="search-highlights-tags flex flex-wrap gap-1 mt-1">
      <oc-tag
        v-for="tag in matchingTags"
        :key="tag"
        class="search-highlights-tag max-w-40"
        :rounded="true"
        size="xsmall"
      >
        <oc-icon name="price-tag-3" size="xsmall" />
        <oc-filter-highlight class="truncate" :text="tag" :term="term" />
      </oc-tag>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { SearchResource } from '@opencloud-eu/web-client'
import { OcFilterHighlight } from '@opencloud-eu/design-system/components'

const {
  resource,
  term = '',
  filterTags = []
} = defineProps<{
  resource: SearchResource
  term?: string
  filterTags?: string[]
}>()

const highlights = computed(() => resource.highlights)

const matchingTags = computed(() => {
  const needle = term.trim().toLowerCase()
  return (resource.tags || []).filter(
    (tag) => filterTags.includes(tag) || (needle && tag.toLowerCase().includes(needle))
  )
})
</script>
