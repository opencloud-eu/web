<template>
  <div>
    <oc-drop
      ref="searchDropRef"
      :title="$gettext('Search in book')"
      :toggle="toggle"
      mode="click"
      :offset="20"
      :close-on-click="false"
      :is-menu="false"
      enforce-drop-on-mobile
      padding-size="small"
      @show-drop="focusSearchInput"
    >
      <div @keydown.enter.prevent="onSearchEnter">
        <oc-search-bar
          v-model="searchTerm"
          :label="$gettext('Search in book')"
          :placeholder="$gettext('Search in book')"
          :is-rounded="false"
          button-hidden
        />
      </div>
      <div class="mt-2 flex items-center justify-between gap-2">
        <span
          class="epub-reader-search-result-count text-sm text-role-on-surface-variant"
          aria-hidden="true"
          v-text="searchResultStatus.label"
        />
        <span
          class="epub-reader-search-result-announcement sr-only"
          aria-live="polite"
          v-text="searchResultStatus.announcement"
        />
        <div class="flex items-center gap-1">
          <oc-button
            v-oc-tooltip="$gettext('Navigate to previous search result')"
            :aria-label="$gettext('Navigate to previous search result')"
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
            v-oc-tooltip="$gettext('Navigate to next search result')"
            :aria-label="$gettext('Navigate to next search result')"
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
            v-oc-tooltip="$gettext('Close search')"
            :aria-label="$gettext('Close search')"
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

const {
  toggle,
  searching,
  resultCount,
  hasMoreResults,
  currentResultIndex,
  canNavigateThroughResults
} = defineProps<{
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
const skipNextSearchTermEmit = ref(false)
// true between typing and the debounced search request, so the status doesn't show 0/0 meanwhile
const isSearchPending = ref(false)
const emitSearchTermChangedDebounced = debounce((value: string) => {
  isSearchPending.value = false
  emit('searchTermChanged', value.trim())
}, SEARCH_TERM_DEBOUNCE_MS)

// the visible label is terse ("2/3"), screen readers get the status in words
const searchResultStatus = computed(() => {
  if (unref(searchTerm).trim() === '') {
    return { label: '', announcement: '' }
  }
  if (searching || unref(isSearchPending)) {
    const searchingLabel = $gettext('Searching...')
    return { label: searchingLabel, announcement: searchingLabel }
  }
  if (resultCount <= 0 || currentResultIndex < 0) {
    return { label: '0/0', announcement: $gettext('No results') }
  }
  const current = currentResultIndex + 1
  const total = hasMoreResults ? `${resultCount}+` : `${resultCount}`
  return {
    label: `${current}/${total}`,
    announcement: $gettext('Result %{current} of %{total}', { current, total })
  }
})

watch(searchTerm, (value) => {
  if (unref(skipNextSearchTermEmit)) {
    skipNextSearchTermEmit.value = false
    return
  }
  isSearchPending.value = true
  emitSearchTermChangedDebounced(value)
})

function onCloseSearch() {
  emitSearchTermChangedDebounced.cancel()
  isSearchPending.value = false
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
