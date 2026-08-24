import { Ref, onMounted, ref, unref } from 'vue'

const scrollContainerId = 'files-view-wrapper'

/**
 * Resolves the scrollable element the files views are rendered in. The lookup is
 * repeated on mount, because on the very first render the container might not be in
 * the DOM yet (if the container gets rendered in the same tick as the component).
 */
export function useFilesViewScrollContainer(): Ref<HTMLElement | null> {
  const scrollContainer = ref(document.getElementById(scrollContainerId))

  onMounted(() => {
    if (!unref(scrollContainer)) {
      scrollContainer.value = document.getElementById(scrollContainerId)
    }
  })

  return scrollContainer
}
