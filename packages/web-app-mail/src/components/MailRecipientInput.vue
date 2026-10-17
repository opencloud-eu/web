<template>
  <div class="relative">
    <oc-text-input
      :model-value="modelValue"
      type="email"
      :label="label"
      :inline-label="true"
      :has-border="false"
      role="combobox"
      autocomplete="off"
      aria-autocomplete="list"
      :aria-expanded="isOpen"
      :aria-controls="listId"
      :aria-activedescendant="isOpen ? getOptionId(activeIndex) : undefined"
      @update:model-value="onInput"
      @keydown="onKeydown"
      @blur="closeSuggestions"
    />
    <ul
      v-if="isOpen"
      :id="listId"
      role="listbox"
      :aria-label="$gettext('Suggested recipients')"
      class="mail-recipient-suggestions absolute inset-x-0 top-full z-10 mt-1 max-h-64 overflow-auto rounded-md border border-role-outline-variant bg-role-surface-container-high py-1 shadow-md"
    >
      <li
        v-for="(suggestion, index) in suggestions"
        :id="getOptionId(index)"
        :key="suggestion.email"
        role="option"
        :aria-selected="index === activeIndex"
        class="flex cursor-pointer flex-col px-3 py-2"
        :class="{ 'bg-role-secondary-container': index === activeIndex }"
        @mousedown.prevent="selectSuggestion(suggestion)"
        @mouseenter="activeIndex = index"
      >
        <span v-if="suggestion.name" class="truncate font-bold" v-text="suggestion.name" />
        <span class="truncate text-sm text-role-on-surface-variant" v-text="suggestion.email" />
      </li>
    </ul>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, unref, useId, watch } from 'vue'
import {
  useRecipientSuggestions,
  type RecipientSuggestion
} from '../composables/useRecipientSuggestions'

const { modelValue, accountId = '' } = defineProps<{
  modelValue: string
  label: string
  accountId?: string
}>()

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()

const listId = useId()
const { suggestions, searchSuggestions, clearSuggestions } = useRecipientSuggestions()
const activeIndex = ref(0)
const isDismissed = ref(false)

const isOpen = computed(() => !unref(isDismissed) && unref(suggestions).length > 0)

watch(suggestions, () => {
  activeIndex.value = 0
})

function getOptionId(index: number) {
  return `${listId}-option-${index}`
}

// the recipients are a comma separated list, suggestions are made for the last one
function splitRecipients(value: string) {
  const separatorIndex = value.lastIndexOf(',')
  return {
    completed: separatorIndex < 0 ? '' : value.slice(0, separatorIndex + 1),
    current: value.slice(separatorIndex + 1).trim()
  }
}

function onInput(value: string) {
  emit('update:modelValue', value)
  isDismissed.value = false
  searchSuggestions(accountId, splitRecipients(value).current)
}

function selectSuggestion({ email }: RecipientSuggestion) {
  const { completed } = splitRecipients(modelValue)
  emit('update:modelValue', `${completed}${completed ? ' ' : ''}${email}, `)
  clearSuggestions()
}

function closeSuggestions() {
  isDismissed.value = true
}

function onKeydown(event: KeyboardEvent) {
  if (!unref(isOpen)) {
    return
  }

  const count = unref(suggestions).length
  switch (event.key) {
    case 'ArrowDown':
      activeIndex.value = (unref(activeIndex) + 1) % count
      break
    case 'ArrowUp':
      activeIndex.value = (unref(activeIndex) - 1 + count) % count
      break
    case 'Enter':
      selectSuggestion(unref(suggestions)[unref(activeIndex)])
      break
    case 'Escape':
      closeSuggestions()
      break
    default:
      return
  }

  event.preventDefault()
  event.stopPropagation()
}
</script>
