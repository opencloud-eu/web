import { computed, type ComputedRef } from 'vue'
import { storeToRefs } from 'pinia'
import { useCapabilityStore } from '@opencloud-eu/web-pkg'

type Caps = {
  graph?: { users?: { edit_login_allowed_disabled?: boolean } }
}

export function useAdminUsersFlags(): {
  isLoginToggleHidden: ComputedRef<boolean>
} {
  const capabilityStore = useCapabilityStore()
  const { capabilities } = storeToRefs(capabilityStore)

  const isLoginToggleHidden = computed<boolean>(() => {
    return (capabilities.value as Caps)?.graph?.users?.edit_login_allowed_disabled === true
  })

  return { isLoginToggleHidden }
}
