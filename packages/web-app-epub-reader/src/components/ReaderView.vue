<template>
  <div class="flex min-h-0 flex-1 items-stretch gap-2 px-2 py-2 md:px-4">
    <div class="flex min-w-0 flex-1 items-center justify-center overflow-hidden">
      <div class="relative mx-auto h-full min-h-[420px] w-[650px] max-w-full">
        <div id="reader" ref="bookContainer" class="h-full w-full" />
        <oc-button
          v-oc-tooltip="$gettext('Navigate to previous page')"
          class="epub-reader-navigate-left absolute left-0 top-1/2 hidden -translate-x-10 -translate-y-1/2 rounded-sm text-role-on-surface-variant md:flex"
          :aria-label="$gettext('Navigate to previous page')"
          :disabled="navigateLeftDisabled"
          appearance="raw"
          @click="navigateLeft"
        >
          <oc-icon name="arrow-left-s" fill-type="line" size-class="size-10" />
        </oc-button>
        <oc-button
          v-oc-tooltip="$gettext('Navigate to next page')"
          class="epub-reader-navigate-right absolute right-0 top-1/2 hidden translate-x-10 -translate-y-1/2 rounded-sm text-role-on-surface-variant md:flex"
          :aria-label="$gettext('Navigate to next page')"
          :disabled="navigateRightDisabled"
          appearance="raw"
          @click="navigateRight"
        >
          <oc-icon name="arrow-right-s" fill-type="line" size-class="size-10" />
        </oc-button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { unref, useTemplateRef } from 'vue'
import { useGettext } from 'vue3-gettext'

defineProps<{
  navigateLeftDisabled: boolean
  navigateRightDisabled: boolean
}>()
const emit = defineEmits<{
  (e: 'navigateLeft'): void
  (e: 'navigateRight'): void
}>()

const bookContainer = useTemplateRef<HTMLElement>('bookContainer')
const { $gettext } = useGettext()

function getBookContainer() {
  return unref(bookContainer)
}

function navigateLeft() {
  emit('navigateLeft')
}

function navigateRight() {
  emit('navigateRight')
}

defineExpose({
  getBookContainer,
  navigateLeft,
  navigateRight
})
</script>
