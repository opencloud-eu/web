<template>
  <oc-bubble-menu
    class="pdf-viewer-find-bar gap-1 py-0.5 text-sm sm:py-1"
    @keydown.esc.prevent="emit('close', true)"
    @keydown.stop
  >
    <div
      class="relative w-52 min-w-44 shrink"
      @keydown.esc.capture.stop.prevent="emit('close', true)"
    >
      <oc-search-bar
        ref="searchBar"
        v-model="query"
        class="pdf-viewer-find-input [&_input]:pr-14 [&_.oc-search-button-wrapper]:hidden!"
        :class="{
          'pdf-viewer-find-not-found [&_input]:border-role-error!': findResult.notFound
        }"
        :label="$gettext('Find in document')"
        :placeholder="$gettext('Find in document…')"
        icon=""
        small
        button-hidden
        @keydown.enter.prevent="search('again', $event.shiftKey)"
      />
      <span
        v-if="query"
        class="pdf-viewer-find-count pointer-events-none absolute top-1/2 right-2.5 -translate-y-1/2 text-xs tabular-nums"
        :class="findResult.notFound ? 'text-role-error' : 'text-role-on-surface-variant'"
        aria-hidden="true"
        v-text="countText"
      />
      <span class="pdf-viewer-find-result sr-only" role="status" v-text="resultText" />
    </div>
    <pdf-toolbar-button
      :label="$gettext('Previous match')"
      icon="arrow-up-s"
      :disabled="!query"
      class="pdf-viewer-find-previous"
      @click="search('again', true)"
    />
    <pdf-toolbar-button
      :label="$gettext('Next match')"
      icon="arrow-down-s"
      :disabled="!query"
      class="pdf-viewer-find-next"
      @click="search('again')"
    />
    <pdf-toolbar-button
      id="pdf-viewer-find-options-toggle"
      :label="$gettext('Search options')"
      icon="settings-3"
      class="pdf-viewer-find-options"
    />
    <oc-drop
      drop-id="pdf-viewer-find-options"
      toggle="#pdf-viewer-find-options-toggle"
      :title="$gettext('Search options')"
      mode="click"
      padding-size="medium"
      :close-on-click="false"
      :is-menu="false"
      class="w-auto"
    >
      <div class="flex flex-col gap-2 text-sm">
        <oc-checkbox
          :model-value="options.highlightAll"
          class="pdf-viewer-find-highlight-all"
          :label="$gettext('Highlight all')"
          @update:model-value="setOption('highlightAll', $event, 'highlightallchange')"
        />
        <oc-checkbox
          :model-value="options.caseSensitive"
          class="pdf-viewer-find-match-case"
          :label="$gettext('Match case')"
          @update:model-value="setOption('caseSensitive', $event, 'casesensitivitychange')"
        />
        <oc-checkbox
          :model-value="options.matchDiacritics"
          class="pdf-viewer-find-match-diacritics"
          :label="$gettext('Match diacritics')"
          @update:model-value="setOption('matchDiacritics', $event, 'diacriticmatchingchange')"
        />
        <oc-checkbox
          :model-value="options.entireWord"
          class="pdf-viewer-find-whole-words"
          :label="$gettext('Whole words')"
          @update:model-value="setOption('entireWord', $event, 'entirewordchange')"
        />
      </div>
    </oc-drop>
    <pdf-toolbar-button
      :label="$gettext('Close')"
      icon="close"
      class="pdf-viewer-find-close"
      @click="emit('close', false)"
    />
  </oc-bubble-menu>
</template>

<script setup lang="ts">
import { computed, onMounted, unref, useTemplateRef, watch } from 'vue'
import { useGettext } from 'vue3-gettext'
import type { OcSearchBar } from '@opencloud-eu/design-system/components'
import type { FindOptions, FindResult, FindType } from '../composables/usePdfFindBar'
import PdfToolbarButton from './PdfToolbarButton.vue'

const { findResult } = defineProps<{ findResult: FindResult }>()

// Searches with the query and the options of the models, the parent has them by then.
const emit = defineEmits<{
  find: [params: { type: FindType; findPrevious: boolean }]
  /**
   * Escape closes the find bar like in the PDF.js viewer, also in the input, which would empty
   * the query instead (the search input of the browser and OcSearchBar). The query stays for
   * reopening and finding again.
   */
  close: [isEscape: boolean]
}>()

const { $gettext, $ngettext } = useGettext()

const searchBar = useTemplateRef<InstanceType<typeof OcSearchBar>>('searchBar')
// Kept by the parent while the find bar is closed, like in the PDF.js viewer.
const query = defineModel<string>('query', { default: '' })
const options = defineModel<FindOptions>('options', { required: true })

const resultText = computed(() => {
  if (!unref(query)) {
    return ''
  }
  if (findResult.notFound) {
    return $gettext('Phrase not found')
  }
  if (!findResult.total) {
    return ''
  }
  return $ngettext(
    '%{current} of %{total} match',
    '%{current} of %{total} matches',
    findResult.total,
    { current: String(findResult.current), total: String(findResult.total) }
  )
})

// Short like in browsers, the full sentence is for screen readers.
const countText = computed(() => {
  if (findResult.notFound) {
    return '0/0'
  }
  return findResult.total ? `${findResult.current}/${findResult.total}` : ''
})

function search(type: FindType, findPrevious = false) {
  emit('find', { type, findPrevious })
}

function setOption(name: keyof FindOptions, value: boolean, type: FindType) {
  options.value = { ...unref(options), [name]: value }
  search(type)
}

// Searches while typing, PDF.js debounces it.
watch(query, () => search(''))

function focus() {
  const input = unref(searchBar)?.$el.querySelector('input')
  input?.focus()
  input?.select()
}

onMounted(() => {
  focus()
  // The previous search is shown again where it was, like in the PDF.js viewer: PDF.js keeps
  // the current match while the find bar is closed, this type only brings the highlights back.
  if (unref(query)) {
    search('highlightallchange')
  }
})

defineExpose({ focus })
</script>
