<template>
  <div class="flex justify-center mt-4">
    <oc-list>
      <li v-for="account in accounts" :key="account.accountId">
        <oc-button v-oc-tooltip="account.name" no-hover appearance="raw">
          <oc-avatar :user-name="account.name" />
        </oc-button>
      </li>
    </oc-list>
  </div>
</template>

<script setup lang="ts">
import { urlJoin } from '@opencloud-eu/web-client'
import { useClientService, useConfigStore } from '@opencloud-eu/web-pkg'
import { computed, onMounted, ref, unref } from 'vue'
import { useTask } from 'vue-concurrency'
import { z } from 'zod'
import { MailAccount, MailAccountSchema } from '../types'

const { account = {} } = defineProps<{
  account?: MailAccount
}>()

const clientService = useClientService()
const configStore = useConfigStore()

const accounts = ref<MailAccount[]>()

const groupwareBaseUrl = computed(() => configStore.groupwareUrl)

const loadMailAccountsTask = useTask(function* (signal) {
  try {
    const { data } = yield clientService.httpAuthenticated.get(
      urlJoin(unref(groupwareBaseUrl), `accounts`),
      {
        signal
      }
    )
    console.log('Load Account (data):', data)
    accounts.value = z.array(MailAccountSchema).parse(data)
  } catch (e) {
    console.error(e)
  }
})

onMounted(() => {
  loadMailAccountsTask.perform()
})
</script>
