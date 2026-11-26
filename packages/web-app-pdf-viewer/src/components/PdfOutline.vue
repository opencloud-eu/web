<template>
  <oc-list
    raw
    class="flex flex-col gap-0.5"
    :class="{ 'ml-3 border-l border-l-role-outline-variant pl-1': isNested }"
  >
    <li v-for="({ item, isExpanded }, index) in entries" :key="index">
      <div
        class="flex items-start gap-1 rounded-lg pr-2"
        :class="
          isCurrent(item)
            ? 'bg-role-secondary-container text-role-on-secondary-container'
            : 'hover:bg-role-surface-container-high'
        "
      >
        <pdf-tree-toggle
          v-if="item.items.length"
          class="pdf-viewer-outline-toggle"
          :is-expanded="isExpanded"
          @toggle="toggle(item, $event)"
        />
        <span v-else class="w-8 shrink-0" />
        <oc-button
          v-bind="item.url ? getLinkAttributes(item.url) : {}"
          class="pdf-viewer-outline-item min-w-0 flex-1 py-1.5 text-left text-sm"
          :class="{ 'font-semibold': item.bold, italic: item.italic }"
          :aria-current="isCurrent(item) ? 'location' : undefined"
          :disabled="!item.url && !canOpen(item)"
          appearance="raw"
          justify-content="left"
          gap-size="small"
          no-hover
          @click="!item.url && open(item)"
        >
          <span class="break-words" dir="auto" v-text="getTitle(item)" />
          <oc-icon
            v-if="item.url"
            name="external-link"
            fill-type="line"
            size-class="size-3.5 shrink-0"
          />
        </oc-button>
        <span
          v-if="getPageNumber(item)"
          class="shrink-0 pt-2 text-xs tabular-nums text-role-on-surface-variant"
          v-text="getPageNumber(item)"
        />
      </div>
      <pdf-outline v-if="item.items.length && isExpanded" :items="item.items" is-nested />
    </li>
  </oc-list>
</template>

<script setup lang="ts">
import { computed, inject } from 'vue'
import { pdfOutlineKey, type OutlineItem } from '../composables/usePdfOutline'
import { isWebUrl } from '../helpers/externalLinks'
import PdfTreeToggle from './PdfTreeToggle.vue'

const { items, isNested = false } = defineProps<{
  items: OutlineItem[]
  isNested?: boolean
}>()

const { getPageNumber, isCurrent, isExpanded: isItemExpanded, toggle, open } = inject(pdfOutlineKey)

const entries = computed(() => items.map((item) => ({ item, isExpanded: isItemExpanded(item) })))

// Same as the PDF.js viewer: invisible characters removed, a dash for empty titles.
function getTitle({ title }: OutlineItem) {
  return (
    title
      .replaceAll(/[\x01-\x1F]/g, ' ')
      .replaceAll('\x00', '')
      .trim() || '–'
  )
}

// Web pages in a new tab, like the links on the pages (see ExternalLinkService).
function getLinkAttributes(url: string) {
  return {
    type: 'a' as const,
    href: url,
    target: isWebUrl(url) ? ('_blank' as const) : undefined,
    rel: 'noopener noreferrer'
  }
}

function canOpen({ dest, action, attachment, setOCGState }: OutlineItem) {
  return !!(dest || action || attachment || setOCGState)
}
</script>
