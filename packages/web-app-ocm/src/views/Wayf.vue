<template>
  <main id="wayf" class="flex flex-col h-screen overflow-auto bg-role-surface-container">
    <div class="w-full h-full flex flex-col">
      <div class="flex flex-col flex-1 min-h-0">
        <!-- Header Section -->
        <div class="flex items-center px-4 py-2 border-b shrink-0 min-h-[60px]">
          <oc-icon name="cloud" size="large" class="mr-2" />
          <h1 class="px-2 text-2xl font-semibold m-0" v-text="$gettext('Where Are You From?')" />
          <oc-contextual-helper class="pl-1" v-bind="helperContent" />
        </div>

        <!-- No Token State -->
        <no-content-message
          v-if="!hasToken"
          id="wayf-no-token"
          icon="cloud"
          class="text-center p-8"
        >
          <template #message>
            <span v-text="$gettext('Token Required')" />
          </template>
          <template #callToAction>
            <span
              class="text-muted"
              v-text="$gettext('You need a token for this feature to work.')"
            />
          </template>
        </no-content-message>

        <!-- Loading State -->
        <div v-else-if="loading" class="text-center p-8">
          <app-loading-spinner />
          <p class="mt-2" v-text="$gettext('Loading providers...')" />
        </div>

        <!-- Error State -->
        <no-content-message v-else-if="error" id="wayf-error" icon="alert-circle">
          <template #message>
            <span v-text="$gettext('Failed to load providers')" />
          </template>
          <template #callToAction>
            <oc-button
              appearance="filled"
              variation="primary"
              class="px-4 py-4"
              @click="loadFederations"
            >
              <span v-text="$gettext('Retry')" />
            </oc-button>
          </template>
        </no-content-message>

        <!-- Main Content -->
        <div v-else class="flex-1 grid grid-rows-[auto_1fr_auto] min-h-0">
          <!-- Search Section -->
          <div class="px-4 pb-2 border-b shrink-0 overflow-hidden min-h-[80px]">
            <oc-text-input
              id="wayf-search"
              v-model="query"
              :label="$gettext('Search providers')"
              type="text"
              name="search"
              class="mb-2"
            >
              <template #icon>
                <oc-icon name="magnify" size="medium" />
              </template>
            </oc-text-input>
          </div>

          <!-- Empty State (no federations or no matches) -->
          <div
            v-if="totalFilteredCount === 0"
            class="flex items-center justify-center min-h-[300px] flex-1"
          >
            <no-content-message id="wayf-empty" class="mx-4 my-4" icon="magnify">
              <template #message>
                <span v-text="$gettext('No providers match your search')" />
              </template>
              <template #callToAction>
                <span
                  class="text-muted"
                  v-text="$gettext('Try a different search or enter a domain manually below.')"
                />
              </template>
            </no-content-message>
          </div>

          <!-- Federation Sections -->
          <div
            v-else
            class="overflow-y-auto overflow-x-hidden min-h-[200px] p-2 grid gap-2 content-start"
            :class="{
              'grid-cols-1': totalFilteredCount > 0,
              'md:grid-cols-1': totalFilteredCount > 0,
              'lg:grid-cols-[repeat(auto-fill,minmax(280px,1fr))]': totalFilteredCount > 0
            }"
          >
            <div
              v-for="[federation, providers] in sortedFederationEntries"
              :key="federation"
              class="border rounded-xl overflow-hidden flex flex-col max-h-[280px] h-[280px]"
            >
              <div
                class="flex items-center px-4 py-2 bg-role-surface-container-highest border-b min-h-[42px]"
              >
                <oc-icon name="shield-check" size="small" class="mr-2" />
                <h2 class="text-lg font-semibold m-0 truncate flex-1" :title="federation">
                  {{ federation }}
                </h2>
                <span
                  class="ml-2 text-xs font-medium bg-role-surface-container px-2 py-0.5 rounded-xl whitespace-nowrap shrink-0"
                >
                  {{ providers.length }}
                  {{ providers.length === 1 ? $gettext('provider') : $gettext('providers') }}
                </span>
              </div>
              <div class="overflow-y-auto flex-1 min-h-0">
                <oc-button
                  v-for="p in providers"
                  :key="p.fqdn"
                  appearance="raw"
                  class="w-full px-2 py-2 border-b last:border-b-0 text-left transition-colors hover:bg-role-surface-container-highest"
                  :disabled="loading"
                  :aria-label="$gettext('Select provider %{name}', { name: p.name })"
                  @click="navigateToProvider(p, token, providerDomain)"
                >
                  <div class="flex items-center justify-center">
                    <div class="flex flex-col flex-1 text-center">
                      <div class="font-semibold mb-0.5 text-base">{{ p.name }}</div>
                      <div class="text-sm text-muted font-mono">{{ p.fqdn }}</div>
                    </div>
                  </div>
                </oc-button>
              </div>
            </div>
          </div>

          <!-- Manual Provider Section -->
          <div
            class="px-4 pt-4 border-t overflow-y-auto overflow-x-hidden min-h-[235px] max-h-[350px] flex flex-col"
            style="
              box-shadow: 0 -2px 6px rgba(0, 0, 0, 0.04);
              background-color: var(--oc-role-surface-container-highest);
            "
          >
            <div class="flex items-center mb-2">
              <oc-icon name="cloud" size="medium" class="mr-2" />
              <h3 class="text-base font-semibold m-0" v-text="$gettext('Manual Provider Entry')" />
            </div>
            <oc-text-input
              id="wayf-manual"
              v-model="manualProvider"
              :label="$gettext('Enter provider domain manually')"
              type="text"
              name="manual"
              class="mb-2"
              @keyup.enter="goToManualProvider"
            >
              <template #icon>
                <oc-icon name="cloud" size="medium" />
              </template>
            </oc-text-input>
            <oc-button
              appearance="filled"
              variation="primary"
              class="mt-2 px-4 py-4 min-w-[120px]"
              :disabled="!manualProvider.trim() || loading"
              @click="goToManualProvider"
            >
              <span v-text="$gettext('Continue')" />
            </oc-button>
          </div>
        </div>
      </div>
    </div>
  </main>
