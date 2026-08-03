<template>
  <div class="w-[20rem] max-w-[calc(100vw-1rem)] rounded-md bg-role-surface p-2">
    <div class="flex items-center justify-between gap-2 px-1 py-1">
      <span class="text-sm text-role-on-surface-variant" data-testid="editor-search-result-counter">
        {{ resultPositionLabel }}
      </span>
      <div class="flex items-center gap-1">
        <oc-button
          v-oc-tooltip="$gettext('Previous result')"
          appearance="raw"
          class="h-7 w-7 justify-center p-0"
          :aria-label="$gettext('Previous result')"
          :disabled="!hasResults"
          data-testid="editor-search-prev"
          @click="goToPreviousResult"
        >
          <oc-icon name="arrow-up-s" fill-type="line" size-class="size-4" />
        </oc-button>
        <oc-button
          v-oc-tooltip="$gettext('Next result')"
          appearance="raw"
          class="h-7 w-7 justify-center p-0"
          :aria-label="$gettext('Next result')"
          :disabled="!hasResults"
          data-testid="editor-search-next"
          @click="goToNextResult"
        >
          <oc-icon name="arrow-down-s" fill-type="line" size-class="size-4" />
        </oc-button>
        <oc-button
          v-oc-tooltip="$gettext('Close')"
          appearance="raw"
          class="h-7 w-7 justify-center p-0"
          :aria-label="$gettext('Close')"
          @click="closePanel"
        >
          <oc-icon name="close" fill-type="line" size-class="size-4" />
        </oc-button>
      </div>
    </div>

    <div class="mt-1 flex flex-col gap-2">
      <oc-text-input
        ref="searchInputRef"
        v-model="searchTerm"
        class="w-full"
        :label="$gettext('Search')"
        :placeholder="$gettext('Search')"
        data-testid="editor-search-input"
        @keydown.enter.prevent="goToNextResult"
        @keydown.shift.enter.prevent="goToPreviousResult"
      >
        <template #label>
          <label class="sr-only">{{ $gettext('Search') }}</label>
        </template>
      </oc-text-input>

      <oc-text-input
        v-if="showReplace"
        v-model="replaceTerm"
        class="w-full"
        :label="$gettext('Replace')"
        :placeholder="$gettext('Replace')"
        data-testid="editor-replace-input"
        @keydown.enter.prevent="replaceCurrent"
      >
        <template #label>
          <label class="sr-only">{{ $gettext('Replace') }}</label>
        </template>
      </oc-text-input>
    </div>

    <div class="mt-4 flex flex-col gap-2 text-sm">
      <div class="[&>*]:flex [&>*]:w-full [&>*]:justify-between">
        <oc-switch
          :checked="caseSensitive"
          :label="$gettext('Match case')"
          class="w-full"
          data-testid="editor-search-case-sensitive"
          @update:checked="setCaseSensitive"
        >
          <oc-icon name="font-size" fill-type="none" size-class="size-4 order-first" />
        </oc-switch>
      </div>
      <div class="[&>*]:flex [&>*]:w-full [&>*]:justify-between">
        <oc-switch
          :checked="wholeWord"
          :label="$gettext('Whole words')"
          class="w-full"
          data-testid="editor-search-whole-word"
          @update:checked="setWholeWord"
        >
          <oc-icon name="text" fill-type="none" size-class="size-4 order-first" />
        </oc-switch>
      </div>
    </div>

    <div v-if="showReplace" class="mt-4 flex justify-end gap-2">
      <oc-button
        appearance="outline"
        :disabled="!canReplace"
        data-testid="editor-search-replace"
        size="small"
        @click="replaceCurrent"
      >
        {{ $gettext('Replace') }}
      </oc-button>
      <oc-button
        appearance="outline"
        :disabled="!canReplaceAll"
        data-testid="editor-search-replace-all"
        size="small"
        @click="replaceAll"
      >
        {{ $gettext('Replace all') }}
      </oc-button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useGettext } from 'vue3-gettext'
