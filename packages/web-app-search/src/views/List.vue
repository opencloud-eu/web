<template>
  <component
    :is="listSearch.component"
    v-if="listSearch"
    :search-result="searchResult"
    :loading="loading"
    @search="search"
  />
</template>

<script setup lang="ts">
import { computed, ref, unref } from 'vue'
import { queryItemAsString, useRouteQuery } from '@opencloud-eu/web-pkg'
import { useAvailableProviders } from '../composables'

const availableProviders = useAvailableProviders()
const providerId = useRouteQuery('provider')

const listSearch = computed(() => {
  const providers = unref(availableProviders).filter((provider) => !!provider.listSearch)
  // fall back to the first provider if the requested one is missing or unknown
  const provider =
    providers.find(({ id }) => id === queryItemAsString(unref(providerId))) || providers[0]
  return provider?.listSearch
})

// The resources always have to be loaded from the server first.
// Therefore, the loading spinner is active by default, which prevents incorrect results from being displayed.
const loading = ref(true)
const searchResult = ref({
  values: [],
  totalResults: null
})

const search = async (term: string) => {
  loading.value = true
  try {
    searchResult.value = await unref(listSearch).search(term || '')
  } catch (e) {
    if (e === 'cancel') {
      return
    }
    searchResult.value = {
      values: [],
      totalResults: null
    }
    console.error(e)
  }

  loading.value = false
}
</script>
