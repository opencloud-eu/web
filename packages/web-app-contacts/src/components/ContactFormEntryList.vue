<template>
  <fieldset class="flex flex-col gap-2">
    <legend class="mb-2 font-bold" v-text="title" />
    <div
      v-for="(entry, index) in entries"
      :key="entry.key"
      class="flex items-start gap-2"
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
        class="min-w-0 flex-1"
        :model-value="entry.value"
        :type="inputType"
        :label="inputLabel"
        :error-message="getErrorMessage?.(entry.value)"
        @update:model-value="(value: string) => updateEntry(index, { value })"
      />
      <oc-button
        class="mt-6 shrink-0"
        appearance="raw"
        :aria-label="removeLabel"
        @click="removeEntry(index)"
      >
        <oc-icon name="close" fill-type="line" />
      </oc-button>
    </div>
    <div>
      <oc-button appearance="raw" size="small" @click="addEntry">
        <oc-icon name="add" fill-type="line" size="small" />
        <span v-text="addLabel" />
      </oc-button>
    </div>
  </fieldset>
</template>

<script setup lang="ts" generic="C extends string">
import type { ContactFormEntry } from '../helpers/contactForm'

type ContextOption = { value: C; label: string }

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
  removeLabel: string
  inputType?: 'text' | 'email'
  getErrorMessage?: (value: string) => string
}>()

const emit = defineEmits<{
  'update:entries': [entries: ContactFormEntry<C>[]]
}>()

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
  emit('update:entries', [...entries, createEntry()])
}

function removeEntry(index: number) {
  emit(
    'update:entries',
    entries.filter((_, i) => i !== index)
  )
}
</script>
