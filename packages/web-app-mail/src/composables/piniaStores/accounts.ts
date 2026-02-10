import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import type { MailAccount } from '../../types'
import { useRouteQueryId } from './helpers'

export const useAccountsStore = defineStore('mail-accounts', () => {
  const accounts = ref<MailAccount[]>([])

  const currentAccountId = useRouteQueryId('accountId')

  const currentAccount = computed(() => {
    const id = currentAccountId.value
    return accounts.value.find((a) => a.accountId === id)
  })

  const setAccounts = (list: MailAccount[]) => {
    accounts.value = list ?? []

    const hasAccounts = accounts.value.length > 0
    const hasValidCurrent = !!currentAccount.value

    if (!hasValidCurrent) {
      if (hasAccounts) {
        currentAccountId.value = accounts.value[0].accountId
      } else {
        currentAccountId.value = ''
      }
    }
  }

  const setCurrentAccount = (account: MailAccount | null) => {
    currentAccountId.value = account?.accountId ?? ''
  }

  return {
    accounts,
    currentAccountId,
    currentAccount,
    setAccounts,
    setCurrentAccount
  }
})
