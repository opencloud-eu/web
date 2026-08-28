<template>
  <span class="filter-highlight"
    ><template v-for="(segment, index) in segments" :key="index"
      ><span
        v-if="segment.match"
        class="filter-highlight-match font-semibold"
        v-text="segment.text"
      /><template v-else>{{ segment.text }}</template></template
    ></span
  >
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { escapeRegExp } from 'lodash-es'

interface HighlightSegment {
  text: string
  /** Whether the segment matches the filter term and should be highlighted. */
  match: boolean
}

const { text = '', term = '' } = defineProps<{
  /** The text to render. */
  text?: string
  /** The filter term whose occurrences get highlighted. */
  term?: string
}>()

/** Splits the given text into matching and non-matching segments for the given filter term. */
function splitHighlight(text: string, term: string): HighlightSegment[] {
  const needle = (term || '').trim()
  if (!text || !needle) {
    return text ? [{ text, match: false }] : []
  }

  // the capture group keeps the matches in the result, on the odd indices
  const parts = text.split(new RegExp(`(${escapeRegExp(needle)})`, 'gi'))

  return parts.reduce<HighlightSegment[]>((segments, part, index) => {
    if (part) {
      segments.push({ text: part, match: index % 2 === 1 })
    }
    return segments
  }, [])
}

const segments = computed(() => splitHighlight(text, term))
</script>
