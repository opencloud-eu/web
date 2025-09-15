<template>
  <app-loading-spinner v-if="isLoading" />
  <main v-else id="account" class="pt-4 pb-6 flex justify-center overflow-y-auto">
    <div class="account-page px-4 lg:px-0 w-full lg:w-7xl">
      <h1 id="account-page-title" class="mb-0 border-b" v-text="$gettext('My Account')" />
      <account-table
        v-if="showAccountSection"
        :title="$gettext('Account Information')"
        :fields="[$gettext('Information name'), $gettext('Information value')]"
        class="account-page-info mt-6"
      >
        <template #header="{ title }">
          <div class="flex justify-between items-end w-full">
            <h2 v-text="title" />
            <oc-button
              v-if="accountEditLink"
              type="a"
              :href="accountEditLink.href"
              target="_blank"
              data-testid="account-page-edit-url-btn"
            >
              <oc-icon name="edit" />
              <span v-text="$gettext('Edit')" />
            </oc-button>
          </div>
        </template>
        <oc-table-tr>
          <oc-table-td>{{ $gettext('Profile picture') }}</oc-table-td>
          <oc-table-td
            >{{
              $gettext('Max. %{size}MB, JPG, PNG', {
                size: AVATAR_UPLOAD_MAX_FILE_SIZE_MB.toString()
              })
            }}
          </oc-table-td>
          <oc-table-td>
            <avatar-upload class="mb-2" />
          </oc-table-td>
        </oc-table-tr>
        <oc-table-tr class="account-page-info-username">
          <oc-table-td>{{ $gettext('Username') }}</oc-table-td>
          <oc-table-td>{{ user.onPremisesSamAccountName }}</oc-table-td>
        </oc-table-tr>
        <oc-table-tr class="account-page-info-displayname">
          <oc-table-td>{{ $gettext('First and last name') }}</oc-table-td>
          <oc-table-td>{{ user.displayName }}</oc-table-td>
        </oc-table-tr>
        <oc-table-tr class="account-page-info-email">
          <oc-table-td>{{ $gettext('Email') }}</oc-table-td>
          <oc-table-td>
            <template v-if="user.mail">{{ user.mail }}</template>
            <span v-else v-text="$gettext('No email has been set up')" />
          </oc-table-td>
        </oc-table-tr>
        <oc-table-tr v-if="!!quota" class="account-page-info-quota">
          <oc-table-td>{{ $gettext('Personal storage') }}</oc-table-td>
          <oc-table-td data-testid="quota">
            <quota-information :quota="quota" class="mt-1" />
          </oc-table-td>
        </oc-table-tr>
        <oc-table-tr class="account-page-info-groups">
          <oc-table-td>{{ $gettext('Group memberships') }}</oc-table-td>
          <oc-table-td data-testid="group-names">
            <span v-if="groupNames">{{ groupNames }}</span>
            <span
              v-else
              data-testid="group-names-empty"
              v-text="$gettext('You are not part of any group')"
            />
          </oc-table-td>
        </oc-table-tr>
        <oc-table-tr v-if="showLogout" class="account-page-logout-all-devices">
          <oc-table-td>{{ $gettext('Logout from active devices') }}</oc-table-td>
          <oc-table-td data-testid="logout">
            <oc-button
              appearance="raw"
              type="a"
              :href="logoutUrl"
              target="_blank"
              data-testid="account-page-logout-url-btn"
              no-hover
            >
              <span v-text="$gettext('Show devices')" />
            </oc-button>
          </oc-table-td>
        </oc-table-tr>
      </account-table>
      <account-table
        :title="$gettext('Preferences')"
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
        <account-table
          :title="$gettext('Notifications')"
          :fields="notificationsSettingsFields"
          :show-head="!isMobileWidth"
        >
          <template #header="{ title }">
            <h2>{{ title }}</h2>
            <p>
              {{
                $gettext(
                  'Personalise your notification preferences about any file, folder, or Space.'
                )
              }}
            </p>
          </template>

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
        <account-table
          :title="$gettext('Mail notification options')"
          :fields="emailNotificationsOptionsFields"
          :show-head="!isMobileWidth"
          class="mt-4"
        >
          <template #header="{ title }">
            <h2 class="sr-only">{{ title }}</h2>
          </template>

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

      <account-table
        v-if="extensionPointsWithUserPreferences.length"
        :title="$gettext('Extensions')"
        :fields="[
          $gettext('Extension name'),
          $gettext('Extension description'),
          $gettext('Extension value')
        ]"
        class="account-page-extensions"
      >
        <oc-table-tr
          v-for="extensionPoint in extensionPointsWithUserPreferences"
          :key="`extension-point-preference-${extensionPoint.id}`"
          class="mb-4"
        >
          <oc-table-td>{{ extensionPoint.userPreference.label }}</oc-table-td>
          <oc-table-td v-if="extensionPoint.userPreference.description">
            <span v-text="$gettext(extensionPoint.userPreference.description || '')" />
          </oc-table-td>
          <oc-table-td>
            <extension-preference :extension-point="extensionPoint" />
          </oc-table-td>
        </oc-table-tr>
      </account-table>
      <account-table
        v-if="showGdprExport"
        :title="$gettext('GDPR')"
        :fields="[
          $gettext('GDPR action name'),
          $gettext('GDPR action description'),
          $gettext('GDPR actions')
        ]"
      >
        <oc-table-tr>
          <oc-table-td>{{ $gettext('GDPR export') }}</oc-table-td>
          <oc-table-td>
            <span v-text="$gettext('Request a personal data export according to §20 GDPR.')" />
          </oc-table-td>
          <oc-table-td data-testid="gdpr-export">
            <gdpr-export />
          </oc-table-td>
        </oc-table-tr>
      </account-table>
      <component
        :is="extension.content"
        v-for="extension in preferencesPanelExtensions"
        :key="`preferences-panel-${extension.id}`"
        class="preferences-panel mt-6 border-b"
      />
    </div>
  </main>
