<template>
  <app-loading-spinner v-if="isLoading" />
  <div v-else class="px-4">
    <div class="py-2 mb-2 border-b border-role-outline-variant">
      <oc-select
        :model-value="modelValue.from"
        :label="`${$gettext('From')}:`"
        :inline-label="true"
        :has-border="false"
        :options="fromOptions"
        option-label="label"
        option-value="value"
        class="w-full"
        :loading="isLoading"
        @update:model-value="(value: FromOption) => updateField('from', value)"
      />
    </div>

    <oc-text-input
      :model-value="modelValue.to"
      type="email"
      class="mail-new-message-to-input mb-2 pb-2 border-b border-role-outline-variant"
      :label="`${$gettext('To')}:`"
      :inline-label="true"
      :has-border="false"
      @update:model-value="(value: string) => updateField('to', value)"
    />

    <oc-text-input
      :model-value="modelValue.cc"
      type="email"
      class="mail-new-message-cc-input mb-2 pb-2 border-b border-role-outline-variant"
      :label="`${$gettext('CC')}:`"
      :inline-label="true"
      :has-border="false"
      @update:model-value="(value: string) => updateField('cc', value)"
    />

    <oc-text-input
      :model-value="modelValue.bcc"
      type="email"
      class="mail-new-message-bcc-input mb-2 pb-2 border-b border-role-outline-variant"
      :label="`${$gettext('BCC')}:`"
      :inline-label="true"
      :has-border="false"
      @update:model-value="(value: string) => updateField('bcc', value)"
    />

    <oc-text-input
      :model-value="modelValue.subject"
      class="mail-new-message-to-input pb-2 border-b border-role-outline-variant"
      :label="`${$gettext('Subject')}:`"
      :inline-label="true"
      :has-border="false"
      @update:model-value="(value: string) => updateField('subject', value)"
    />

    <div class="py-4">
      <oc-textarea
        :model-value="modelValue.body"
        :label="$gettext('Write email')"
        @update:model-value="(value: string) => updateField('body', value)"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { z } from 'zod'
import { ref, computed, onMounted, unref, watch } from 'vue'
import { MailAccount, MailAccountSchema } from '../types'
import { useGettext } from 'vue3-gettext'
import { useConfigStore, useClientService, useRouteQuery } from '@opencloud-eu/web-pkg'
import { useTask } from 'vue-concurrency'
import { urlJoin } from '@opencloud-eu/web-client'

type FromOption = {
  value: string
  label: string
  email: string
  accountId: string
  identityId: string
}

const props = defineProps<{
  modelValue: ComposeFormState
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: ComposeFormState): void
}>()

const { $gettext } = useGettext()

const configStore = useConfigStore()
const clientService = useClientService()

const selectedAccountIdQuery = useRouteQuery('accountId')

const accounts = ref<MailAccount[]>()

export type ComposeFormState = {
  from: FromOption | undefined
  to: string
  cc: string
  bcc: string
  subject: string
  body: string
}

const loadAccountsTask = useTask(function* (signal) {
  const url = urlJoin(configStore.groupwareUrl, `accounts`)
  try {
    const { data } = yield clientService.httpAuthenticated.get(url, { signal })
    accounts.value = z.array(MailAccountSchema).parse(data)
  } catch (e) {
    console.error(e)
  }
})

const isLoading = computed(() => loadAccountsTask.isRunning || !loadAccountsTask.last)

const fromOptions = computed<FromOption[]>(() => {
  return (
    unref(accounts)?.flatMap((account) =>
      account.identities?.map((identity) => ({
        label: identity.name ? `${identity.name} <${identity.email}>` : identity.email,
        value: identity.id,
        email: identity.email,
        accountId: account.accountId,
        identityId: identity.id
      }))
    ) ?? []
  )
})

const updateField = <K extends keyof ComposeFormState>(key: K, value: ComposeFormState[K]) => {
  emit('update:modelValue', { ...props.modelValue, [key]: value })
}

watch(
  fromOptions,
  (options) => {
    if (!options.length) {
      return
    }
    const selectedAccountId = unref(selectedAccountIdQuery)
    const defaultFrom = selectedAccountId
      ? (options.find((o) => o.accountId === selectedAccountId) ?? options[0])
      : options[0]

    if (!props.modelValue.from && defaultFrom) {
      updateField('from', defaultFrom)
    }
  },
  { immediate: true }
)

onMounted(() => {
  loadAccountsTask.perform()
})

defineExpose({
  fromOptions,
  isLoading
})
</script>
