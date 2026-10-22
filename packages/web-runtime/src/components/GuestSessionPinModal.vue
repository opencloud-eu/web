<template>
  <p class="mt-0" v-text="$gettext('Enter the PIN from the email we sent you.')" />
  <oc-text-input
    id="guest-session-pin-input"
    v-model="pin"
    :label="$gettext('PIN')"
    :error-message="pinErrorMessage"
    :fix-message-line="true"
    autocomplete="one-time-code"
    inputmode="numeric"
    data-testid="guest-session-pin-input"
    @keydown.enter.prevent="onKeydownEnter"
  />
</template>

<script setup lang="ts">
import { computed, ref, unref, watch } from 'vue'
import { Modal } from '@opencloud-eu/web-pkg'
import { isComposingEvent } from '@opencloud-eu/design-system/helpers'
import { authService } from '../services/auth'
import { getGuestLinkErrorType, GuestLinkErrorType } from '../services/auth/guestSessionManager'
import { useGuestLinkErrorMessages } from '../composables/guestLink/useGuestLinkErrorMessages'

const { permissionId } = defineProps<{ modal: Modal; permissionId: string }>()

const emit = defineEmits<{
  (e: 'confirm'): void
  (e: 'update:confirmDisabled', value: boolean): void
}>()

const { getPinErrorMessage } = useGuestLinkErrorMessages()

const pin = ref('')
const pinErrorType = ref<GuestLinkErrorType>()
// a PIN pasted from the email might contain whitespace
const normalizedPin = computed(() => unref(pin).replace(/\s/g, ''))
const pinErrorMessage = computed(() => getPinErrorMessage(unref(pinErrorType)))

watch(
  normalizedPin,
  () => {
    emit('update:confirmDisabled', !unref(normalizedPin))
  },
  { immediate: true }
)

function onKeydownEnter(event: KeyboardEvent) {
  if (isComposingEvent(event)) {
    return
  }
  emit('confirm')
}

async function onConfirm() {
  pinErrorType.value = undefined
  try {
    await authService.refreshGuestSession(permissionId, unref(normalizedPin))
  } catch (error) {
    pinErrorType.value = getGuestLinkErrorType(error)
    console.error('guest session could not be refreshed:', unref(pinErrorType))
    // keeps the modal open to correct the PIN
    throw error
  }
}

defineExpose({ onConfirm })
</script>
