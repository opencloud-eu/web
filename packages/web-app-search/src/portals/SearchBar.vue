<template>
  <div
    v-if="isSearchBarEnabled"
    id="files-global-search"
    ref="searchBar"
    class="flex"
    data-custom-key-bindings-disabled="true"
  >
    <oc-search-bar
      id="files-global-search-bar"
      ref="searchInputRef"
      :model-value="term"
      :label="$gettext('Enter search term')"
      :type-ahead="true"
      :placeholder="$gettext('Enter search term')"
      :button-hidden="true"
      :show-cancel-button="showCancelButton"
      :show-advanced-search-button="listProviderAvailable"
      cancel-button-appearance="raw-inverse"
      cancel-button-color-role="chrome"
      :cancel-handler="cancelSearch"
      small
      class="mx-auto sm:mx-0 bg-role-chrome sm:bg-transparent w-[95vw] sm:w-2xs md:w-lg h-12 absolute inset-0 sm:relative invisible sm:visible z-90 sm:z-auto"
      @advanced-search="onKeyUpEnter"
      @update:model-value="updateTerm"
      @clear="onClear"
      @click="showPreview"
      @keyup.esc="onClear"
      @keyup.up="onKeyUpUp"
      @keyup.down="onKeyUpDown"
      @keyup.enter="onKeyUpEnter"
      @keydown.tab="hideOptionsDrop"
    >
      <template #locationFilter>
        <search-bar-filter
          v-if="locationFilterAvailable"
          id="files-global-search-filter"
          :current-folder-available="currentFolderAvailable"
          :current-folder-is-in-vault="currentFolderIsInVault"
          @update:model-value="onLocationFilterChange"
        />
      </template>
    </oc-search-bar>
    <oc-button
      v-oc-tooltip="$gettext('Display search bar')"
      :aria-label="$gettext('Click to display and focus the search bar')"
      class="inline-flex sm:hidden mr-6"
      appearance="raw-inverse"
      color-role="chrome"
      no-hover
      @click="showSearchBar"
    >
      <oc-icon name="search" fill-type="line"></oc-icon>
    </oc-button>
    <oc-drop
      v-if="showDrop"
      ref="optionsDropRef"
      drop-id="files-global-search-options"
      toggle="#files-global-search-bar"
      mode="manual"
      target="#files-global-search-bar"
      class="w-[93vw] sm:w-2xs md:w-lg overflow-y-auto !max-w-none z-100"
      padding-size="remove"
      close-on-click
      enforce-drop-on-mobile
      :is-menu="false"
    >
      <oc-list class="oc-list-divider p-2">
        <li
          v-if="loading"
          class="flex justify-center items-center text-role-on-surface-variant py-1 px-2 text-sm"
        >
          <oc-spinner size="small" :aria-hidden="true" aria-label="" />
          <span class="ml-2">{{ $gettext('Searching ...') }}</span>
        </li>
        <li v-else-if="showNoResults" id="no-results" class="flex justify-center py-1 px-2 text-sm">
          {{ $gettext('No results') }}
        </li>
        <template v-else>
          <li v-for="provider in displayProviders" :key="provider.id" class="provider">
            <oc-list role="menu">
              <li
                class="truncate flex justify-between text-role-on-surface-variant provider-details py-1 px-2 text-xs"
              >
                <span class="display-name" v-text="$gettext(provider.displayName)" />
                <span v-if="!!provider.listSearch">
                  <router-link
                    class="more-results p-0"
                    :to="getSearchResultLocation(provider.id)"
                    :class="{
                      'outline-2 outline-role-outline rounded': activePreviewIndex === 0
                    }"
                  >
                    <span>{{ getMoreResultsDetailsTextForProvider(provider) }}</span>
                  </router-link>
                </span>
              </li>
              <li
                v-for="providerSearchResultValue in getSearchResultForProvider(provider).values"
                :key="providerSearchResultValue.id"
                :data-search-id="providerSearchResultValue.id"
                :class="{
                  'active bg-role-secondary-container': isPreviewElementActive(
                    providerSearchResultValue.id
                  )
                }"
                class="preview flex items-center py-1 px-2 text-sm min-h-10 [&.disabled]:opacity-70 [&.disabled]:grayscale-60 [&.disabled]:pointer-events-none hover:bg-role-surface-container"
              >
                <component
                  :is="provider.previewSearch.component"
                  class="preview-component"
                  :provider="provider"
                  :search-result="providerSearchResultValue"
                  :term="term"
                />
              </li>
            </oc-list>
          </li>
        </template>
      </oc-list>
    </oc-drop>
  </div>
  <div v-else><!-- no search provider available --></div>
