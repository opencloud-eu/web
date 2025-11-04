<template>
  <div v-if="authStore.userContextReady" id="preferences-panel-app-tokens">
    <div class="flex items-center mb-4">
      <h1 class="m-0 text-lg" v-text="$gettext('App Tokens')" />
      <oc-button
        v-if="!authAppServiceDisabled"
        size="small"
        class="create-app-token-btn ml-4"
        @click="openCreateAppTokenModal"
      >
        <oc-icon name="add" size="small" />
        <span v-text="$gettext('New')" />
      </oc-button>
    </div>
    <p
      v-if="authAppServiceDisabled"
      class="ml-2"
      data-testid="auth-service-unavailable"
      v-text="
        $gettext(
          'App tokens are not available because the »auth-app« service is not running. Please contact an administrator.'
        )
      "
    />
    <p
      v-else-if="!appTokens.length"
      class="ml-2"
      data-testid="no-app-tokens-available"
      v-text="$gettext('No app tokens available.')"
    />
    <div v-else>
      <oc-table class="app-token-table" :data="visibleAppTokens" :fields="tableFields">
        <template #label="{ item }">
          <div class="w-full truncate">
            <span v-text="item.label || '-'" />
          </div>
        </template>
        <template #creationDate="{ item }">
          <div class="w-full truncate">
            <span v-text="formatDateFromISO(item.created_date, currentLanguage)" />
          </div>
        </template>
        <template #expirationDate="{ item }">
          <div class="w-full truncate">
            <span v-text="formatDateFromISO(item.expiration_date, currentLanguage)" />
          </div>
        </template>
        <template #actions="{ item }">
          <oc-button
            appearance="raw"
            no-hover
            gap-size="none"
            size="small"
            :aria-label="$gettext('Delete app token')"
            @click="openDeleteAppTokenModal(item)"
          >
            <oc-icon name="delete-bin-5" size="small" fill-type="line" />
            <span class="ml-1" v-text="$gettext('Delete')" />
          </oc-button>
        </template>
      </oc-table>
      <div v-if="appTokens.length > TOKENS_TO_DISPLAY" class="w-full flex justify-center mt-4">
        <oc-button appearance="raw" no-hover @click="listExpanded = !listExpanded">
          <span v-text="listExpanded ? $gettext('Show less') : $gettext('Show more')" />
          <oc-icon :name="'arrow-' + (listExpanded ? 'up' : 'down') + '-s'" fill-type="line" />
        </oc-button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { call } from '@opencloud-eu/web-client'
import {
  formatDateFromISO,
  useAuthStore,
  useClientService,
  useMessages,
  useModals
} from '@opencloud-eu/web-pkg'
import { computed, onMounted, onUnmounted, Ref, ref, unref } from 'vue'
import { useTask } from 'vue-concurrency'
import { useGettext } from 'vue3-gettext'
import AppTokenModal from '../Modals/AppTokenModal.vue'
import { AppToken, AppTokenListSchema } from '../../helpers/appTokens'
import { FieldType } from '@opencloud-eu/design-system/helpers'

const { $gettext, current: currentLanguage } = useGettext()
const { dispatchModal } = useModals()
const { showMessage, showErrorMessage } = useMessages()
const { httpAuthenticated: client } = useClientService()
const authStore = useAuthStore()

const appTokens: Ref<AppToken[]> = ref([])
const authAppServiceDisabled = ref<boolean | undefined>()
const listExpanded = ref(false)

const TOKENS_TO_DISPLAY = 5

const loadTokensTask = useTask(function* (signal) {
  try {
    const { data } = yield* call(client.get<AppToken[]>('/auth-app/tokens', { signal }))
    const tokens = AppTokenListSchema.parse(data)
    appTokens.value = tokens.sort((a, b) => b.created_date.localeCompare(a.created_date))
    authAppServiceDisabled.value = false
  } catch (error) {
    console.error(error)
    // FIXME: check the service availability beforehand when the server supports it
    authAppServiceDisabled.value = true
  }
}).restartable()

const deleteAppToken = async ({ token }: AppToken) => {
  try {
    await client.delete('/auth-app/tokens', { params: { token } })
    appTokens.value = unref(appTokens).filter((appToken) => appToken.token !== token)
    showMessage({ title: $gettext('The app token has been deleted.') })
  } catch (error) {
    console.error(error)
    showErrorMessage({
      title: $gettext('An error occurred while deleting the app token.'),
      errors: [error]
    })
  }
}

const openCreateAppTokenModal = () => {
  dispatchModal({
    title: $gettext('Create a new app token'),
    confirmText: $gettext('Create'),
    customComponent: AppTokenModal,
    hideActions: true,
    onConfirm: () => {
      // reload tokens after creating a new one
      loadTokensTask.perform()
    }
  })
}

const openDeleteAppTokenModal = (appToken: AppToken) => {
  dispatchModal({
    title: $gettext('Delete app token'),
    confirmText: $gettext('Delete'),
    message: $gettext('Are you sure you want to delete this app token?'),
    onConfirm: () => deleteAppToken(appToken)
  })
}

const visibleAppTokens = computed(() => {
  if (unref(listExpanded)) {
    return unref(appTokens)
  }
  return unref(appTokens).slice(0, TOKENS_TO_DISPLAY)
})

const tableFields = computed<FieldType[]>(() => {
  return [
    {
      name: 'label',
      type: 'slot',
      wrap: 'truncate',
      width: 'expand',
      title: $gettext('Note')
    },
    {
      name: 'creationDate',
      type: 'slot',
      wrap: 'truncate',
      title: $gettext('Created at')
    },
    {
      name: 'expirationDate',
      type: 'slot',
      wrap: 'truncate',
      title: $gettext('Expires at')
    },
    {
      name: 'actions',
      type: 'slot',
      width: 'shrink',
      title: $gettext('Actions')
    }
  ]
})

onMounted(() => {
  loadTokensTask.perform()
})

onUnmounted(() => {
  if (loadTokensTask.isRunning) {
    loadTokensTask.cancelAll()
  }
})
</script>

<style scoped>
@reference '@opencloud-eu/design-system/tailwind';

@layer utilities {
  .app-token-table td:nth-of-type(1),
  .app-token-table td:nth-of-type(4) {
    width: 30%;
  }

  .app-token-table td:nth-of-type(2),
  .app-token-table td:nth-of-type(3) {
    width: 20%;
  }
}
</style>
