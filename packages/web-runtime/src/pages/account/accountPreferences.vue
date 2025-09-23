<template>
  <div id="account-preferences">
    <h1 class="mt-0" v-text="$gettext('Preferences')" />
    <app-loading-spinner v-if="isLoading" />
    <template v-else>
      <account-table
        :fields="[
          $gettext('Preference name'),
          $gettext('Preference description'),
          $gettext('Preference value')
        ]"
        class="account-page-preferences"
      >
        <oc-table-tr class="account-page-info-language">
          <oc-table-td>{{ $gettext('Language') }}</oc-table-td>
          <oc-table-td>
            <div class="flex">
              <span v-text="$gettext('Select your language.')" />
              <a href="https://explore.transifex.com/opencloud-eu/opencloud-eu/" target="_blank">
                <div class="flex ml-1 items-center">
                  <span v-text="$gettext('Help to translate')" />
                  <oc-icon class="ml-1" size="small" fill-type="line" name="service" />
                </div>
              </a>
            </div>
          </oc-table-td>
          <oc-table-td data-testid="language">
            <oc-select
              v-if="languageOptions"
              :model-value="selectedLanguageValue"
              :label="$gettext('Language')"
              :label-hidden="true"
              :clearable="false"
              :searchable="true"
              :options="languageOptions"
              @update:model-value="updateSelectedLanguage"
            />
          </oc-table-td>
        </oc-table-tr>
        <oc-table-tr v-if="showChangePassword">
          <oc-table-td>{{ $gettext('Password') }}</oc-table-td>
          <oc-table-td><span v-text="'**********'" /></oc-table-td>
          <oc-table-td data-testid="password">
            <oc-button
              appearance="raw"
              data-testid="account-page-edit-password-btn"
              no-hover
              @click="showEditPasswordModal"
            >
              <span v-text="$gettext('Change password')" />
            </oc-button>
          </oc-table-td>
        </oc-table-tr>
        <oc-table-tr class="account-page-info-theme">
          <oc-table-td>{{ $gettext('Theme') }}</oc-table-td>
          <oc-table-td><span v-text="$gettext('Select your favorite theme')" /></oc-table-td>
          <oc-table-td data-testid="theme">
            <theme-switcher />
          </oc-table-td>
        </oc-table-tr>
        <oc-table-tr v-if="showNotifications && !canConfigureSpecificNotifications">
          <oc-table-td>{{ $gettext('Notifications') }}</oc-table-td>
          <oc-table-td v-if="!isMobileWidth">
            <span v-text="$gettext('Receive notification mails')" />
          </oc-table-td>
          <oc-table-td data-testid="notification-mails">
            <oc-checkbox
              :model-value="disableEmailNotificationsValue"
              size="large"
              :label="$gettext('Receive notification mails')"
              :label-hidden="!isMobileWidth"
              data-testid="account-page-notification-mails-checkbox"
              @update:model-value="updateDisableEmailNotifications"
            />
          </oc-table-td>
        </oc-table-tr>
        <oc-table-tr v-if="showWebDavDetails" class="account-page-view-options">
          <oc-table-td>{{ $gettext('View options') }}</oc-table-td>
          <oc-table-td v-if="!isMobileWidth">
            <span v-text="$gettext('Show WebDAV information in details view')" />
          </oc-table-td>
          <oc-table-td data-testid="view-options">
            <oc-checkbox
              :model-value="viewOptionWebDavDetailsValue"
              size="large"
              :label="$gettext('Show WebDAV information in details view')"
              :label-hidden="!isMobileWidth"
              data-testid="account-page-webdav-details-checkbox"
              @update:model-value="updateViewOptionsWebDavDetails"
            />
          </oc-table-td>
        </oc-table-tr>
      </account-table>
      <template v-if="showNotifications && canConfigureSpecificNotifications">
        <h2 class="mt-8" v-text="$gettext('Notifications')" />
        <p
          class="text-sm mt-0 mb-4"
          v-text="
            $gettext('Personalise your notification preferences about any file, folder, or Space.')
          "
        />
        <account-table :fields="notificationsSettingsFields" :show-head="!isMobileWidth">
          <oc-table-tr v-for="option in notificationsOptions" :key="option.id">
            <oc-table-td>{{ option.displayName }}</oc-table-td>
            <oc-table-td>{{ option.description }}</oc-table-td>

            <template v-if="option.multiChoiceCollectionValue">
              <oc-table-td
                v-for="choice in option.multiChoiceCollectionValue.options"
                :key="choice.key"
              >
                <span class="checkbox-cell-wrapper">
                  <oc-checkbox
                    :model-value="notificationsValues[option.id][choice.key]"
                    size="large"
                    :label="choice.displayValue"
                    :label-hidden="!isMobileWidth"
                    :disabled="choice.attribute === 'disabled'"
                    @update:model-value="
                      (value) => updateMultiChoiceSettingsValue(option.name, choice.key, value)
                    "
                  />
                </span>
              </oc-table-td>
            </template>
          </oc-table-tr>
        </account-table>
        <h2 class="mt-8" v-text="$gettext('Mail notification options')" />
        <account-table :fields="emailNotificationsOptionsFields" :show-head="!isMobileWidth">
          <oc-table-tr v-for="option in emailNotificationsOptions" :key="option.id">
            <oc-table-td>{{ option.displayName }}</oc-table-td>
            <oc-table-td>{{ option.description }}</oc-table-td>

            <oc-table-td v-if="option.singleChoiceValue">
              <oc-select
                :label="$gettext('Mail notification options')"
                :model-value="emailNotificationsValues[option.id]"
                :options="option.singleChoiceValue.options"
                :clearable="false"
                option-label="displayValue"
                @update:model-value="(value) => updateSingleChoiceValue(option.name, value)"
              />
            </oc-table-td>
          </oc-table-tr>
        </account-table>
      </template>
    </template>
  </div>