</template>

<script setup lang="ts">
import {
  Key,
  Modifier,
  SearchProvider,
  SearchResult,
  createLocationCommon,
  isLocationCommonActive,
  isLocationSpacesActive,
  queryItemAsString,
  useAuthStore,
  useCapabilityStore,
  useIsAppActive,
  useKeyboardActions,
  useResourcesStore
} from '@opencloud-eu/web-pkg'
import { storeToRefs } from 'pinia'
import { debounce } from 'lodash-es'
import { useRouteQuery, useRouter } from '@opencloud-eu/web-pkg'
import { eventBus } from '@opencloud-eu/web-pkg'
import {
  ComponentPublicInstance,
  computed,
  ref,
  onBeforeUnmount,
  unref,
  useTemplateRef,
  watch,
  nextTick,
  onMounted
} from 'vue'
import { SearchLocationFilterConstants } from '@opencloud-eu/web-pkg'
import { SearchBarFilter } from '@opencloud-eu/web-pkg'
import { useAvailableProviders } from '../composables'
import { RouteLocationNormalizedLoaded } from 'vue-router'
import { OcDrop } from '@opencloud-eu/design-system/components'
import { useIsMobile } from '@opencloud-eu/design-system/composables'
import { useGettext } from 'vue3-gettext'

const router = useRouter()
const { $gettext, $ngettext } = useGettext()
const capabilityStore = useCapabilityStore()
const showCancelButton = ref(false)
const { isMobile } = useIsMobile()
const scopeQueryValue = useRouteQuery('scope')
const availableProviders = useAvailableProviders()
const isAppActive = useIsAppActive()

const authStore = useAuthStore()
const { userContextReady, publicLinkContextReady } = storeToRefs(authStore)

const resourcesStore = useResourcesStore()
const { currentFolder } = storeToRefs(resourcesStore)

const locationFilterId = ref(SearchLocationFilterConstants.allFiles)
const optionsDropRef = useTemplateRef<ComponentPublicInstance<typeof OcDrop>>('optionsDropRef')
const searchBarRef = useTemplateRef<HTMLElement>('searchBar')
const activePreviewIndex = ref<number | null>(null)
const term = ref('')
const restoreSearchFromRoute = ref(false)
const searchResults = ref<
  {
    providerId: string
    result: SearchResult
  }[]
>([])
const loading = ref(false)
const currentFolderAvailable = ref(false)

const fullTextSearchEnabled = computed(() => capabilityStore.searchContent?.enabled)

const listProviderAvailable = computed(() => unref(availableProviders).some((p) => !!p.listSearch))

const locationFilterAvailable = computed(() =>
  // FIXME: use capability as soon as we have one
  unref(availableProviders).some((p) => !!p.listSearch)
)

const currentFolderIsInVault = computed(() => !!unref(currentFolder)?.isInVault)

function updateLocationFilterInputPadding() {
  const inputElement = unref(searchBarRef)?.querySelector('.oc-search-input') as HTMLElement
  if (!inputElement) {
    return
  }

  if (!unref(locationFilterAvailable)) {
    inputElement.style.paddingRight = ''
    return
  }

  const locationFilterElement = unref(searchBarRef)?.querySelector(
    '#files-global-search-filter'
  ) as HTMLElement
  if (!locationFilterElement) {
    inputElement.style.paddingRight = ''
    return
  }

  if (locationFilterElement.offsetWidth <= 0) {
    inputElement.style.paddingRight = ''
    return
  }

  inputElement.style.paddingRight = `${Math.ceil(locationFilterElement.offsetWidth) + 32}px`
}

watch(isMobile, () => {
  const searchBarEl = document.getElementById('files-global-search-bar')
  if (!searchBarEl) {
    return
  }

  const optionDropVisible = !!document.querySelector('#files-global-search-options')

  if (!unref(isMobile)) {
    searchBarEl.style.visibility = 'visible'
    showCancelButton.value = false
  } else {
    if (optionDropVisible) {
      searchBarEl.style.visibility = 'visible'
      showCancelButton.value = true
    } else {
      searchBarEl.style.visibility = 'hidden'
      showCancelButton.value = false
    }
  }
})

