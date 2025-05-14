<template>
  <div v-if="calDavAvailable">
    <account-table
      :title="$gettext('Calendar')"
      :fields="[$gettext('CalDAV information name'), $gettext('CalCAD information value')]"
      class="account-page-caldav"
    >
      <template #header="{ title }">
        <h2>{{ title }}<oc-tag :rounded="true" class="oc-ml-s">New</oc-tag></h2>
      </template>

      <oc-table-tr class="account-page-info-caldav-integration">
        <oc-table-td>{{ $gettext('Calendar integration') }}</oc-table-td>
        <oc-table-td colspan="2">
          {{
            $gettext(
              'The user has their own calendar available for integration into third party apps (Thunderbird, Apple Calendar, etc).'
            )
          }}
        </oc-table-td>
      </oc-table-tr>
      <oc-table-tr class="account-page-info-caldav-url">
        <oc-table-td>{{ $gettext('CalDAV URL') }}</oc-table-td>
        <oc-table-td colspan="2">
          <div class="oc-flex oc-flex-middle">
            <span class="oc-text-truncate">{{ calDavUrl }}</span>
            <oc-button
              v-oc-tooltip="$gettext('Copy CalDAV URL')"
              class="oc-ml-xs"
              appearance="raw"
              size="small"
              :aria-label="$gettext('Copy CalDAV URL to clipboard')"
              no-hover
              @click="copyCalDavUrlToClipboard"
            >
              <oc-icon :name="copyCalDavUrlIcon" size="small" />
            </oc-button>
          </div>
        </oc-table-td>
      </oc-table-tr>
      <oc-table-tr class="account-page-info-caldav-username">
        <oc-table-td>{{ $gettext('CalDAV Username') }}</oc-table-td>
        <oc-table-td colspan="2">
          <div class="oc-flex oc-flex-middle">
            <span>{{ user.onPremisesSamAccountName }}</span>
            <oc-button
              v-oc-tooltip="$gettext('Copy CalDAV username')"
              class="oc-ml-xs"
              appearance="raw"
              size="small"
              :aria-label="$gettext('Copy CalDAV username to clipboard')"
              no-hover
              @click="copyCalDavUsernameToClipboard"
            >
              <oc-icon :name="copyCalDavUsernameIcon" size="small" />
            </oc-button>
          </div>
        </oc-table-td>
      </oc-table-tr>
      <oc-table-tr class="account-page-info-caldav-password">
        <oc-table-td>{{ $gettext('CalDAV Password') }}</oc-table-td>
        <oc-table-td colspan="2">
          {{ $gettext('An app token needs to be generated and then can be used.') }}
        </oc-table-td>
      </oc-table-tr>
    </account-table>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { storeToRefs } from 'pinia'
import { useClientService, useConfigStore, useUserStore } from '@opencloud-eu/web-pkg'
import { useGettext } from 'vue3-gettext'
import AccountTable from './AccountTable.vue'

const { $gettext } = useGettext()
const userStore = useUserStore()
const { user } = storeToRefs(userStore)
const configStore = useConfigStore()
const clientService = useClientService()

const calDavAvailable = ref(false)
const copiedIcon = 'check'
const copyIcon = 'file-copy'

const calDavUrl = computed(() => {
  return `${configStore.serverUrl}/caldav/${user.value.id}/def-calendar/`
})

const copyCalDavUrlIcon = ref(copyIcon)
const copyCalDavUsernameIcon = ref(copyIcon)

const copyCalDavUrlToClipboard = () => {
  navigator.clipboard.writeText(calDavUrl.value)
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
    const wellKnownUrl = `${configStore.serverUrl}/.well-known/caldav`
    const response = await clientService.httpUnAuthenticated.get(wellKnownUrl, {
      method: 'OPTIONS',
      maxRedirects: 0
    })

    if (response.status === 301 && response.headers['Location'] === '/caldav/') {
      calDavAvailable.value = true
    }
  } catch (error) {
    console.error('CalDAV check failed:', error)
  }
})
</script>