</template>
<script setup lang="ts">
import { useGettext } from 'vue3-gettext'
import {
  AppLoadingSpinner,
  useAppsStore,
  useAuthStore,
  useCapabilityStore,
  useClientService,
  useConfigStore,
  useMessages,
  useModals,
  useResourcesStore,
  useSpacesStore
} from '@opencloud-eu/web-pkg'
import ThemeSwitcher from '../../components/Account/ThemeSwitcher.vue'
import AccountTable from '../../components/Account/AccountTable.vue'
import EditPasswordModal from '../../components/EditPasswordModal.vue'
import { computed, onBeforeUnmount, onMounted, ref, unref } from 'vue'
import { LanguageOption, SettingsBundle, SettingsValue } from '../../helpers/settings'
import { loadAppTranslations, setCurrentLanguage } from '../../helpers/language'
import { User } from '@opencloud-eu/web-client/graph/generated'
import { SSEAdapter } from '@opencloud-eu/web-client/sse'
import { supportedLanguages } from '../../defaults'
import { useTask } from 'vue-concurrency'
import { call } from '@opencloud-eu/web-client'
import { useNotificationsSettings } from '../../composables/notificationsSettings'
import { captureException } from '@sentry/vue'

const MOBILE_BREAKPOINT = 800

const { showMessage, showErrorMessage } = useMessages()
const language = useGettext()
const { $gettext } = useGettext()
const clientService = useClientService()
const resourcesStore = useResourcesStore()
const appsStore = useAppsStore()
const authStore = useAuthStore()
const { dispatchModal } = useModals()
const spacesStore = useSpacesStore()
const capabilityStore = useCapabilityStore()
const configStore = useConfigStore()

const isMobileWidth = ref<boolean>(window.innerWidth < MOBILE_BREAKPOINT)
const disableEmailNotificationsValue = ref<boolean>()
const viewOptionWebDavDetailsValue = ref<boolean>(resourcesStore.areWebDavDetailsShown)
const selectedLanguageValue = ref<LanguageOption>()
const valuesList = ref<SettingsValue[]>()
const graphUser = ref<User>()
const accountBundle = ref<SettingsBundle>()

const {
  options: notificationsOptions,
  emailOptions: emailNotificationsOptions,
  values: notificationsValues,
  emailValues: emailNotificationsValues
} = useNotificationsSettings(valuesList, accountBundle)

const languageOptions = Object.keys(supportedLanguages).map((langCode) => ({
  label: supportedLanguages[langCode as keyof typeof supportedLanguages],
  value: langCode
}))

