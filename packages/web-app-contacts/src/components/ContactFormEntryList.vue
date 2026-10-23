<template>
  <fieldset class="flex flex-col gap-2">
    <legend class="mb-2 font-bold" v-text="title" />
    <div
      v-for="(entry, index) in entries"
      :key="entry.key"
      class="flex items-start gap-2"
      role="group"
      :aria-label="getRowLabel(index + 1)"
      :data-testid="`contact-form-entry-${entry.key}`"
    >
      <oc-select
        class="w-36 shrink-0"
        :model-value="getOption(entry.context)"
        :label="$gettext('Type')"
        :options="contextOptions"
        option-label="label"
        :clearable="false"
        :searchable="false"
        @update:model-value="
          (option: ContextOption) => updateEntry(index, { context: option.value })
        "
      />
      <oc-text-input
        :ref="(el) => setInputRef(entry.key, el)"
        class="min-w-0 flex-1"
        :model-value="entry.value"
        :type="inputType"
        :label="inputLabel"
        :error-message="getErrorMessage?.(entry.value)"
        @update:model-value="(value: string) => updateEntry(index, { value })"
      />
      <oc-button
        class="contact-form-entry-remove mt-6 shrink-0"
        appearance="raw"
        :aria-label="getRemoveLabel(index + 1)"
        @click="removeEntry(index)"
      >
        <oc-icon name="close" fill-type="line" />
      </oc-button>
    </div>
    <div ref="addButtonWrapper">
      <oc-button appearance="raw" size="small" @click="addEntry">
        <oc-icon name="add" fill-type="line" size="small" />
        <span v-text="addLabel" />
      </oc-button>
    </div>
  </fieldset>
</template>

<script setup lang="ts" generic="C extends string">
import { nextTick, unref, useTemplateRef } from 'vue'
import type { ContactFormEntry } from '../helpers/contactForm'

type ContextOption = { value: C; label: string }
type FocusableInput = { focus: () => void }

const {
  entries,
  contextOptions,
  createEntry,
  inputType = 'text',
  getErrorMessage = undefined
} = defineProps<{
  entries: ContactFormEntry<C>[]
  contextOptions: ContextOption[]
  createEntry: () => ContactFormEntry<C>
  title: string
  inputLabel: string
  addLabel: string
  /** Accessible name of the row at the given (1-based) position, e.g. "Email 2". */
  getRowLabel: (position: number) => string
  /** Accessible name of the remove button of the row at the given (1-based) position. */
  getRemoveLabel: (position: number) => string
  inputType?: 'text' | 'email'
  getErrorMessage?: (value: string) => string
}>()

const emit = defineEmits<{
  'update:entries': [entries: ContactFormEntry<C>[]]
}>()

const addButtonWrapper = useTemplateRef<HTMLElement>('addButtonWrapper')
const inputRefs = new Map<string, FocusableInput>()

function setInputRef(key: string, el: unknown) {
  if (el) {
    inputRefs.set(key, el as FocusableInput)
    return
  }
  inputRefs.delete(key)
}

async function focusEntry(key: string | undefined) {
  await nextTick()
  const input = key ? inputRefs.get(key) : undefined
  if (input) {
    input.focus()
    return
  }
  unref(addButtonWrapper)?.querySelector('button')?.focus()
}

function getOption(context: C) {
  return contextOptions.find(({ value }) => value === context)
}

function updateEntry(index: number, changes: Partial<ContactFormEntry<C>>) {
  emit(
    'update:entries',
    entries.map((entry, i) => (i === index ? { ...entry, ...changes } : entry))
  )
}

function addEntry() {
  const entry = createEntry()
  emit('update:entries', [...entries, entry])
  focusEntry(entry.key)
}

function removeEntry(index: number) {
  // keep the focus in the list, the removed row's button is gone afterwards
  const neighbor = entries[index - 1] || entries[index + 1]
  emit(
    'update:entries',
    entries.filter((_, i) => i !== index)
  )
  focusEntry(neighbor?.key)
}
</script>
