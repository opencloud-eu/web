import { defineStore } from 'pinia'
import { RawGroupwareConfig } from './types'
import { ref } from 'vue'

export const useGroupwareConfigStore = defineStore('groupwareConfig', () => {
  const version = ref<RawGroupwareConfig['version']>('')
  const capabilities = ref<RawGroupwareConfig['capabilities']>([])
  const limits = ref<RawGroupwareConfig['limits']>()
  const accounts = ref<RawGroupwareConfig['accounts']>([])
  const primaryAccounts = ref<RawGroupwareConfig['primaryAccounts']>({})

  const loadGroupwareConfig = (data: RawGroupwareConfig) => {
    version.value = data.version
    capabilities.value = data.capabilities || []
    limits.value = data.limits
    accounts.value = data.accounts || []
    primaryAccounts.value = data.primaryAccounts || {}
  }

  return {
    version,
    capabilities,
    limits,
    accounts,
    primaryAccounts,
    loadGroupwareConfig
  }
})

export type GroupwareConfigStore = ReturnType<typeof useGroupwareConfigStore>