const isLoading = computed(() => {
  return (
    loadValuesListTask.isRunning ||
    !loadValuesListTask.last ||
    loadAccountBundleTask.isRunning ||
    !loadAccountBundleTask.last ||
    loadGraphUserTask.isRunning ||
    !loadGraphUserTask.last
  )
})
const isSettingsServiceSupported = computed(() => !configStore.options.runningOnEos)
const showNotifications = computed(
  () => authStore.userContextReady && unref(isSettingsServiceSupported)
)
const showChangePassword = computed(() => {
  return authStore.userContextReady && !capabilityStore.graphUsersChangeSelfPasswordDisabled
})
const showWebDavDetails = computed(() => authStore.userContextReady)
const canConfigureSpecificNotifications = computed(
  () => capabilityStore.capabilities.notifications.configurable
)
const notificationsSettingsFields = computed(() => [
  { label: $gettext('Event') },
  { label: $gettext('Event description'), hidden: true },
  { label: $gettext('In-App'), alignH: 'right' as const },
  { label: $gettext('Mail'), alignH: 'right' as const }
])

const emailNotificationsOptionsFields = computed(() => [
  { label: $gettext('Options') },
  { label: $gettext('Option description'), hidden: true },
  { label: $gettext('Option value'), hidden: true }
])

const onResize = () => {
  isMobileWidth.value = window.innerWidth < MOBILE_BREAKPOINT
}

const showEditPasswordModal = () => {
  dispatchModal({
    title: $gettext('Change password'),
    customComponent: EditPasswordModal
  })
}

const loadValuesListTask = useTask(function* (signal) {
  if (!authStore.userContextReady || !unref(isSettingsServiceSupported)) {
    return
  }

  try {
    const {
      data: { values }
    } = yield* call(
      clientService.httpAuthenticated.post<{ values: SettingsValue[] }>(
        '/api/v0/settings/values-list',
        { account_uuid: 'me' },
        { signal }
      )
    )
    valuesList.value = values || []
  } catch (e) {
    console.error(e)
    showErrorMessage({
      title: $gettext('Unable to load account data…'),
      errors: [e]
    })
    valuesList.value = []
  }
}).restartable()

const loadAccountBundleTask = useTask(function* (signal) {
  if (!authStore.userContextReady || !unref(isSettingsServiceSupported)) {
    return
  }

  try {
    const {
      data: { bundles }
    } = yield* call(
      clientService.httpAuthenticated.post<{ bundles: SettingsBundle[] }>(
        '/api/v0/settings/bundles-list',
        {},
        { signal }
      )
    )
    accountBundle.value = bundles?.find((b) => b.extension === 'opencloud-accounts')
  } catch (e) {
    console.error(e)
    showErrorMessage({
      title: $gettext('Unable to load account data…'),
      errors: [e]
    })
    accountBundle.value = undefined
  }
}).restartable()

const loadGraphUserTask = useTask(function* (signal) {
  if (!authStore.userContextReady) {
    return
  }

  try {
    graphUser.value = yield* call(clientService.graphAuthenticated.users.getMe({}, { signal }))
  } catch (e) {
    console.error(e)
    showErrorMessage({
      title: $gettext('Unable to load account data…'),
      errors: [e]
    })
    graphUser.value = undefined
  }
}).restartable()

const updateSelectedLanguage = async (option: LanguageOption) => {
  try {
    loadAppTranslations({
      apps: appsStore.apps,
      gettext: language,
      lang: option.value
    })

    selectedLanguageValue.value = option
    setCurrentLanguage({
      language,
      languageSetting: option.value
    })

    if (authStore.userContextReady) {
      await clientService.graphAuthenticated.users.editMe({
        preferredLanguage: option.value
      } as User)

      if (capabilityStore.supportSSE) {
        ;(clientService.sseAuthenticated as SSEAdapter).updateLanguage(language.current)
      }

      if (spacesStore.personalSpace) {
        // update personal space name with new translation
        spacesStore.updateSpaceField({
          id: spacesStore.personalSpace.id,
          field: 'name',
          value: $gettext('Personal')
        })
      }
    }

    if (loadAccountBundleTask.isRunning) {
      loadAccountBundleTask.cancelAll()
    }

    loadAccountBundleTask.perform()
    showMessage({ title: $gettext('Preference saved.') })
  } catch (e) {
    console.error(e)
    showErrorMessage({
      title: $gettext('Unable to save preference…'),
      errors: [e]
    })
  }
}

