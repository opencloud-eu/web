<template>
  <app-loading-spinner v-if="isLoading" />
  <template v-else>
    <div class="flex items-center justify-between px-4 py-3 border-b border-role-outline-variant">
      <oc-button
        type="router-link"
        :to="allInboxRoute"
        appearance="raw"
        no-hover
        :aria-label="$gettext('Close')"
      >
        <oc-icon name="close" fill-type="line" />
      </oc-button>
      <h2 class="text-lg font-bold" v-text="$gettext('New message')" />
      <oc-button appearance="raw" disabled :aria-label="$gettext('Send')">
        <oc-icon name="send" fill-type="line" />
      </oc-button>
    </div>
    <div class="px-4">
      <div class="py-3">
        <oc-select
          v-model="from"
          :label="`${$gettext('From')}:`"
          :options="fromOptions"
          option-label="label"
          option-value="value"
          class="w-full"
          :loading="isLoading"
        />
      </div>
      <oc-text-input
        v-model="toMail"
        type="email"
        class="mail-new-message-to-input mb-2"
        :label="`${$gettext('To')}:`"
      />
      <oc-text-input
        v-model="ccMail"
        type="email"
        class="mail-new-message-cc-input mb-2"
        :label="`${$gettext('CC')}:`"
      />
      <oc-text-input
        v-model="bccMail"
        type="email"
        class="mail-new-message-bcc-input mb-2"
        :label="`${$gettext('BCC')}:`"
      />
      <oc-text-input
        v-model="subject"
        class="mail-new-message-to-input"
        :label="$gettext('Subject')"
      />
      <div class="py-4">
        <oc-textarea v-model="mailBody" :label="$gettext('Write email')" />
      </div>
    </div>
  </template>
</template>

<script setup lang="ts">
import { z } from 'zod'
import { ref, computed, onMounted, unref, watch } from 'vue'
import { MailAccount, MailAccountSchema } from '../types'
import { useGettext } from 'vue3-gettext'
import { useConfigStore, useClientService, useRouteQuery } from '@opencloud-eu/web-pkg'
import { useTask } from 'vue-concurrency'
import { urlJoin } from '@opencloud-eu/web-client'
import { useRoute } from 'vue-router'

type FromOption = {
  value: string
  label: string
  email: string
  accountId: string
  identityId: string
}

const { $gettext } = useGettext()
const route = useRoute()

const configStore = useConfigStore()
const clientService = useClientService()

const selectedAccountIdQuery = useRouteQuery('accountId')

const accounts = ref<MailAccount[]>()
const from = ref<FromOption>()
const toMail = ref<string>('')
const ccMail = ref<string>('')
const bccMail = ref<string>('')
const subject = ref<string>('')
const mailBody = ref<string>('')

const isLoading = computed(() => loadAccountsTask.isRunning || !loadAccountsTask.last)

const allInboxRoute = computed(() => {
  const { draftId, ...restQuery } = route.query

  return {
    name: 'all-inbox',
    query: restQuery
  }
})

const fromOptions = computed(() => {
  return unref(accounts)?.flatMap((account) =>
    account.identities?.map((identity) => ({
      label: identity.name ? `${identity.name} <${identity.email}>` : identity.email,
      value: identity.id,
      email: identity.email,
      accountId: account.accountId,
      identityId: identity.id
    }))
  )
})

const loadAccountsTask = useTask(function* (signal) {
  const url = urlJoin(configStore.groupwareUrl, `accounts`)
  try {
    const { data } = yield clientService.httpAuthenticated.get(url, { signal })
    accounts.value = z.array(MailAccountSchema).parse(data)

    console.log(unref(accounts))
  } catch (e) {
    console.error(e)
  }
})

watch(fromOptions, () => {
  from.value = unref(selectedAccountIdQuery)
    ? unref(fromOptions).find((o) => o.accountId === unref(selectedAccountIdQuery))
    : unref(fromOptions)[0]
})

onMounted(() => {
  loadAccountsTask.perform()
})
</script>
