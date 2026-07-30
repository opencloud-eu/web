<template>
  <nav v-if="pages > 1" class="oc-pagination-inline flex items-center gap-2" :aria-label="navLabel">
    <oc-button
      class="oc-pagination-inline-prev"
      appearance="raw"
      :aria-label="$gettext('Go to the previous page')"
      :disabled="!isPrevPageAvailable"
      @click="goToPage($_currentPage - 1)"
    >
      <oc-icon name="arrow-drop-left" fill-type="line" />
    </oc-button>
    <span
      class="oc-pagination-inline-info text-sm"
      v-text="
        $gettext('Page %{currentPage} of %{pages}', {
          currentPage: $_currentPage.toString(),
          pages: pages.toString()
        })
      "
    />
    <oc-button
      class="oc-pagination-inline-next"
      appearance="raw"
      :aria-label="$gettext('Go to the next page')"
      :disabled="!isNextPageAvailable"
      @click="goToPage($_currentPage + 1)"
    >
      <oc-icon name="arrow-drop-right" fill-type="line" />
    </oc-button>
  </nav>
</template>

<script setup lang="ts">
import { computed, unref } from 'vue'
import { useGettext } from 'vue3-gettext'
import OcButton from '../OcButton/OcButton.vue'
import OcIcon from '../OcIcon/OcIcon.vue'

export interface Props {
  /**
   * @docs The current page number.
   */
  currentPage: number
  /**
   * @docs The total number of pages. Nothing is rendered if there is only one page.
   */
  pages: number
  /**
   * @docs The accessible label of the navigation.
   * @default Pagination
   */
  label?: string
}

export interface Emits {
  /**
   * @docs Emitted when a different page has been selected.
   */
  (e: 'update:currentPage', value: number): void
}

const { currentPage, pages, label = '' } = defineProps<Props>()

const emit = defineEmits<Emits>()

const { $gettext } = useGettext()

const navLabel = computed(() => label || $gettext('Pagination'))
const $_currentPage = computed(() => Math.max(1, Math.min(currentPage, pages)))
const isPrevPageAvailable = computed(() => unref($_currentPage) > 1)
const isNextPageAvailable = computed(() => unref($_currentPage) < pages)

function goToPage(page: number) {
  emit('update:currentPage', page)
}
</script>
