<template>
  <div v-if="user" id="account-information">
    <account-heading
      :title="$gettext('Profile')"
      :subtitle="$gettext('Your picture and account details.')"
    >
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
    </account-heading>
    <avatar-upload class="account-page-avatar bg-role-surface-container rounded-xl p-4">
      <account-label
        class="text-center md:text-left"
        :label="$gettext('Profile picture')"
        :description="
          $gettext('Max. %{size}MB, JPG, PNG', { size: AVATAR_UPLOAD_MAX_FILE_SIZE_MB.toString() })
        "
      />
    </avatar-upload>
    <account-heading
      tag="h2"
      :title="$gettext('Account information')"
      :subtitle="$gettext('Details about your account.')"
    />
    <account-table
      :fields="[$gettext('Information name'), $gettext('Information value')]"
      class="account-page-info"
    >
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
          <oc-spinner
            v-if="loadGroupNamesTask.isRunning"
            size="small"
            :aria-label="$gettext('Loading group memberships')"
          />
          <span v-else-if="groupNames">{{ groupNames }}</span>
          <span
            v-else
            data-testid="group-names-empty"
            v-text="$gettext('You are not part of any group')"
          />
        </oc-table-td>
      </oc-table-tr>
      <oc-table-tr v-if="twoFactorState" class="account-page-two-factor">
        <oc-table-td>{{ $gettext('Two-factor authentication') }}</oc-table-td>
        <oc-table-td data-testid="two-factor">
          <oc-switch
            v-if="twoFactorState !== 'unknown'"
            :checked="twoFactorState === 'on'"
            :label="twoFactorState === 'on' ? $gettext('On') : $gettext('Off')"
            class="inline-flex"
            data-testid="account-page-two-factor-switch"
            @update:checked="openTwoFactorPage"
          />
          <oc-button
            v-else
            appearance="raw"
            type="a"
            :href="twoFactorUrl"
            target="_blank"
            data-testid="account-page-two-factor-btn"
            no-hover
          >
            <span v-text="$gettext('Manage')" />
          </oc-button>
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
  </div>
</template>
<script setup lang="ts">
import { useGettext } from 'vue3-gettext'
import {
  AVATAR_UPLOAD_MAX_FILE_SIZE_MB,
  AvatarUpload,
  useAuthStore,
  useClientService,
  useConfigStore,
  useSpacesStore,
  useUserStore
} from '@opencloud-eu/web-pkg'
import AccountTable from '../../components/Account/AccountTable.vue'
import AccountHeading from '../../components/Account/AccountHeading.vue'
import AccountLabel from '../../components/Account/AccountLabel.vue'
import QuotaInformation from '../../components/Account/QuotaInformation.vue'
import { computed, onMounted, ref, unref } from 'vue'
import { storeToRefs } from 'pinia'
import { useTask } from 'vue-concurrency'
import { call, urlJoin } from '@opencloud-eu/web-client'
import { useEventListener } from '@vueuse/core'

const { $gettext } = useGettext()
const configStore = useConfigStore()
const authStore = useAuthStore()
const userStore = useUserStore()
const spacesStore = useSpacesStore()

const { user } = storeToRefs(userStore)
const accountEditLink = computed(() => configStore.options.accountEditLink)
const showLogout = computed(() => authStore.userContextReady && configStore.options.logoutUrl)
const logoutUrl = computed(() => configStore.options.logoutUrl)
const quota = computed(() => {
  return spacesStore.personalSpace?.spaceQuota
})
const clientService = useClientService()
const groupNames = computed(() => {
  return (unref(user).memberOf || []).map((group) => group.displayName).join(', ')
})

// group memberships are only shown here, so they're not loaded during bootstrap
const loadGroupNamesTask = useTask(function* (signal) {
  try {
    const { memberOf = [] } = yield* call(
      clientService.graphAuthenticated.users.getMe({ expand: ['memberOf'] }, { signal })
    )
    userStore.setUser({ ...unref(user), memberOf })
  } catch (e) {
    console.error(e)
  }
})

// Two-factor authentication is a feature of the builtin IDP. Users turn it on and off on a
// page of the IDP, the state is requested with the session of the IDP. The row is not shown when
// the IDP does not offer it, e.g. when an external IDP is used.
type TwoFactorState = 'on' | 'off' | 'unknown'
const twoFactorState = ref<TwoFactorState>(null)
const twoFactorUrl = computed(() => urlJoin(configStore.serverUrl, 'signin/v1/mfa'))

const loadTwoFactorStateTask = useTask(function* (signal) {
  try {
    const { status, data } = yield clientService.httpUnAuthenticated.get<{ enabled: boolean }>(
      urlJoin(configStore.serverUrl, 'signin/v1/identifier/_/mfa/status'),
      { headers: { 'Kopano-Konnect-XSRF': '1' }, validateStatus: () => true, signal }
    )
    if (status === 200) {
      twoFactorState.value = data?.enabled ? 'on' : 'off'
      return
    }
    // without a session at the IDP the state is not known, the page of the IDP asks to log in
    twoFactorState.value = status === 401 ? 'unknown' : null
  } catch (e) {
    console.error(e)
    twoFactorState.value = null
  }
}).restartable()

function openTwoFactorPage() {
  // The switch does not change the state itself. Turning two-factor authentication on
  // needs an authenticator app to be set up, turning it off needs a code. Both happen on
  // the page of the IDP, the switch follows when the user comes back.
  window.open(unref(twoFactorUrl), '_blank', 'noopener')
}

function onVisibilityChange() {
  // the user comes back from the page of the IDP, which opens in another tab
  if (document.visibilityState === 'visible' && authStore.userContextReady) {
    loadTwoFactorStateTask.perform()
  }
}
useEventListener(document, 'visibilitychange', onVisibilityChange)

onMounted(() => {
  if (authStore.userContextReady) {
    loadGroupNamesTask.perform()
    loadTwoFactorStateTask.perform()
  }
})
</script>
