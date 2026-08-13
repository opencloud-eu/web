<template>
  <div>
    <oc-drop
      ref="searchDropRef"
      :title="searchLabel"
      :toggle="toggle"
      mode="click"
      :offset="20"
      :close-on-click="false"
      enforce-drop-on-mobile
      padding-size="small"
      @show-drop="focusSearchInput"
    >
      <div @keydown.enter.prevent="onSearchEnter">
        <oc-search-bar
          v-model="searchTerm"
          :label="searchLabel"
          :placeholder="searchLabel"
          :is-rounded="false"
          button-hidden
        />
      </div>
      <div class="mt-2 flex items-center justify-between gap-2">
        <span
          class="epub-reader-search-result-count text-sm text-role-on-surface-variant"
          :aria-live="searching ? 'polite' : 'off'"
          v-text="searchResultStatusLabel"
        />
        <div class="flex items-center gap-1">
          <oc-button
            v-oc-tooltip="previousResultLabel"
            :aria-label="previousResultLabel"
            class="epub-reader-search-previous-result p-2"
            :disabled="!canNavigateThroughResults"
            appearance="raw"
            no-hover
            size="small"
            @click="emit('goToPreviousResult')"
          >
            <oc-icon name="arrow-up-s" fill-type="line" size-class="size-4" />
          </oc-button>
          <oc-button
            v-oc-tooltip="nextResultLabel"
            :aria-label="nextResultLabel"
            class="epub-reader-search-next-result p-2"
            :disabled="!canNavigateThroughResults"
            appearance="raw"
            no-hover
            size="small"
            @click="emit('goToNextResult')"
          >
            <oc-icon name="arrow-down-s" fill-type="line" size-class="size-4" />
          </oc-button>
          <oc-button
            v-oc-tooltip="closeSearchLabel"
            :aria-label="closeSearchLabel"
            class="epub-reader-search-close p-2"
            appearance="raw"
            no-hover
            size="small"
            @click="onCloseSearch"
          >
            <oc-icon name="close" fill-type="line" size-class="size-4" />
          </oc-button>
        </div>
      </div>
    </oc-drop>
  </div>
</template>

<script setup lang="ts">
import type { OcDrop } from '@opencloud-eu/design-system/components'
import { debounce } from 'lodash-es'
import {
  ComponentPublicInstance,
  computed,
  nextTick,
  onBeforeUnmount,
  ref,
  unref,
  useTemplateRef,
  watch
} from 'vue'
import { useGettext } from 'vue3-gettext'

const props = defineProps<{
  toggle: string
  searching: boolean
  resultCount: number
  hasMoreResults: boolean
  currentResultIndex: number
  canNavigateThroughResults: boolean
}>()

const emit = defineEmits<{
  (e: 'searchTermChanged', value: string): void
  (e: 'goToPreviousResult'): void
  (e: 'goToNextResult'): void
  (e: 'closeSearch'): void
}>()

const SEARCH_TERM_DEBOUNCE_MS = 250
const searchTerm = ref('')
const searchDropRef = useTemplateRef<ComponentPublicInstance<typeof OcDrop>>('searchDropRef')
const { $gettext } = useGettext()
const searchLabel = $gettext('Search in book')
const searchingLabel = $gettext('Searching...')
const previousResultLabel = $gettext('Navigate to previous search result')
const nextResultLabel = $gettext('Navigate to next search result')
const closeSearchLabel = $gettext('Close search')
const skipNextSearchTermEmit = ref(false)
const emitSearchTermChangedDebounced = debounce((value: string) => {
  emit('searchTermChanged', value.trim())
}, SEARCH_TERM_DEBOUNCE_MS)

const searchResultStatusLabel = computed(() => {
  if (props.searching) {
    return searchingLabel
  }
  if (unref(searchTerm).trim() === '') {
    return ''
  }
  if (props.resultCount <= 0 || props.currentResultIndex < 0) {
    return '0/0'
  }
  const countLabel = props.hasMoreResults ? `${props.resultCount}+` : `${props.resultCount}`
  return `${props.currentResultIndex + 1}/${countLabel}`
})

watch(searchTerm, (value) => {
  if (unref(skipNextSearchTermEmit)) {
    skipNextSearchTermEmit.value = false
    return
  }
  emitSearchTermChangedDebounced(value)
})

function onCloseSearch() {
  emitSearchTermChangedDebounced.cancel()
  skipNextSearchTermEmit.value = true
  searchTerm.value = ''
  emit('searchTermChanged', '')
  emit('closeSearch')
  unref(searchDropRef)?.hide?.()
}

function onSearchEnter() {
  emit('goToNextResult')
}

async function focusSearchInput() {
  await nextTick()
  const dropElement = (unref(searchDropRef)?.$refs.drop || unref(searchDropRef)?.$el) as
    HTMLElement | undefined
  const searchInput = dropElement?.querySelector<HTMLInputElement>('.oc-search-input')
  searchInput?.focus()
}

onBeforeUnmount(() => {
  emitSearchTermChangedDebounced.cancel()
})
</script>
