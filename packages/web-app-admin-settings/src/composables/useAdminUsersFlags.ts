import { computed, type ComputedRef } from 'vue'
import { storeToRefs } from 'pinia'
import { useCapabilityStore } from '@opencloud-eu/web-pkg'

type Caps = {
  graph?: { users?: { read_only_attributes?: string[] } }
}

export function useAdminUsersFlags(): {
  isLoginToggleHidden: ComputedRef<boolean>
} {
  const capabilityStore = useCapabilityStore()
  const { capabilities } = storeToRefs(capabilityStore)

  const readOnlyAttrs = computed<string[]>(
    () => (capabilities.value as Caps)?.graph?.users?.read_only_attributes ?? []
  )

  const isLoginToggleHidden = computed<boolean>(() => {
    const lc = readOnlyAttrs.value.map((s) => s.trim().toLowerCase())
    return lc.includes('accountenabled') || lc.includes('user.accountenabled')
  })
  console.log('isLoginToggleHidden', isLoginToggleHidden.value, readOnlyAttrs.value)

  return { isLoginToggleHidden }
}
