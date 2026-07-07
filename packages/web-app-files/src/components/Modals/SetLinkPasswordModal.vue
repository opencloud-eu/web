<template>
  <oc-text-input
    :model-value="password"
    :label="$gettext('Password')"
    type="password"
    :password-policy="inputPasswordPolicy"
    :generate-password-method="inputGeneratePasswordMethod"
    :placeholder="link.hasPassword ? '●●●●●●●●' : null"
    :error-message="errorMessage"
    class="oc-modal-body-input"
    required-mark
    @password-challenge-completed="$emit('update:confirmDisabled', false)"
    @password-challenge-failed="$emit('update:confirmDisabled', true)"
    @keydown.enter.prevent="onKeydownEnter"
    @update:model-value="onInput"
  />
</template>

<script setup lang="ts">
import { ref, unref } from 'vue'
import { useGettext } from 'vue3-gettext'
import { upperFirst } from 'lodash-es'
import {
  Modal,
  useClientService,
  useMessages,
  usePasswordPolicyService,
  useSharesStore
} from '@opencloud-eu/web-pkg'
import { isComposingEvent } from '@opencloud-eu/design-system/helpers'
import { LinkShare, Resource, SpaceResource } from '@opencloud-eu/web-client'

const {
  space,
  resource,
  link,
  callbackFn = undefined
} = defineProps<{
  modal: Modal
  space: SpaceResource
  resource: Resource
  link: LinkShare
  callbackFn?: () => void
}>()

const emit = defineEmits<{
  (e: 'confirm'): void
  (e: 'update:confirmDisabled', value: boolean): void
}>()

const { showMessage, showErrorMessage } = useMessages()
const clientService = useClientService()
const passwordPolicyService = usePasswordPolicyService()
const { $gettext } = useGettext()
const { updateLink } = useSharesStore()

const password = ref('')
const errorMessage = ref<string>()

emit('update:confirmDisabled', true)

const onKeydownEnter = (event: KeyboardEvent) => {
  if (isComposingEvent(event)) {
    return
  }
  emit('confirm')
}

const onInput = (value: string) => {
  password.value = value
  errorMessage.value = undefined

  if (!value) {
    emit('update:confirmDisabled', true)
  }
}

const onConfirm = async () => {
  try {
    await updateLink({
      clientService,
      space,
      resource,
      linkShare: link,
      options: { password: unref(password) }
    })
    if (callbackFn) {
      callbackFn()
      return
    }
    showMessage({ title: $gettext('Link was updated successfully') })
  } catch (e) {
    // Human-readable error message is provided, for example when password is on banned list
    if (e.response?.status === 400) {
      const errorMsg = e.response.data.error.message
      errorMessage.value = $gettext(upperFirst(errorMsg))
      return Promise.reject()
    }

    showErrorMessage({
      title: $gettext('Failed to update link'),
      errors: [e]
    })
  }
}

const inputPasswordPolicy = passwordPolicyService.getPolicy({ enforcePassword: true })
const inputGeneratePasswordMethod = () => passwordPolicyService.generatePassword()

defineExpose({ onConfirm })
</script>
