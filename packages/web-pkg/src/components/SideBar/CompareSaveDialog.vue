<template>
  <div class="w-full flex flex-row flex-wrap justify-between items-center">
    <span v-if="showSaved" class="flex items-center">
      <oc-icon name="check" />
      <span class="ms-2" v-text="$gettext('Changes saved')" />
    </span>
    <span v-else>{{ unsavedChangesText }}</span>
    <div>
      <oc-button
        :disabled="!unsavedChanges"
        class="compare-save-dialog-revert-btn"
        @click="$emit('revert')"
      >
        <span v-text="$gettext('Revert')" />
      </oc-button>
      <oc-button
        appearance="filled"
        class="compare-save-dialog-confirm-btn"
        :disabled="!unsavedChanges || confirmButtonDisabled"
        @click="$emit('confirm')"
      >
        <span v-text="$gettext('Save')" />
      </oc-button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, unref, watch } from 'vue'
import isEqual from 'lodash-es/isEqual'
import { useGettext } from 'vue3-gettext'

const SAVED_MESSAGE_TIMEOUT = 3000

const {
  originalObject,
  compareObject,
  confirmButtonDisabled = false,
  saved = false
} = defineProps<{
  originalObject: Record<string, any>
  compareObject: Record<string, any>
  confirmButtonDisabled?: boolean
  saved?: boolean
}>()

const emit = defineEmits<{
  (e: 'confirm'): void
  (e: 'revert'): void
  (e: 'update:saved', value: boolean): void
}>()

const { $gettext } = useGettext()

let savedTimeout: ReturnType<typeof setTimeout>

const unsavedChanges = computed(() => !isEqual(originalObject, compareObject))
const showSaved = computed(() => saved && !unref(unsavedChanges))
const unsavedChangesText = computed(() =>
  unref(unsavedChanges) ? $gettext('Unsaved changes') : $gettext('No changes')
)

watch(
  () => saved,
  (isSaved) => {
    clearTimeout(savedTimeout)
    if (!isSaved) {
      return
    }
    savedTimeout = setTimeout(() => emit('update:saved', false), SAVED_MESSAGE_TIMEOUT)
  }
)

onBeforeUnmount(() => {
  clearTimeout(savedTimeout)
})
</script>
