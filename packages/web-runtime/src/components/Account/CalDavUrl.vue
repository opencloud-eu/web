<template>
  <div v-if="isCalDavAvailable">
    <account-table
      :title="$gettext('Calendar')"
      :new-tag="true"
      :subtitle="
        $gettext(
          'Here, you can access your personal calendar for integration with third-party apps like Thunderbird, Apple Calendar, and others.'
        )
      "
      :fields="[
        $gettext('CalDAV information name'),
        $gettext('CalCAV information value'),
        $gettext('CalCAV information actions')
      ]"
    >
      <oc-table-tr>
        <oc-table-td>{{ $gettext('CalDAV URL') }}</oc-table-td>
        <oc-table-td>
          <span class="truncate">{{ configStore.serverUrl }}</span>
        </oc-table-td>
        <oc-table-td>
          <oc-button
            appearance="raw"
            data-testid="copy-caldav-url"
            size="small"
            no-hover
            @click="copyCalDavUrlToClipboard"
          >
            <oc-icon :name="copyCalDavUrlIcon" size="small" />
            <span class="ml-0.5">{{ $gettext('Copy CalDAV URL') }}</span>
          </oc-button>
        </oc-table-td>
      </oc-table-tr>
      <oc-table-tr>
        <oc-table-td>{{ $gettext('Username') }}</oc-table-td>
        <oc-table-td>
          <span>{{ user.onPremisesSamAccountName }}</span>
        </oc-table-td>
        <oc-table-td>
          <oc-button
            appearance="raw"
            data-testid="copy-caldav-username"
            size="small"
            no-hover
            @click="copyCalDavUsernameToClipboard"
          >
            <oc-icon :name="copyCalDavUsernameIcon" size="small" />
            <span class="ml-0.5">{{ $gettext('Copy CalDAV username') }}</span>
          </oc-button>
        </oc-table-td>
      </oc-table-tr>
      <oc-table-tr>
        <oc-table-td>{{ $gettext('Password') }}</oc-table-td>
        <oc-table-td colspan="2">
          {{ $gettext('An app token needs to be generated and then can be used.') }}
        </oc-table-td>
      </oc-table-tr>
    </account-table>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref, unref } from 'vue'
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

const isCalDavAvailable = ref(false)
const copiedIcon = 'check'
const copyIcon = 'file-copy'

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
  const wellKnownUrl = '.well-known/caldav'
  try {
    const response = await clientService.httpAuthenticated.get(wellKnownUrl, {
      method: 'OPTIONS'
    })

    if (response.request.responseURL.includes(urlJoin(configStore.serverUrl, 'caldav'))) {
      isCalDavAvailable.value = true
    }
  } catch (error) {
    console.info('CalDAV check failed:', error)
  }
})
</script>
