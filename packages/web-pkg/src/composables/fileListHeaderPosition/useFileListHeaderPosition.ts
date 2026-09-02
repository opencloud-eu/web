import { ref, nextTick, onMounted, unref, Ref } from 'vue'
import { useResizeObserver } from '@vueuse/core'

export const useFileListHeaderPosition = (selector = ''): { y: Ref; refresh: () => void } => {
  const y = ref(0)
  const appBar = ref<HTMLElement>()

  const refresh = async (): Promise<void> => {
    await nextTick()
    const height = unref(appBar)?.getBoundingClientRect().height ?? 0

    if (y.value === height) {
      return
    }

    y.value = height
  }

  useResizeObserver(appBar, refresh)

  onMounted(() => {
    appBar.value = document.querySelector<HTMLElement>(selector || '#files-app-bar')
    refresh()
  })

  return { y, refresh }
}
