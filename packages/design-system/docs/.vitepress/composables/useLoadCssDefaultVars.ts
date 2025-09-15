import { onMounted, Ref, ref } from 'vue'

type CssVar = {
  name: string
  value: string
}

export const useLoadCssDefaultVars = () => {
  const cssVars: Ref<CssVar[]> = ref([])
  const isLoading = ref(true)

  const load = async () => {
    try {
      const response = await fetch('../cssDefaultVars.json')
      if (response.headers?.get('content-type')?.startsWith('application/json')) {
        return response.json()
      }
      return []
    } catch (e) {
      console.error('error loading css default vars', e)
    }
  }

  onMounted(async () => {
    cssVars.value = await load()
    isLoading.value = false
  })

  return {
    isLoading,
    cssVars
  }
}
