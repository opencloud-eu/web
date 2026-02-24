import { defineStore } from 'pinia'
import { computed, ref, unref } from 'vue'
import { MailAccount } from '../../types'
import { useRouteQuery } from '@opencloud-eu/web-pkg/src'

export const useAccountsStore = defineStore('accounts', () => {
  const currentAccountIdQuery = useRouteQuery('accountId')

  const accounts = ref<MailAccount[]>([])
  const currentAccountId = ref<string>()

  const currentAccount = computed(() =>
    unref(accounts).find((account) => account.accountId === unref(currentAccountId))
  )

  const setAccounts = (data: MailAccount[]) => {
    accounts.value = data
  }

  const upsertAccount = (data: MailAccount) => {
    const existing = unref(accounts).find(({ accountId }) => accountId === data.accountId)
    if (existing) {
      Object.assign(existing, data)
      return
    }
    unref(accounts).push(data)
  }

  const removeAccounts = (values: MailAccount[]) => {
    accounts.value = unref(accounts).filter(
      (account) => !values.find(({ accountId }) => accountId === account.accountId)
    )

    if (values.some((v) => v.accountId === unref(currentAccountId))) {
      currentAccountId.value = null
      currentAccountIdQuery.value = null
    }
  }

  const setCurrentAccount = (data: MailAccount) => {
    currentAccountId.value = data.accountId
    currentAccountIdQuery.value = data?.accountId
  }

  const updateAccountField = <T extends MailAccount>({
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

export type AccountsStore = ReturnType<typeof useAccountsStore>
