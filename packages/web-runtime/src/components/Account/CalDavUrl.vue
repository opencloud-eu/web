<template>
  <div v-if="checked && calDavAvailable">
    <account-table
      :title="$gettext('Calendar')"
      :fields="[$gettext('CalDAV information name'), $gettext('CalCAV information value')]"
      class="account-page-caldav"
    >
      <template #header="{ title }">
        <h2>
          {{ title
          }}<oc-tag :rounded="true" color="primary" appearance="filled" class="oc-ml-s">
            {{ $gettext('NEW') }}
          </oc-tag>
        </h2>
      </template>

      <oc-table-tr class="account-page-info-caldav-integration">
        <oc-table-td colspan="3">{{
          $gettext(
            'Here, you can access your personal calendar for integration with third-party apps like Thunderbird, Apple Calendar, and others.'
          )
        }}</oc-table-td>
      </oc-table-tr>
      <oc-table-tr class="account-page-info-caldav-url">
        <oc-table-td>{{ $gettext('CalDAV URL') }}</oc-table-td>
        <oc-table-td colspan="2">
          <div class="oc-flex oc-flex-middle">
            <span class="oc-text-truncate">{{ configStore.serverUrl }}</span>
            <oc-button
              v-oc-tooltip="$gettext('Copy CalDAV URL')"
              class="oc-ml-m"
              appearance="raw"
              data-testid="copy-caldav-url"
              size="small"
              :aria-label="$gettext('Copy CalDAV URL to clipboard')"
              no-hover
              @click="copyCalDavUrlToClipboard"
            >
              <oc-icon :name="copyCalDavUrlIcon" size="small" />
              <span class="oc-ml-2xs">{{ $gettext('Copy') }}</span>
            </oc-button>
          </div>
        </oc-table-td>
      </oc-table-tr>
      <oc-table-tr class="account-page-info-caldav-username">
        <oc-table-td>{{ $gettext('Username') }}</oc-table-td>
        <oc-table-td colspan="2">
          <div class="oc-flex oc-flex-middle">
            <span>{{ user.onPremisesSamAccountName }}</span>
            <oc-button
              v-oc-tooltip="$gettext('Copy CalDAV username')"
              class="oc-ml-m"
              appearance="raw"
              data-testid="copy-caldav-username"
              size="small"
              :aria-label="$gettext('Copy CalDAV username to clipboard')"
              no-hover
              @click="copyCalDavUsernameToClipboard"
            >
              <oc-icon :name="copyCalDavUsernameIcon" size="small" />
              <span class="oc-ml-2xs">{{ $gettext('Copy') }}</span>
            </oc-button>
          </div>
        </oc-table-td>
      </oc-table-tr>
      <oc-table-tr class="account-page-info-caldav-password">
        <oc-table-td>{{ $gettext('Password') }}</oc-table-td>
        <oc-table-td colspan="2">
          {{ $gettext('An app token needs to be generated and then can be used.') }}
        </oc-table-td>
      </oc-table-tr>
    </account-table>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, unref } from 'vue'
import { storeToRefs } from 'pinia'
import { useClientService, useConfigStore, useUserStore } from '@opencloud-eu/web-pkg'
import { useGettext } from 'vue3-gettext'
import AccountTable from './AccountTable.vue'
import { urlJoin } from '@opencloud-eu/web-client'

const { $gettext } = useGettext()
const userStore = useUserStore()
const { user } = storeToRefs(userStore)
const configStore = useConfigStore()
const clientService = useClientService()

const calDavAvailable = ref(false)
const copiedIcon = 'check'
const copyIcon = 'file-copy'
const checked = ref(false)

const copyCalDavUrlIcon = ref(copyIcon)
const copyCalDavUsernameIcon = ref(copyIcon)

const copyCalDavUrlToClipboard = () => {
  navigator.clipboard.writeText(unref(configStore.serverUrl))
  copyCalDavUrlIcon.value = copiedIcon
  setTimeout(() => (copyCalDavUrlIcon.value = copyIcon), 1500)
}

const copyCalDavUsernameToClipboard = () => {
  navigator.clipboard.writeText(user.value.onPremisesSamAccountName)
  copyCalDavUsernameIcon.value = copiedIcon
  setTimeout(() => (copyCalDavUsernameIcon.value = copyIcon), 1500)
}

onMounted(async () => {
  try {
    const wellKnownUrl = '.well-known/caldav'
    try {
      const response = await clientService.httpAuthenticated.get(wellKnownUrl, {
        method: 'OPTIONS'
      })

      if (response.request.responseURL.includes(urlJoin(configStore.serverUrl, 'caldav'))) {
        calDavAvailable.value = true
      }
    } catch (error) {
      console.error('CalDAV check failed:', error)
    }
  } finally {
    checked.value = true
  }
})
</script>
