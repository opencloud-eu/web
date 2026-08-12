<template>
  <div>
    <oc-drop
      ref="searchDropRef"
      :title="searchLabel"
      :toggle="toggle"
      mode="click"
      :close-on-click="false"
      enforce-drop-on-mobile
      padding-size="small"
      class="w-72 max-w-[calc(100vw-1rem)]"
      @show-drop="focusSearchInput"
    >
      <div @keydown.enter.prevent="onSearchEnter">
        <oc-search-bar
          v-model="searchTerm"
          :label="searchLabel"
          :placeholder="searchPlaceholder"
          :is-rounded="false"
          button-hidden
        />
      </div>
      <div class="mt-2 flex items-center justify-between gap-2">
        <span
          class="epub-reader-search-result-count min-w-[3.5rem] text-sm text-role-on-surface-variant"
          :aria-live="searching ? 'polite' : 'off'"
          v-text="searchResultStatusLabel"
        />
        <div class="flex items-center gap-1">
          <oc-button
            v-oc-tooltip="previousResultLabel"
            :aria-label="previousResultLabel"
            class="epub-reader-search-previous-result min-w-9"
            :disabled="!canGoToPreviousResult"
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
            class="epub-reader-search-next-result min-w-9"
            :disabled="!canGoToNextResult"
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
            class="epub-reader-search-close min-w-9"
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
import { ComponentPublicInstance, computed, nextTick, ref, unref, useTemplateRef, watch } from 'vue'

const props = defineProps<{
  toggle: string
  searchLabel: string
  searchPlaceholder: string
  searching: boolean
  searchingLabel: string
  resultCount: number
  currentResultIndex: number
  canGoToPreviousResult: boolean
  canGoToNextResult: boolean
  previousResultLabel: string
  nextResultLabel: string
  closeSearchLabel: string
}>()

const emit = defineEmits<{
  (e: 'searchTermChanged', value: string): void
  (e: 'goToPreviousResult'): void
  (e: 'goToNextResult'): void
  (e: 'closeSearch'): void
}>()

const searchTerm = ref('')
const searchDropRef = useTemplateRef<ComponentPublicInstance<typeof OcDrop>>('searchDropRef')

const searchResultStatusLabel = computed(() => {
  if (props.searching) {
    return props.searchingLabel
  }
  if (unref(searchTerm).trim() === '') {
    return ''
  }
  if (props.resultCount <= 0 || props.currentResultIndex < 0) {
    return '0/0'
  }
  return `${props.currentResultIndex + 1}/${props.resultCount}`
})

watch(searchTerm, (value) => {
  emit('searchTermChanged', value.trim())
})

function onCloseSearch() {
  searchTerm.value = ''
  emit('closeSearch')
  const toggleElement = document.querySelector<HTMLElement>('#epub_reader_text_search_toggle')
  toggleElement?.click()
}

function onSearchEnter() {
  emit('goToNextResult')
}

async function focusSearchInput() {
  await nextTick()
  const dropElement = (unref(searchDropRef)?.$refs.drop ||
    unref(searchDropRef)?.$el) as HTMLElement | undefined
  const searchInput = dropElement?.querySelector<HTMLInputElement>('.oc-search-input')
  searchInput?.focus()
}
</script>