</template>

<script lang="ts">
import { ref, computed, onMounted, defineComponent } from 'vue'
import { useRoute } from 'vue-router'
import { useGettext } from 'vue3-gettext'
import { NoContentMessage, AppLoadingSpinner } from '@opencloud-eu/web-pkg'
import { useWayf } from '../composables/useWayf'
import type { WayfProvider } from '../types/wayf'

export default defineComponent({
  components: {
    NoContentMessage,
    AppLoadingSpinner
  },
  setup() {
    const route = useRoute()
    const { $gettext } = useGettext()

    const token = computed(() => (route.query.token as string) || '')
    const hasToken = computed(() => token.value.trim().length > 0)

    // providerDomain is always domain, the domain where this WAYF page is hosted
    const providerDomain = computed(() => {
      return window.location.hostname
    })

    const query = ref('')
    const manualProvider = ref('')

    const {
      loading,
      error,
      federations,
      navigateToProvider,
      navigateToManualProvider,
      loadFederations,
      filterProviders
    } = useWayf()

    const helperContent = computed(() => {
      return {
        text: $gettext(
          'Select your cloud provider to continue with the invitation process. You can search for providers or enter a domain manually.'
        ),
        title: $gettext('Where Are You From?')
      }
    })

    const filteredFederations = computed<Record<string, WayfProvider[]>>(() => {
      const result: Record<string, WayfProvider[]> = {}
      const currentFederations = federations.value || {}
      Object.entries(currentFederations).forEach(([name, providers]) => {
        const filtered = filterProviders(providers as WayfProvider[], query.value)
        if (filtered.length > 0) {
          result[name] = filtered
        }
      })
      return result
    })

    const totalFilteredCount = computed(() => {
      return Object.values(filteredFederations.value).reduce((sum, arr) => sum + arr.length, 0)
    })

    const sortedFederationEntries = computed(() => {
      return Object.entries(filteredFederations.value).sort(([a], [b]) => a.localeCompare(b))
    })

    const goToManualProvider = async () => {
      await navigateToManualProvider(manualProvider.value, token.value, providerDomain.value)
    }

    onMounted(() => {
      loadFederations()
    })

    return {
      token,
      hasToken,
      providerDomain,
      query,
      manualProvider,
      loading,
      error,
      federations,
      helperContent,
      filteredFederations,
      totalFilteredCount,
      sortedFederationEntries,
      navigateToProvider,
      loadFederations,
      goToManualProvider
    }
  }
})
</script>

<style lang="scss" scoped>
@media (max-width: 960px) {
  #wayf .grid {
    grid-template-columns: 1fr !important;
  }
}

@media (max-height: 600px) {
  #wayf .min-h-\[200px\] {
    min-height: 120px;
  }

  #wayf .max-h-\[280px\] {
    max-height: 200px;
  }

  #wayf .h-\[280px\] {
    height: 200px;
  }

  #wayf .min-h-\[220px\] {
    min-height: 200px;
  }

  #wayf .max-h-\[330px\] {
    max-height: 250px;
  }
}
</style>