const updateDisableEmailNotifications = async (option: boolean) => {
  try {
    await saveValue({
      identifier: 'disable-email-notifications',
      valueOptions: { boolValue: !option }
    })
    disableEmailNotificationsValue.value = option
    showMessage({ title: $gettext('Preference saved.') })
  } catch (e) {
    console.error(e)
    showErrorMessage({
      title: $gettext('Unable to save preference…'),
      errors: [e]
    })
  }
}

const updateViewOptionsWebDavDetails = (option: boolean) => {
  try {
    resourcesStore.setAreWebDavDetailsShown(option)
    viewOptionWebDavDetailsValue.value = option
    showMessage({ title: $gettext('Preference saved.') })
  } catch (e) {
    console.error(e)
    showErrorMessage({
      title: $gettext('Unable to save preference…'),
      errors: [e]
    })
  }
}

const saveValue = async ({
  identifier,
  valueOptions
}: {
  identifier: string
  valueOptions: Record<string, any>
}): Promise<SettingsValue> => {
  let valueId = unref(valuesList)?.find((cV) => cV.identifier.setting === identifier)?.value?.id

  const value = {
    bundleId: unref(accountBundle)?.id,
    settingId: unref(accountBundle)?.settings?.find((s) => s.name === identifier)?.id,
    resource: { type: 'TYPE_USER' },
    accountUuid: 'me',
    ...valueOptions,
    ...(valueId && { id: valueId })
  }

  try {
    const {
      data: { value: data }
    } = await clientService.httpAuthenticated.post<{ value: SettingsValue }>(
      '/api/v0/settings/values-save',
      {
        value: {
          accountUuid: 'me',
          ...value
        }
      }
    )

    // Not sure if we can remove the condition below so just assign this here to be 100% safe
    if (data.value.id) {
      valueId = data.value.id
    }

    /**
     * Edge case: we need to reload the values list to retrieve the valueId if not set,
     * otherwise the backend saves multiple entries
     */
    if (!valueId) {
      loadValuesListTask.perform()
    }

    return data
  } catch (e) {
    throw e
  }
}

const updateValueInValueList = (value: SettingsValue) => {
  const index = unref(valuesList).findIndex(
    (v) => v.identifier.setting === value.identifier.setting
  )

  if (index < 0) {
    valuesList.value.push(value)
    return
  }

  valuesList.value.splice(index, 1, value)
}

const updateMultiChoiceSettingsValue = async (
  identifier: string,
  key: string,
  value: boolean | string
) => {
  try {
    if (typeof value !== 'boolean') {
      const error = new TypeError(`Unsupported value type ${typeof value}`)

      console.error(error)
      captureException(error)

      return
    }

    const currentValue = unref(valuesList).find((v) => v.identifier.setting === identifier)

    const savedValue = await saveValue({
      identifier,
      valueOptions: {
        collectionValue: {
          values: [
            ...(currentValue?.value.collectionValue.values.filter((val) => val.key !== key) || []),
            { key, boolValue: value }
          ]
        }
      }
    })

    updateValueInValueList(savedValue)
    showMessage({ title: $gettext('Preference saved.') })
  } catch (error) {
    captureException(error)
    console.error(error)
    showErrorMessage({
      title: $gettext('Unable to save preference…'),
      errors: [error]
    })
  }
}

const updateSingleChoiceValue = async (
  identifier: string,
  value: { displayValue: string; value: { stringValue: string } }
): Promise<void> => {
  try {
    const savedValue = await saveValue({
      identifier,
      valueOptions: { stringValue: value.value.stringValue }
    })

    updateValueInValueList(savedValue)
    showMessage({ title: $gettext('Preference saved.') })
  } catch (error) {
    captureException(error)
    console.error(error)
    showErrorMessage({
      title: $gettext('Unable to save preference…'),
      errors: [error]
    })
  }
}

onMounted(async () => {
  window.addEventListener('resize', onResize)

  await loadAccountBundleTask.perform()
  await loadValuesListTask.perform()
  await loadGraphUserTask.perform()

  selectedLanguageValue.value = unref(languageOptions)?.find(
    (languageOption) =>
      languageOption.value === (unref(graphUser)?.preferredLanguage || language.current)
  )

  const disableEmailNotificationsConfiguration = unref(valuesList)?.find(
    (cV) => cV.identifier.setting === 'disable-email-notifications'
  )

  disableEmailNotificationsValue.value = disableEmailNotificationsConfiguration
    ? !disableEmailNotificationsConfiguration.value?.boolValue
    : true
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', onResize)
})
</script>
