<template>
  <div class="flex min-h-0 flex-1 items-stretch gap-2 px-2 py-2 md:px-4">
    <div class="flex min-w-0 flex-1 items-center justify-center overflow-hidden">
      <div class="relative mx-auto h-full min-h-[420px] w-[650px] max-w-full">
        <div id="reader" ref="bookContainer" class="h-full w-full" />
        <oc-button
          v-oc-tooltip="previousPageLabel"
          class="epub-reader-navigate-left absolute left-0 top-1/2 hidden -translate-x-10 -translate-y-1/2 rounded-sm text-role-on-surface-variant md:flex"
          :aria-label="previousPageLabel"
          :disabled="navigateLeftDisabled"
          appearance="raw"
          @click="navigateLeft"
        >
          <oc-icon name="arrow-left-s" fill-type="line" size-class="size-10" />
        </oc-button>
        <oc-button
          v-oc-tooltip="nextPageLabel"
          class="epub-reader-navigate-right absolute right-0 top-1/2 hidden translate-x-10 -translate-y-1/2 rounded-sm text-role-on-surface-variant md:flex"
          :aria-label="nextPageLabel"
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
import type { Rendition } from 'epubjs'
import { ref, unref, useTemplateRef } from 'vue'

defineProps<{
  previousPageLabel: string
  nextPageLabel: string
  navigateLeftDisabled: boolean
  navigateRightDisabled: boolean
}>()

const bookContainer = useTemplateRef<HTMLElement>('bookContainer')
const rendition = ref<Rendition>()

function getBookContainer() {
  return unref(bookContainer)
}

function setRendition(value?: Rendition) {
  rendition.value = value
}

function navigateLeft() {
  unref(rendition)?.prev()
}

function navigateRight() {
  unref(rendition)?.next()
}

defineExpose({
  getBookContainer,
  setRendition,
  navigateLeft,
  navigateRight
})
</script>
