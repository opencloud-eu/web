<template>
  <div id="account-information">
    <div class="flex justify-between items-center w-full">
      <h1 class="mt-0" v-text="$gettext('Account Information')" />
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
    <account-table
      :fields="[$gettext('Information name'), $gettext('Information value')]"
      class="account-page-info mt-6"
    >
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
  </div>
</template>
<script setup lang="ts">
import { useGettext } from 'vue3-gettext'
import {
  AVATAR_UPLOAD_MAX_FILE_SIZE_MB,
  AvatarUpload,
  useAuthStore,
  useConfigStore,
  useSpacesStore,
  useUserStore
} from '@opencloud-eu/web-pkg'
import AccountTable from '../../components/Account/AccountTable.vue'
import QuotaInformation from '../../components/Account/QuotaInformation.vue'
import { computed, unref } from 'vue'
import { storeToRefs } from 'pinia'

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
const groupNames = computed(() => {
  return unref(user)
    .memberOf.map((group) => group.displayName)
    .join(', ')
})
</script>
