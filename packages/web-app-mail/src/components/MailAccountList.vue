<template>
  <div>
    <oc-list>
      <li v-for="account in accounts" :key="account">
        <oc-avatar class="ml-1" :user-name="account.name" />
      </li>
    </oc-list>
  </div>
</template>

<script setup lang="ts">
import { urlJoin } from '@opencloud-eu/web-client'
import { AccountSchema, useClientService, useConfigStore } from '@opencloud-eu/web-pkg'
import { computed, onMounted, ref, unref } from 'vue'
import { useTask } from 'vue-concurrency'
import { z } from 'zod'
import { Account } from '../types'

const { account = {} } = defineProps<{
  account?: Account
}>()

const clientService = useClientService()
const configStore = useConfigStore()

const accounts = ref<Account[]>()

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
    const parsedData: Account[] = []
    Object.keys(data).forEach((key) => {
      parsedData.push(data[key])
    })
    console.log('Parsed Data: ', parsedData)
    accounts.value = z.array(AccountSchema).parse(parsedData)
  } catch (e) {
    console.error(e)
  }
})

onMounted(() => {
  loadMailAccountsTask.perform()
})
</script>
