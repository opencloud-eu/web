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
      :model-value="term"
      :label="searchLabel"
      :type-ahead="true"
      :placeholder="searchLabel"
      :button-hidden="true"
      :show-cancel-button="showCancelButton"
      :show-advanced-search-button="listProviderAvailable"
      cancel-button-appearance="raw-inverse"
      :cancel-handler="cancelSearch"
      small
      class="mx-auto sm:mx-0 bg-role-chrome sm:bg-transparent w-[95vw] sm:w-2xs md:w-lg h-12 absolute inset-0 sm:relative invisible sm:visible z-90 sm:z-auto"
      @advanced-search="onKeyUpEnter"
      @update:model-value="updateTerm"
      @clear="onClear"
      @click="showPreview"
      @keyup.esc="hideOptionsDrop"
      @keyup.up="onKeyUpUp"
      @keyup.down="onKeyUpDown"
      @keyup.enter="onKeyUpEnter"
    >
      <template #locationFilter>
        <search-bar-filter
          v-if="locationFilterAvailable"
          id="files-global-search-filter"
          :current-folder-available="currentFolderAvailable"
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
      id="files-global-search-options"
      ref="optionsDropRef"
      mode="manual"
      target="#files-global-search-bar"
      class="w-[93vw] sm:w-2xs md:w-lg overflow-y-auto"
      padding-size="remove"
      close-on-click
      enforce-drop-on-mobile
    >
      <oc-list class="oc-list-divider">
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
            <oc-list>
              <li
                class="truncate flex justify-between text-role-on-surface-variant provider-details py-1 px-2 text-xs"
              >
                <span class="display-name" v-text="$gettext(provider.displayName)" />
                <span v-if="!!provider.listSearch">
                  <router-link class="more-results p-0" :to="getSearchResultLocation(provider.id)">
                    <span>{{ getMoreResultsDetailsTextForProvider(provider) }}</span>
                  </router-link>
                </span>
              </li>
              <li
                v-for="providerSearchResultValue in getSearchResultForProvider(provider).values"
                :key="providerSearchResultValue.id"
                :data-search-id="providerSearchResultValue.id"
                :class="{
                  'active bg-role-surface-container': isPreviewElementActive(
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

<script lang="ts">
import {
  SearchProvider,
  createLocationCommon,
  isLocationCommonActive,
  isLocationSpacesActive,
  queryItemAsString,
  useAuthStore,
  useCapabilityStore,
  useResourcesStore
} from '@opencloud-eu/web-pkg'
import Mark from 'mark.js'
import { storeToRefs } from 'pinia'
import { debounce } from 'lodash-es'
import { useRouteQuery, useRouter } from '@opencloud-eu/web-pkg'
import { eventBus } from '@opencloud-eu/web-pkg'
import { computed, defineComponent, inject, Ref, ref, unref, watch } from 'vue'
import { SearchLocationFilterConstants } from '@opencloud-eu/web-pkg'
import { SearchBarFilter } from '@opencloud-eu/web-pkg'
import { useAvailableProviders } from '../composables'
import { RouteLocationNormalizedLoaded } from 'vue-router'
import { OcDrop } from '@opencloud-eu/design-system/components'

export default defineComponent({
  name: 'SearchBar',
  components: { SearchBarFilter },
  setup() {
    const router = useRouter()
    const capabilityStore = useCapabilityStore()
    const showCancelButton = ref(false)
    const isMobileWidth = inject<Ref<boolean>>('isMobileWidth')
    const scopeQueryValue = useRouteQuery('scope')
    const availableProviders = useAvailableProviders()

    const authStore = useAuthStore()
    const { userContextReady, publicLinkContextReady } = storeToRefs(authStore)

    const resourcesStore = useResourcesStore()
    const { currentFolder } = storeToRefs(resourcesStore)

    const locationFilterId = ref(SearchLocationFilterConstants.allFiles)
    const optionsDropRef = ref<typeof OcDrop>(null)
    const activePreviewIndex = ref(null)
    const term = ref('')
    const restoreSearchFromRoute = ref(false)
    const searchResults = ref([])
    const loading = ref(false)
    const currentFolderAvailable = ref(false)
    const markInstance = ref<Mark>()

    const fullTextSearchEnabled = computed(() => capabilityStore.searchContent?.enabled)

    const listProviderAvailable = computed(() =>
      unref(availableProviders).some((p) => !!p.listSearch)
    )

    const locationFilterAvailable = computed(() =>
      // FIXME: use capability as soon as we have one
      unref(availableProviders).some((p) => !!p.listSearch)
    )

    watch(isMobileWidth, () => {
      const searchBarEl = document.getElementById('files-global-search-bar')
      if (!searchBarEl) {
        return
      }

      const optionDropVisible = !!document.querySelector('.tippy-box[data-state="visible"]')

      if (!unref(isMobileWidth)) {
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

    const search = async () => {
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

    const onKeyUpEnter = () => {
      if (!unref(listProviderAvailable)) {
        return
      }

      if (unref(optionsDrop)) {
        unref(optionsDrop)?.hide()
      }

      if (unref(activePreviewIndex) === null) {
        router.push(getSearchResultLocation('files.sdk'))
      }
      if (unref(activePreviewIndex) !== null) {
        unref(optionsDrop)
          ?.$el.querySelectorAll('.preview')
          [unref(activePreviewIndex)].firstChild.click()
      }
    }

    const getSearchResultLocation = (providerId: string) => {
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

    const onLocationFilterChange = (event: { value: { id: string } }) => {
      locationFilterId.value = event.value.id
      if (isLocationCommonActive(router, 'files-common-search')) {
        onKeyUpEnter()
        return
      }

      if (!unref(term)) {
        return
      }
      search()
    }

    const showPreview = async () => {
      if (!unref(term)) {
        return
      }
      unref(optionsDrop)?.show()
      await search()
    }

    const updateTerm = (input: string) => {
      restoreSearchFromRoute.value = false
      term.value = input
      if (!unref(term)) {
        return unref(optionsDrop)?.hide()
      }
      return unref(optionsDrop)?.show()
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
      return unref(availableProviders).some(
        (provider) => provider?.previewSearch?.available === true
      )
    })

    return {
      userContextReady,
      publicLinkContextReady,
      showCancelButton,
      onLocationFilterChange,
      currentFolderAvailable,
      listProviderAvailable,
      locationFilterAvailable,
      scopeQueryValue,
      optionsDrop,
      optionsDropRef,
      activePreviewIndex,
      term,
      restoreSearchFromRoute,
      onKeyUpEnter,
      searchResults,
      loading,
      availableProviders,
      markInstance,
      search,
      showPreview,
      updateTerm,
      getSearchResultLocation,
      showDrop
    }
  },

  data() {
    return {
      activeProvider: undefined,
      optionsVisible: false,
      clearTermEvent: null
    }
  },
  computed: {
    showNoResults() {
      return this.searchResults.every(({ result }) => !result.values.length)
    },

    isSearchBarEnabled() {
      /**
       * We don't show the search provider in public link context,
       * since we are not able to provide search in the public link yet.
       * Enable as soon this feature is available.
       */
      return this.availableProviders.length && this.userContextReady && !this.publicLinkContextReady
    },
    displayProviders() {
      /**
       * Computed to filter and sort providers that will be displayed
       * Only show providers which actually hold results
       */
      return this.availableProviders.filter(
        (provider) => this.getSearchResultForProvider(provider).values.length
      )
    },
    searchLabel() {
      return this.$gettext('Enter search term')
    }
  },

  watch: {
    searchResults: {
      handler() {
        this.activePreviewIndex = null

        this.$nextTick(() => {
          if (this.showNoResults) {
            return
          }
          if (this.optionsDrop) {
            this.markInstance = new Mark(this.optionsDrop.$refs.drop as HTMLElement)
            this.markInstance.unmark()
            this.markInstance.mark(this.term, {
              element: 'span',
              className: 'mark-highlight',
              exclude: ['.provider-details *']
            })
          }
        })
      },
      deep: true
    },
    $route: {
      handler(r) {
        this.parseRouteQuery(r)
      },
      immediate: false
    }
  },
  created() {
    this.clearTermEvent = eventBus.subscribe('app.search.term.clear', () => {
      this.term = ''
    })
    this.parseRouteQuery(this.$route, true)
  },

  beforeUnmount() {
    eventBus.unsubscribe('app.search.term.clear', this.clearTermEvent)
  },

  methods: {
    onClear() {
      this.term = ''
      this.optionsDrop.hide()
    },
    findNextPreviewIndex(previous = false) {
      const elements = Array.from(document.querySelectorAll('li.preview'))
      let index =
        this.activePreviewIndex !== null ? this.activePreviewIndex : previous ? elements.length : -1
      const increment = previous ? -1 : 1

      do {
        index += increment
        if (index < 0 || index > elements.length - 1) {
          return null
        }
      } while (elements[index].classList.contains('disabled'))

      return index
    },
    onKeyUpUp() {
      this.activePreviewIndex = this.findNextPreviewIndex(true)
      this.scrollToActivePreviewOption()
    },
    onKeyUpDown() {
      this.activePreviewIndex = this.findNextPreviewIndex(false)
      this.scrollToActivePreviewOption()
    },
    scrollToActivePreviewOption() {
      if (typeof this.optionsDrop.$el.scrollTo !== 'function') {
        return
      }

      const previewElements = this.optionsDrop.$el.querySelectorAll('.preview')

      this.optionsDrop.$el.scrollTo(
        0,
        this.activePreviewIndex === null
          ? 0
          : previewElements[this.activePreviewIndex].getBoundingClientRect().y -
              previewElements[this.activePreviewIndex].getBoundingClientRect().height
      )
    },

    getSearchResultForProvider(provider: SearchProvider) {
      return this.searchResults.find(({ providerId }) => providerId === provider.id)?.result
    },
    parseRouteQuery(route: RouteLocationNormalizedLoaded, initialLoad = false) {
      const currentFolderAvailable =
        (isLocationSpacesActive(this.$router, 'files-spaces-generic') || !!this.scopeQueryValue) &&
        !isLocationSpacesActive(this.$router, 'files-spaces-projects')
      if (this.currentFolderAvailable !== currentFolderAvailable) {
        this.currentFolderAvailable = currentFolderAvailable
      }

      this.$nextTick(() => {
        if (!this.availableProviders.length) {
          return
        }
        const routeTerm = route?.query?.term
        const input = this.$el.getElementsByTagName('input')[0]
        if (!input || !routeTerm) {
          return
        }
        this.restoreSearchFromRoute = initialLoad
        this.term = queryItemAsString(routeTerm)
        input.value = queryItemAsString(routeTerm)
      })
    },
    getMoreResultsDetailsTextForProvider(provider: SearchProvider) {
      const searchResult = this.getSearchResultForProvider(provider)
      if (!searchResult || !searchResult.totalResults) {
        return this.$gettext('Show all results')
      }

      return this.$ngettext(
        'Show %{totalResults} result',
        'Show %{totalResults} results',
        searchResult.totalResults,
        {
          totalResults: searchResult.totalResults
        }
      )
    },
    isPreviewElementActive(searchId: string) {
      const previewElements = this.optionsDrop.$el.querySelectorAll('.preview')
      return previewElements[this.activePreviewIndex]?.dataset?.searchId === searchId
    },
    showSearchBar() {
      document.getElementById('files-global-search-bar').style.visibility = 'visible'
      const inputElement = document.getElementsByClassName('oc-search-input')[0] as HTMLElement
      inputElement.focus()

      this.showCancelButton = true
    },
    cancelSearch() {
      document.getElementById('files-global-search-bar').style.visibility = 'hidden'
      this.showCancelButton = false
    },
    hideOptionsDrop() {
      this.optionsDrop?.hide()
    }
  }
})
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
