<template>
  <app-loading-spinner v-if="isLoading" />
  <template v-else>
    <div class="flex items-center justify-between px-4 py-3 border-b border-role-outline-variant">
      <oc-button appearance="raw" no-hover aria-label="Close" @click="$emit('close')">
        <oc-icon name="close" fill-type="line" />
      </oc-button>
      <h2 class="text-lg font-bold" v-text="$gettext('New message')" />
      <oc-button appearance="raw" disabled aria-label="Send">
        <oc-icon name="send" fill-type="line" />
      </oc-button>
    </div>
    <div class="px-4">
      <div class="py-3">
        <oc-select
          label="From:"
          v-model="selectedFrom"
          :options="fromOptions"
          option-label="label"
          option-value="value"
          class="w-full"
          :loading="isLoading"
        />
      </div>
      <oc-text-input
        key="modal-input"
        ref="ocModalInput"
        type="email"
        class="mail-new-message-to-input mb-2"
        :label="`${$gettext('To')}:`"
      />
      <oc-text-input
        key="modal-input"
        ref="ocModalInput"
        type="email"
        class="mail-new-message-cc-input mb-2"
        :label="`${$gettext('CC')}:`"
      />
      <oc-text-input
        key="modal-input"
        ref="ocModalInput"
        type="email"
        class="mail-new-message-bcc-input mb-2"
        :label="`${$gettext('BCC')}:`"
      />
      <oc-text-input
        key="modal-input"
        ref="ocModalInput"
        class="mail-new-message-to-input"
        :label="$gettext('Subject')"
      />
      <div class="py-4">
        <oc-textarea :label="$gettext('Write email')" />
      </div>
    </div>
  </template>
</template>

<script setup lang="ts">
import { z } from 'zod'
import { ref, computed, onMounted, unref } from 'vue'
import type { MailAccount } from '../types'
import { MailAccountSchema } from '../types'
import { useGettext } from 'vue3-gettext'
import { useConfigStore, useGroupwareConfigStore, useClientService } from '@opencloud-eu/web-pkg'
import { useTask } from 'vue-concurrency'
import { urlJoin } from '@opencloud-eu/web-client'

defineEmits<{ (e: 'close'): void }>()
const { $gettext } = useGettext()

const { account } = defineProps<{
  account: MailAccount
}>()

const groupwareConfigStore = useGroupwareConfigStore()
const configStore = useConfigStore()
const clientService = useClientService()

type FromOption = {
  value: string
  label: string
  email: string
  accountId: string
  identityId: string
}

const from = ref<string>('')
const selectedFrom = ref<string>('')
const fromOptions = ref<FromOption[]>([])

const isLoading = computed(
  () => unref(loadMailIdentitiesTask.isRunning) || !unref(loadMailIdentitiesTask.last)
)

const loadMailIdentitiesTask = useTask(function* (signal) {
  const url = urlJoin(configStore.groupwareUrl, `accounts`)
  try {
    const { data } = yield clientService.httpAuthenticated.get(url, { signal })
    const rows = z
      .array(MailAccountSchema)
      .parse(typeof data === 'string' ? JSON.parse(data) : data)

    const opts: FromOption[] = rows.flatMap((account) =>
      (account.identities ?? []).map((id) => ({
        value: `${account.accountId}:${id.id}`,
        label: id.name ? `${id.name} <${id.email}>` : id.email,
        email: id.email,
        accountId: account.accountId,
        identityId: id.id
      }))
    )

    fromOptions.value = opts
    console.log('fromOtions: ', fromOptions)
    const preferredAccountId = account || groupwareConfigStore.primaryAccounts?.mail
    const defaultFromOption =
      (preferredAccountId ? opts.find((o) => o.accountId === preferredAccountId) : undefined) ??
      opts[0]
    console.log('default fromOtions: ', defaultFromOption)

    selectedFrom.value = defaultFromOption?.label ?? ''
    from.value = defaultFromOption?.email ?? ''
  } catch (e) {
    console.error(e)
  }
})

onMounted(() => {
  loadMailIdentitiesTask.perform()
})
</script>