const optionsDrop = computed(() => {
  return unref(optionsDropRef)
})

const scope = computed(() => {
  if (unref(currentFolderAvailable) && unref(currentFolder)?.fileId) {
    return unref(currentFolder).fileId
  }

  return queryItemAsString(unref(scopeQueryValue))
})

const useScope = computed(() => {
  return (
    unref(currentFolderAvailable) &&
    unref(locationFilterId) === SearchLocationFilterConstants.currentFolder
  )
})

async function search() {
  searchResults.value = []
  if (!unref(term)) {
    return
  }

  const terms: string[] = []

  let nameQuery = `name:"*${unref(term)}*"`
  if (unref(fullTextSearchEnabled)) {
    nameQuery = `(name:"*${unref(term)}*" OR content:"${unref(term)}")`
  }

  terms.push(nameQuery)

  if (unref(useScope)) {
    terms.push(`scope:${unref(scope)}`)
  }

  loading.value = true

  for (const availableProvider of unref(availableProviders)) {
    if (availableProvider.previewSearch?.available) {
      searchResults.value.push({
        providerId: availableProvider.id,
        result: await availableProvider.previewSearch.search(terms.join(' '))
      })
    }
  }
  loading.value = false
}

function onKeyUpEnter() {
  if (!unref(listProviderAvailable)) {
    return
  }

  if (isLocationCommonActive(router, 'files-common-search')) {
    debouncedSearch.cancel()
  }

  if (unref(optionsDrop)) {
    unref(optionsDrop)?.hide()
  }

  if (unref(activePreviewIndex) === null) {
    router.push(getSearchResultLocation('files.sdk'))
  }
  if (unref(activePreviewIndex) !== null) {
    const previewEls = getFocusableElements()
    const activeEL = previewEls?.[unref(activePreviewIndex)] as HTMLElement
    if (activeEL instanceof HTMLAnchorElement || activeEL instanceof HTMLButtonElement) {
      activeEL.click()
      return
    }

    const clickableEl = activeEL?.querySelector<HTMLAnchorElement>('button, a')
    if (clickableEl) {
      clickableEl.click()
    }
  }
}

function getSearchResultLocation(providerId: string) {
  const currentQuery = unref(router.currentRoute).query

  return createLocationCommon('files-common-search', {
    query: {
      ...(currentQuery && { ...currentQuery }),
      term: unref(term),
      ...(unref(scope) && { scope: unref(scope) }),
      useScope: unref(useScope).toString(),
      provider: providerId
    }
  })
}

async function onLocationFilterChange(event: { value: { id: string } }) {
  locationFilterId.value = event.value.id
  if (isLocationCommonActive(router, 'files-common-search')) {
    onKeyUpEnter()
    return
  }

  if (!unref(term)) {
    return
  }

  await nextTick()
  updateLocationFilterInputPadding()
  search()
}

async function showPreview() {
  if (!unref(term)) {
    return
  }
  unref(optionsDrop)?.show({ noFocus: true })
  await search()
}

function updateTerm(input: string) {
  restoreSearchFromRoute.value = false
  term.value = input
  if (!unref(term)) {
    return unref(optionsDrop)?.hide()
  }
  return unref(optionsDrop)?.show({ noFocus: true })
}

const debouncedSearch = debounce(search, 500)

watch(term, () => {
  if (unref(restoreSearchFromRoute)) {
    restoreSearchFromRoute.value = false
    return
  }
  debouncedSearch()
})

const showDrop = computed(() => {
  return unref(availableProviders).some((provider) => provider?.previewSearch?.available === true)
})

const clearTermEvent = eventBus.subscribe('app.search.term.clear', () => {
  updateTerm('')
})

const { bindKeyAction } = useKeyboardActions()

function onSearchShortcut() {
  const inputElement = unref(searchBarRef)?.querySelector('input') as HTMLElement
  inputElement?.focus()
}

bindKeyAction({ primary: Key.S }, onSearchShortcut)
bindKeyAction({ primary: Key.Slash }, onSearchShortcut)
bindKeyAction({ primary: Key.Slash, modifier: Modifier.Shift }, onSearchShortcut)

onMounted(() => {
  updateLocationFilterInputPadding()
})
onBeforeUnmount(() => {
  eventBus.unsubscribe('app.search.term.clear', clearTermEvent)
})

