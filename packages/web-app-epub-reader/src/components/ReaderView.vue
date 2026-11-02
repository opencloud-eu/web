<template>
  <div class="flex min-h-0 flex-1 items-center gap-2 px-2 py-2 md:px-4">
    <oc-button
      v-oc-tooltip="$gettext('Navigate to previous page')"
      class="epub-reader-navigate-left hidden shrink-0 rounded-sm text-role-on-surface-variant md:flex"
      :aria-label="$gettext('Navigate to previous page')"
      :disabled="navigateLeftDisabled"
      appearance="raw"
      @click="emit('navigateLeft')"
    >
      <oc-icon name="arrow-left-s" fill-type="line" size-class="size-10" />
    </oc-button>
    <div class="flex h-full min-w-0 flex-1 justify-center overflow-hidden">
      <div ref="bookContainer" class="epub-reader-book h-full w-[650px] max-w-full scheme-light" />
    </div>
    <oc-button
      v-oc-tooltip="$gettext('Navigate to next page')"
      class="epub-reader-navigate-right hidden shrink-0 rounded-sm text-role-on-surface-variant md:flex"
      :aria-label="$gettext('Navigate to next page')"
      :disabled="navigateRightDisabled"
      appearance="raw"
      @click="emit('navigateRight')"
    >
      <oc-icon name="arrow-right-s" fill-type="line" size-class="size-10" />
    </oc-button>
  </div>
</template>

<script setup lang="ts">
import { useTemplateRef } from 'vue'
import { useGettext } from 'vue3-gettext'

defineProps<{
  navigateLeftDisabled: boolean
  navigateRightDisabled: boolean
}>()
const emit = defineEmits<{
  (e: 'navigateLeft'): void
  (e: 'navigateRight'): void
}>()

const { $gettext } = useGettext()
const bookContainer = useTemplateRef<HTMLElement>('bookContainer')

defineExpose({ bookContainer })
</script>