</template>

<script lang="ts">
import { storeToRefs } from 'pinia'
import EditPasswordModal from '../components/EditPasswordModal.vue'
import { LanguageOption, SettingsBundle, SettingsValue } from '../helpers/settings'
import { computed, defineComponent, onBeforeUnmount, onMounted, ref, unref } from 'vue'
import {
  AppLoadingSpinner,
  AvatarUpload,
  useAppsStore,
  useAuthStore,
  useCapabilityStore,
  useClientService,
  useConfigStore,
  useExtensionRegistry,
  useMessages,
  useModals,
  useResourcesStore,
  useSpacesStore,
  useUserStore,
  AVATAR_UPLOAD_MAX_FILE_SIZE_MB
} from '@opencloud-eu/web-pkg'
import { useTask } from 'vue-concurrency'
import { useGettext } from 'vue3-gettext'
import { loadAppTranslations, setCurrentLanguage } from '../helpers/language'
import GdprExport from '../components/Account/GdprExport.vue'
import ThemeSwitcher from '../components/Account/ThemeSwitcher.vue'
import ExtensionPreference from '../components/Account/ExtensionPreference.vue'
import { SSEAdapter } from '@opencloud-eu/web-client/sse'
import { supportedLanguages } from '../defaults'
import { User } from '@opencloud-eu/web-client/graph/generated'
import { isEmpty } from 'lodash-es'
import { call } from '@opencloud-eu/web-client'
import QuotaInformation from '../components/Account/QuotaInformation.vue'
import AccountTable from '../components/Account/AccountTable.vue'
import { useNotificationsSettings } from '../composables/notificationsSettings'
import { captureException } from '@sentry/vue'
import { preferencesPanelExtensionPoint } from '../extensionPoints'

