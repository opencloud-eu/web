<template>
  <oc-text-input
    id="create-shortcut-modal-url-input"
    :model-value="modelValue"
    :placeholder="'example.org'"
    :label="$gettext('Webpage or file')"
    :error-message="inputUrlErrorMessage"
    @keydown="onKeydown"
    @update:model-value="onInput"
    @click="showSuggestions"
  >
    <template #label>
      <div class="flex items-center mb-1">
        <label for="create-shortcut-modal-url-input">
          {{ $gettext('Webpage or file') }}
          <span class="text-role-error" aria-hidden="true">*</span>
        </label>
        <oc-contextual-helper
          :text="
            $gettext(
              'Enter the target URL of a webpage or the name of a file. Users will be directed to this webpage or file.'
            )
          "
          :title="$gettext('Webpage or file')"
          class="ml-1"
        />
      </div>
    </template>
  </oc-text-input>
  <oc-drop
    ref="dropRef"
    toggle="#create-shortcut-modal-url-input"
    class="w-lg"
    padding-size="remove"
    drop-id="create-shortcut-modal-contextmenu"
    mode="manual"
    position="bottom-start"
    close-on-click
    enforce-drop-on-mobile
    :is-menu="false"
    @hide-drop="isDropOpen = false"
    @show-drop="onShowDrop"
  >
    <oc-list ref="suggestionsRef" class="p-2">
      <li
        class="create-shortcut-modal-search-separator text-role-on-surface-variant text-xs py-1 px-2"
      >
        <span v-text="$gettext('Link to a file')" />
      </li>
      <li
        v-for="(value, index) in searchResults"
        :key="value.id"
        class="selectable-item hover:bg-role-surface-container"
        :class="{
          'active bg-role-secondary-container': activeIndex === index,
          disabled: isDisabled(value)
        }"
      >
        <oc-button
          class="w-full py-1 px-2 min-h-10"
          appearance="raw"
          justify-content="left"
          size="small"
          no-hover
          :disabled="isDisabled(value)"
          @click="selectSuggestion(index)"
        >
          <resource-preview :search-result="value" :is-clickable="false" :term="modelValue" />
        </oc-button>
      </li>
    </oc-list>
  </oc-drop>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, ref, unref, useTemplateRef, watch } from 'vue'
import { debounce } from 'lodash-es'
import { useCycleList } from '@vueuse/core'
import { useTask } from 'vue-concurrency'
import { OcDrop, OcList } from '@opencloud-eu/design-system/components'
import { isComposingEvent } from '@opencloud-eu/design-system/helpers'
import { useGettext } from 'vue3-gettext'
import { useRouter } from '../composables/router'
import { useSearch } from '../composables/search'
import { isLocationPublicActive } from '../router'
import { getShortcutUrl } from '../helpers'
import ResourcePreview from './Search/ResourcePreview.vue'
import { SearchResult, SearchResultValue } from './Search/types'

const { modelValue = '' } = defineProps<{ modelValue?: string }>()
const emit = defineEmits<{
  (e: 'update:modelValue', value: string): void
  (e: 'select', url: string, name: string): void
}>()

const { $gettext } = useGettext()
const router = useRouter()
const { search } = useSearch()
const dropRef = useTemplateRef<typeof OcDrop>('dropRef')
const suggestionsRef = useTemplateRef<typeof OcList>('suggestionsRef')
const isDropOpen = ref(false)
const searchResults = ref<SearchResultValue[]>([])

const shortcutUrl = computed(() => getShortcutUrl(modelValue))
const inputUrlErrorMessage = computed(() =>
  modelValue.trim() && !unref(shortcutUrl) ? $gettext('Please enter a valid http or https URL') : ''
)
// Preserve the unselected step when navigating past either end of the suggestions.
const selectableIndices = computed(() => [
  -1,
  ...unref(searchResults).flatMap((item, index) => (isDisabled(item) ? [] : [index]))
])
const { state: activeIndex, next, prev } = useCycleList(selectableIndices)
const searchTask = useTask(function* (_signal, term: string) {
  try {
    const result: SearchResult = yield search(`name:"*${term}*" NOT name:"*.url"`, 7)
    searchResults.value = result.values
    showSuggestions()
  } catch {
    // URL shortcuts remain usable when file search is unavailable.
  }
})
const debouncedSearch = debounce((term: string) => searchTask.perform(term), 200)

function resetSearch() {
  debouncedSearch.cancel()
  searchTask.clear()
  searchResults.value = []
  activeIndex.value = -1
  unref(dropRef)?.hide()
}

function onInput(value: string) {
  emit('update:modelValue', value)
  resetSearch()
  if (!value.trim() || isLocationPublicActive(router, 'files-public-link')) {
    return
  }
  debouncedSearch(value)
}

function onShowDrop() {
  isDropOpen.value = true
  activeIndex.value = -1
}

function showSuggestions() {
  if (unref(searchResults).length) {
    unref(dropRef)?.show({ noFocus: true })
  }
}

function isDisabled(item: SearchResultValue) {
  return 'disabled' in item.data && item.data.disabled === true
}

function selectSuggestion(index: number) {
  const item = unref(searchResults)[index]
  if (!item || isDisabled(item)) {
    return
  }
  emit('select', `${window.location.origin}/f/${item.id}`, item.data.name)
  resetSearch()
}

function onKeydown(event: KeyboardEvent) {
  if (!unref(isDropOpen) || isComposingEvent(event)) {
    return
  }
  if (!['ArrowUp', 'ArrowDown', 'Enter', 'Escape'].includes(event.key)) {
    return
  }
  event.stopPropagation()
  if (event.key === 'Escape') {
    unref(dropRef)?.hide()
    return
  }
  event.preventDefault()
  if (event.key === 'Enter') {
    selectSuggestion(unref(activeIndex))
    return
  }
  if (event.key === 'ArrowDown') {
    next()
  } else {
    prev()
  }
}

watch(
  activeIndex,
  (index) => {
    if (!unref(isDropOpen) || index < 0) {
      return
    }
    const list = unref(suggestionsRef)?.$el as HTMLElement | undefined
    list
      ?.querySelectorAll<HTMLElement>('.selectable-item')
      [index]?.scrollIntoView?.({ block: 'nearest' })
  },
  { flush: 'post' }
)

onBeforeUnmount(resetSearch)
</script>
