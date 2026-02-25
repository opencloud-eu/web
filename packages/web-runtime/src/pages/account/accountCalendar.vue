<template>
  <div id="account-calendar">
    <app-loading-spinner v-if="isCalDavLoading" />
    <template v-else>
      <h1 class="text-lg mt-1" v-text="$gettext('Calendar')" />
      <span v-if="!isCalDavAvailable" class="flex flex-row items-center">
        <oc-icon name="information" size="small" fill-type="line" class="mr-1" />

        <span
          class="calendar-not-configured-message"
          v-text="
            $gettext(
              'The calendar is not yet configured on your system, in order to learn how to enable click'
            )
          "
        />
        <oc-button
          no-hover
          class="ml-1"
          appearance="raw"
          type="a"
          target="_blank"
          href="https://docs.opencloud.eu/docs/admin/configuration/radicale-integration/"
        >
          <span v-text="$gettext('here')" />
        </oc-button>
      </span>
      <template v-else>
        <p
          class="text-sm mt-0 mb-4"
          v-text="
            $gettext(
              'Here, you can access your personal calendar for integration with third-party apps like Thunderbird, Apple Calendar, and others.'
            )
          "
        />
        <account-table
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
      </template>
    </template>
  </div>
</template>
<script setup lang="ts">
import { useGettext } from 'vue3-gettext'
import AccountTable from '../../components/Account/AccountTable.vue'
import { useClientService, useConfigStore, useUserStore } from '@opencloud-eu/web-pkg'
import { storeToRefs } from 'pinia'
import { computed, onMounted, ref, unref } from 'vue'
import { urlJoin } from '@opencloud-eu/web-client'
import { useTask } from 'vue-concurrency'

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

const isCalDavLoading = computed(
  () => unref(loadCalDavTask.isRunning) || !unref(loadCalDavTask.last)
)

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

const loadCalDavTask = useTask(function* (signal) {
  const wellKnownUrl = '.well-known/caldav'
  try {
    const response = yield clientService.httpAuthenticated.get(wellKnownUrl, { method: 'OPTIONS' })
    isCalDavAvailable.value = response.request.responseURL.includes(
      urlJoin(configStore.serverUrl, 'caldav')
    )
  } catch (e) {
    console.error(e)
    isCalDavAvailable.value = false
  }
})

onMounted(async () => {
  await loadCalDavTask.perform()
})
</script>
