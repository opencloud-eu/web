import { defineStore } from 'pinia'
import { computed, ref, unref } from 'vue'
import { GroupwareAccount } from './types'
import { useRouteQuery } from '../../router'

export const useGroupwareAccountsStore = defineStore('accounts', () => {
  const currentAccountIdQuery = useRouteQuery('accountId')

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
      currentAccountIdQuery.value = null
    }
  }

  const setCurrentAccount = (data: GroupwareAccount) => {
    currentAccountId.value = data.accountId
    currentAccountIdQuery.value = data?.accountId
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
    currentAccountIdQuery.value = null
  }

  return {
    accounts,
    currentAccount,
    updateAccountField,
    setAccounts,
    upsertAccount,
    removeAccounts,
    setCurrentAccount,
    reset
  }
})

export type GroupwareAccountsStore = ReturnType<typeof useGroupwareAccountsStore>