function getFocusableElements() {
  const elements = [document.querySelector('.more-results')]
  elements.push(...Array.from(document.querySelectorAll('li.preview')))
  return elements as HTMLElement[]
}

const showNoResults = computed(() => {
  return unref(searchResults).every(({ result }) => !result.values.length)
})

// We don't show the search provider in public link context,
// since we are not able to provide search in the public link yet.
// Enable as soon this feature is available.
const isSearchBarEnabled = computed(() => {
  return (
    unref(availableProviders).length &&
    unref(userContextReady) &&
    !unref(publicLinkContextReady) &&
    !unref(isAppActive)
  )
})

// Computed to filter and sort providers that will be displayed
// Only show providers which actually hold results
const displayProviders = computed(() => {
  return unref(availableProviders).filter(
    (provider) => getSearchResultForProvider(provider).values.length
  )
})

function onClear() {
  updateTerm('')
}

function findNextPreviewIndex(previous = false) {
  const elements = getFocusableElements()
  let index =
    activePreviewIndex.value !== null ? activePreviewIndex.value : previous ? elements.length : -1
  const increment = previous ? -1 : 1

  do {
    index += increment
    if (index < 0 || index > elements.length - 1) {
      return 0
    }
  } while (elements[index].classList.contains('disabled'))
  return index
}

function onKeyUpUp() {
  activePreviewIndex.value = findNextPreviewIndex(true)
}

function onKeyUpDown() {
  activePreviewIndex.value = findNextPreviewIndex(false)
}

function getSearchResultForProvider(provider: SearchProvider) {
  return unref(searchResults).find(({ providerId }) => providerId === provider.id)?.result
}

function parseRouteQuery(route: RouteLocationNormalizedLoaded, initialLoad = false) {
  const available =
    (isLocationSpacesActive(unref(router), 'files-spaces-generic') || !!unref(scopeQueryValue)) &&
    !isLocationSpacesActive(unref(router), 'files-spaces-projects')
  if (available !== unref(currentFolderAvailable)) {
    currentFolderAvailable.value = available
  }

  nextTick(() => {
    if (!unref(availableProviders).length) {
      return
    }
    const routeTerm = route?.query?.term
    if (!routeTerm) {
      return
    }
    restoreSearchFromRoute.value = initialLoad
    term.value = queryItemAsString(routeTerm)
  })
}

function getMoreResultsDetailsTextForProvider(provider: SearchProvider) {
  const searchResult = getSearchResultForProvider(provider)
  if (!searchResult || !searchResult.totalResults) {
    return $gettext('Show all results')
  }

  return $ngettext(
    'Show %{totalResults} result',
    'Show %{totalResults} results',
    searchResult.totalResults,
    {
      totalResults: searchResult.totalResults.toString()
    }
  )
}

function isPreviewElementActive(searchId: string) {
  const previewElements = getFocusableElements()
  const activeEl = previewElements?.[activePreviewIndex.value] as HTMLElement
  return activeEl?.dataset?.searchId === searchId
}

function showSearchBar() {
  document.getElementById('files-global-search-bar').style.visibility = 'visible'
  const inputElement = document.getElementsByClassName('oc-search-input')[0] as HTMLElement
  inputElement.focus()

  showCancelButton.value = true
}

function cancelSearch() {
  document.getElementById('files-global-search-bar').style.visibility = 'hidden'
  showCancelButton.value = false
}

function hideOptionsDrop() {
  unref(optionsDrop)?.hide()
}

parseRouteQuery(unref(router.currentRoute), true)

watch(
  () => unref(router.currentRoute),
  (newRoute) => {
    parseRouteQuery(newRoute)
  }
)

watch(
  () => unref(searchResults),
  () => {
    activePreviewIndex.value = null
  },
  { deep: true }
)
</script>
<style>
@reference '@opencloud-eu/design-system/tailwind';

@layer utilities {
  #files-global-search #files-global-search-bar input,
  #files-global-search #files-global-search-bar input:not(:placeholder-shown) {
    @apply z-[var(--z-index-modal)] sm:z-auto;
  }

  #files-global-search-options {
    max-height: calc(100vh - 60px);
  }
  #files-global-search .oc-search-input {
    @apply inline sm:block transition-none bg-role-surface;
  }

  #files-global-search-options .preview-component button,
  #files-global-search-options .preview-component a {
    @apply p-0 w-auto gap-0;
  }
}
</style>
