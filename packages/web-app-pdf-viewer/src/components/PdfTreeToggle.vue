<template>
  <oc-button
    v-oc-tooltip="label"
    :aria-label="label"
    :aria-expanded="isExpanded"
    class="size-8 shrink-0 justify-center"
    appearance="raw"
    gap-size="none"
    @click="emit('toggle', $event.shiftKey)"
  >
    <oc-icon
      :name="isExpanded ? 'arrow-down-s' : 'arrow-right-s'"
      fill-type="line"
      size-class="size-4"
    />
  </oc-button>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useGettext } from 'vue3-gettext'

const { isExpanded = false } = defineProps<{
  isExpanded?: boolean
}>()

const emit = defineEmits<{
  /** With Shift, for the entries below as well, like in the PDF.js viewer. */
  toggle: [withSubtree: boolean]
}>()

const { $gettext } = useGettext()

const label = computed(() => (isExpanded ? $gettext('Collapse') : $gettext('Expand')))
</script>