const MOBILE_BREAKPOINT = 800
export default defineComponent({
  name: 'AccountPage',
  components: {
    AvatarUpload,
    QuotaInformation,
    AppLoadingSpinner,
    GdprExport,
    ExtensionPreference,
    ThemeSwitcher,
    AccountTable
  },
  setup() {
    const { showMessage, showErrorMessage } = useMessages()
    const userStore = useUserStore()
    const authStore = useAuthStore()
    const language = useGettext()
    const { $gettext } = language
    const clientService = useClientService()
    const resourcesStore = useResourcesStore()
    const appsStore = useAppsStore()
    const extensionRegistry = useExtensionRegistry()

    const valuesList = ref<SettingsValue[]>()
    const graphUser = ref<User>()
    const accountBundle = ref<SettingsBundle>()
    const selectedLanguageValue = ref<LanguageOption>()
    const disableEmailNotificationsValue = ref<boolean>()
    const viewOptionWebDavDetailsValue = ref<boolean>(resourcesStore.areWebDavDetailsShown)
    const { dispatchModal } = useModals()
    const spacesStore = useSpacesStore()
    const capabilityStore = useCapabilityStore()
    const configStore = useConfigStore()
    const {
      options: notificationsOptions,
      emailOptions: emailNotificationsOptions,
      values: notificationsValues,
      emailValues: emailNotificationsValues
    } = useNotificationsSettings(valuesList, accountBundle)

    const isMobileWidth = ref<boolean>(window.innerWidth < MOBILE_BREAKPOINT)
    const onResize = () => {
      isMobileWidth.value = window.innerWidth < MOBILE_BREAKPOINT
    }

    const preferencesPanelExtensions = computed(() => {
      return extensionRegistry.requestExtensions(preferencesPanelExtensionPoint)
    })

    // FIXME: Use settings service capability when we have it
    const isSettingsServiceSupported = computed(() => !configStore.options.runningOnEos)

    const { user } = storeToRefs(userStore)

    const quota = computed(() => {
      return spacesStore.personalSpace?.spaceQuota
    })

    const showGdprExport = computed(() => {
      return (
        authStore.userContextReady &&
        capabilityStore.personalDataExport &&
        spacesStore.personalSpace
      )
    })
    const showChangePassword = computed(() => {
      return authStore.userContextReady && !capabilityStore.graphUsersChangeSelfPasswordDisabled
    })
    const showAccountSection = computed(() => authStore.userContextReady)
    const showWebDavDetails = computed(() => authStore.userContextReady)
    const showNotifications = computed(
      () => authStore.userContextReady && unref(isSettingsServiceSupported)
    )
    const showLogout = computed(() => authStore.userContextReady && configStore.options.logoutUrl)

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

    const languageOptions = Object.keys(supportedLanguages).map((langCode) => ({
      label: supportedLanguages[langCode as keyof typeof supportedLanguages],
      value: langCode
    }))

    const groupNames = computed(() => {
      return unref(user)
        .memberOf.map((group) => group.displayName)
        .join(', ')
    })

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

    const extensionPointsWithUserPreferences = computed(() => {
      return extensionRegistry.getExtensionPoints().filter((extensionPoint) => {
        if (
          !Object.hasOwn(extensionPoint, 'userPreference') ||
          isEmpty(extensionPoint.userPreference)
        ) {
          return false
        }
        const extensions = extensionRegistry.requestExtensions(extensionPoint)
        return !!extensions.length
      })
    })

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
                ...(currentValue?.value.collectionValue.values.filter((val) => val.key !== key) ||
                  []),
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

    const canConfigureSpecificNotifications = computed(
      () => capabilityStore.capabilities.notifications.configurable
    )

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

    const showEditPasswordModal = () => {
      dispatchModal({
        title: $gettext('Change password'),
        customComponent: EditPasswordModal
      })
    }

    return {
      clientService,
      languageOptions,
      extensionPointsWithUserPreferences,
      selectedLanguageValue,
      updateSelectedLanguage,
      updateDisableEmailNotifications,
      updateViewOptionsWebDavDetails,
      accountEditLink: computed(() => configStore.options.accountEditLink),
      showLogout,
      showGdprExport,
      showNotifications,
      showAccountSection,
      showChangePassword,
      showWebDavDetails,
      groupNames,
      user,
      logoutUrl: computed(() => configStore.options.logoutUrl),
      isLoading,
      disableEmailNotificationsValue,
      viewOptionWebDavDetailsValue,
      loadAccountBundleTask,
      loadGraphUserTask,
      loadValuesListTask,
      showEditPasswordModal,
      quota,
      isMobileWidth,
      notificationsOptions,
      notificationsSettingsFields,
      emailNotificationsOptionsFields,
      emailNotificationsOptions,
      notificationsValues,
      updateMultiChoiceSettingsValue,
      emailNotificationsValues,
      updateSingleChoiceValue,
      canConfigureSpecificNotifications,
      preferencesPanelExtensions,
      AVATAR_UPLOAD_MAX_FILE_SIZE_MB
    }
  }
})
</script>
