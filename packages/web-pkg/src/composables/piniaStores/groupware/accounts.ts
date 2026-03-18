import { defineStore } from 'pinia'
import { computed, ref, unref } from 'vue'
import { AccountSchema, GroupwareAccount } from './types'
import { useTask } from 'vue-concurrency'
import { urlJoin } from '@opencloud-eu/web-client'
import z from 'zod'
import { useConfigStore } from '../config'
import { HttpClient } from '../../../http'

export const useGroupwareAccountsStore = defineStore('accounts', () => {
  const configStore = useConfigStore()

  const accounts = ref<GroupwareAccount[]>([])
  const currentAccountId = ref<string>()

  const currentAccount = computed(() =>
    unref(accounts).find((account) => account.accountId === unref(currentAccountId))
  )

  const setAccounts = (data: GroupwareAccount[]) => {
    accounts.value = data
  }

  const upsertAccount = (data: GroupwareAccount) => {
    const existing = unref(accounts).find(({ accountId }) => accountId === data.accountId)
    if (existing) {
      Object.assign(existing, data)
      return
    }
    unref(accounts).push(data)
  }

  const removeAccounts = (values: GroupwareAccount[]) => {
    accounts.value = unref(accounts).filter(
      (account) => !values.find(({ accountId }) => accountId === account.accountId)
    )

    if (values.some((v) => v.accountId === unref(currentAccountId))) {
      currentAccountId.value = null
    }
  }

  const setCurrentAccount = (data: GroupwareAccount) => {
    currentAccountId.value = data.accountId
  }

  const updateAccountField = <T extends GroupwareAccount>({
    id,
    field,
    value
  }: {
    id: T['accountId']
    field: keyof T
    value: T[keyof T]
  }) => {
    const account = unref(accounts).find((account) => id === account.accountId) as T
    if (account) {
      account[field] = value
    }
  }

  const reset = () => {
    accounts.value = []
    currentAccountId.value = null
  }

  const isLoading = computed(() => loadAccountsTask.isRunning ?? false)

  const loadAccountsTask = useTask(function* (signal, client: HttpClient) {
    try {
      const { data } = yield client.get(urlJoin(configStore.groupwareUrl, `accounts`), { signal })
      const accounts = z.array(AccountSchema).parse(data)
      setAccounts(accounts)
      return accounts
    } catch (e) {
      console.error('Failed to load accounts:', e)
      throw e
    }
  }).restartable()

  const loadAccounts = async (client: HttpClient) => {
    return await loadAccountsTask.perform(client)
  }

  // loads accounts if not already loaded and sets the current account based on the provided query or defaults to the first account
  const loadCurrentAccount = async ({ client, query }: { client: HttpClient; query?: string }) => {
    if (!unref(accounts).length) {
      await loadAccounts(client)
    }

    let queryAccount: GroupwareAccount | undefined
    if (query) {
      queryAccount = unref(accounts).find(({ accountId }) => accountId === query)
    }

    setCurrentAccount(queryAccount || unref(accounts)[0])
  }

  return {
    accounts,
    currentAccount,
    updateAccountField,
    setAccounts,
    upsertAccount,
    removeAccounts,
    setCurrentAccount,
    reset,
    loadAccounts,
    loadCurrentAccount,
    isLoading
  }
})

export type GroupwareAccountsStore = ReturnType<typeof useGroupwareAccountsStore>