import type { Editor } from '@tiptap/core'
import { OcButton, OcIcon, OcSwitch, OcTextInput } from '@opencloud-eu/design-system/components'

const props = defineProps<{
  editor: Editor
  closeMenu: () => void
  searchSearchTerm: string
  searchReplaceTerm: string
  searchCaseSensitive: boolean
  searchWholeWord: boolean
}>()

const emit = defineEmits<{
  'update:searchSearchTerm': [value: string]
  'update:searchReplaceTerm': [value: string]
  'update:searchCaseSensitive': [value: boolean]
  'update:searchWholeWord': [value: boolean]
}>()

const searchTerm = computed({
  get: () => props.searchSearchTerm,
  set: (value) => emit('update:searchSearchTerm', value)
})

const replaceTerm = computed({
  get: () => props.searchReplaceTerm,
  set: (value) => emit('update:searchReplaceTerm', value)
})

const caseSensitive = computed({
  get: () => props.searchCaseSensitive,
  set: (value) => emit('update:searchCaseSensitive', value)
})

const wholeWord = computed({
  get: () => props.searchWholeWord,
  set: (value) => emit('update:searchWholeWord', value)
})

const { $gettext } = useGettext()

const resultCount = ref(0)
const currentResultPosition = ref(0)
const searchInputRef = ref<InstanceType<typeof OcTextInput>>()

const updateResultState = () => {
  const storage = props.editor.storage.findAndReplace
  const results = storage?.results || []
  const currentIndex = storage?.currentIndex
  resultCount.value = results.length
  currentResultPosition.value = currentIndex === null || currentIndex < 0 ? 0 : currentIndex + 1
}

const hasResults = computed(() => resultCount.value > 0)
const resultPositionLabel = computed(() => `${currentResultPosition.value} / ${resultCount.value}`)
const canReplace = computed(() => hasResults.value && searchTerm.value.length > 0)
const canReplaceAll = computed(() => hasResults.value && searchTerm.value.length > 0)
const showReplace = computed(() => true)

const goToNextResult = () => {
  props.editor.commands.goToNextResult()
  updateResultState()
}

const setCaseSensitive = (value: boolean) => {
  caseSensitive.value = value
}

const setWholeWord = (value: boolean) => {
  wholeWord.value = value
}

const goToPreviousResult = () => {
  props.editor.commands.goToPreviousResult()
  updateResultState()
}

const replaceCurrent = () => {
  props.editor.commands.replace()
  updateResultState()
}

const replaceAll = () => {
  props.editor.commands.replaceAll()
  updateResultState()
}

const clearActiveSearch = () => {
  props.editor.commands.clearSearch()
  updateResultState()
}

const closePanel = () => {
  clearActiveSearch()
  props.closeMenu()
}

watch(searchTerm, (value) => {
  props.editor.commands.setSearchTerm(value)
  updateResultState()
})

watch(replaceTerm, (value) => {
  props.editor.commands.setReplaceTerm(value)
  updateResultState()
})

watch(caseSensitive, (value) => {
  props.editor.commands.setCaseSensitive(value)
  updateResultState()
})

watch(wholeWord, (value) => {
  props.editor.commands.setWholeWord(value)
  updateResultState()
})

onMounted(() => {
  // Re-apply search values and trigger a fresh search each time the panel opens.
  props.editor.commands.setReplaceTerm(replaceTerm.value)
  props.editor.commands.setCaseSensitive(caseSensitive.value)
  props.editor.commands.setWholeWord(wholeWord.value)
  props.editor.commands.setSearchTerm(searchTerm.value)

  props.editor.on('transaction', updateResultState)
  updateResultState()

  // Focus search input when panel opens
  searchInputRef.value?.focus()
})

onBeforeUnmount(() => {
  if (props.editor?.isDestroyed === false) {
    clearActiveSearch()
    props.editor.off('transaction', updateResultState)
  }
})
</script>
