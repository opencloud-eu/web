<template>
  <div class="w-full flex flex-row flex-wrap justify-between items-center">
    <span v-if="saved" class="flex items-center">
      <oc-icon name="checkbox-circle" />
      <span class="ml-2" v-text="$gettext('Changes saved')" />
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
import { onBeforeUnmount, onMounted, ref, computed, unref, watch } from 'vue'
import isEqual from 'lodash-es/isEqual'
import { eventBus } from '../../services/eventBus'
import { useGettext } from 'vue3-gettext'

const {
  originalObject,
  compareObject,
  confirmButtonDisabled = false
} = defineProps<{
  originalObject: Record<string, any>
  compareObject: Record<string, any>
  confirmButtonDisabled?: boolean
}>()

defineEmits<{
  (e: 'confirm'): void
  (e: 'revert'): void
}>()

const { $gettext } = useGettext()

const saved = ref(false)
let savedEventToken: string

const unsavedChanges = computed(() => !isEqual(originalObject, compareObject))
const unsavedChangesText = computed(() =>
  unref(unsavedChanges) ? $gettext('Unsaved changes') : $gettext('No changes')
)

onMounted(() => {
  savedEventToken = eventBus.subscribe('sidebar.entity.saved', () => {
    saved.value = true
  })
})

onBeforeUnmount(() => {
  eventBus.unsubscribe('sidebar.entity.saved', savedEventToken)
})

watch(
  () => unref(unsavedChanges),
  (newVal) => {
    if (newVal) {
      saved.value = false
    }
  }
)

watch(
  () => originalObject.id,
  () => {
    saved.value = false
  }
)
</script>
