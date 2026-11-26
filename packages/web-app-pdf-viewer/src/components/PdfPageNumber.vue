<template>
  <oc-text-input
    id="pdf-viewer-page-number"
    ref="input"
    :type="pageLabels ? 'text' : 'number'"
    :model-value="currentPage"
    :title="pageLabels ? currentPage : undefined"
    :label="$gettext('Page number')"
    class="pdf-viewer-page-number [&_input]:h-8! [&_input]:text-center [&_input]:text-sm [&_input]:[appearance:textfield] [&_input::-webkit-inner-spin-button]:appearance-none [&_input::-webkit-outer-spin-button]:appearance-none"
    :class="pageLabels ? 'w-20' : 'w-11'"
    min="1"
    :max="pagesCount"
    @change="onChange"
  >
    <template #label>
      <label class="sr-only" for="pdf-viewer-page-number" v-text="$gettext('Page number')" />
    </template>
  </oc-text-input>
  <span
    class="pdf-viewer-pages-count whitespace-nowrap px-1 text-sm text-role-on-surface-variant"
    v-text="pagesText"
  />
</template>

<script setup lang="ts">
import { computed, unref, useTemplateRef } from 'vue'
import { useGettext } from 'vue3-gettext'
import type { OcTextInput } from '@opencloud-eu/design-system/components'

const {
  pageNumber,
  pagesCount,
  pageLabels = undefined
} = defineProps<{
  pageNumber: number
  pagesCount: number
  /** E.g. "iii" for the third page, see usePdfPageLabels. */
  pageLabels?: string[]
}>()

const emit = defineEmits<{ goToPage: [pageNumber: number] }>()

const { $gettext } = useGettext()

// With page labels like in the PDF.js viewer: "iii (3 of 214)". They come after the document,
// and a number input would drop a label, so the type has to be set before the value, which
// OcTextInput does.
const currentPage = computed(() => pageLabels?.[pageNumber - 1] ?? String(pageNumber))
const pagesText = computed(() => {
  const count = String(pagesCount)
  return pageLabels
    ? $gettext('(%{page} of %{count})', { page: String(pageNumber), count })
    : $gettext('of %{count}', { count })
})

const input = useTemplateRef<InstanceType<typeof OcTextInput>>('input')

function getInputElement() {
  return unref(input)?.$el.querySelector('input')
}

// A label first, otherwise the number, like in the PDF.js viewer.
function onChange(value: string) {
  const labelIndex = pageLabels?.indexOf(value) ?? -1
  const page = labelIndex >= 0 ? labelIndex + 1 : Number(value)
  // Shows the current page again, unless going to another one replaces it. The model stays
  // the same, so the input doesn't follow it by itself.
  const element = getInputElement()
  if (element) {
    element.value = unref(currentPage)
  }
  if (Number.isInteger(page) && page >= 1 && page <= pagesCount) {
    emit('goToPage', page)
  }
}

function select() {
  const element = getInputElement()
  element?.focus()
  element?.select()
}

defineExpose({ select })
</script>
