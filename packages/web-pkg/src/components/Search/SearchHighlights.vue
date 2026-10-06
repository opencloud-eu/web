<template>
  <div
    v-if="highlights || matchingTags.length"
    class="search-highlights [&_mark]:bg-yellow-200 [&_mark]:font-semibold"
  >
    <!-- eslint-disable vue/no-v-html -->
    <span v-if="highlights" class="search-highlights-content flex text-sm">
      <!-- the text before the match is cut off at its start, so the match stays visible -->
      <span
        v-if="snippet.before"
        dir="rtl"
        class="search-highlights-content-before truncate grow basis-0 max-w-fit"
        :class="{ 'min-w-[min(25%,6em)]': snippet.hasLongBefore }"
      >
        <span dir="ltr" v-html="snippet.before" />
      </span>
      <span class="search-highlights-content-match truncate" v-html="snippet.match" />
    </span>
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
import { computed, unref } from 'vue'
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

const snippet = computed(() => {
  const text = (unref(highlights) || '').replace(/\s+/g, ' ').trim()
  const matchIndex = text.indexOf('<mark>')
  if (matchIndex <= 0) {
    return { before: '', match: text, hasLongBefore: false }
  }
  // a trailing regular space would collapse at the end of the cut off text
  const before = text.slice(0, matchIndex).replace(/ $/, '\u00a0')
  return {
    before,
    match: text.slice(matchIndex),
    hasLongBefore: before.replace(/<[^>]*>/g, '').length > 16
  }
})

const matchingTags = computed(() => {
  const needle = term.trim().toLowerCase()
  return (resource.tags || []).filter(
    (tag) => filterTags.includes(tag) || (needle && tag.toLowerCase().includes(needle))
  )
})
</script>
