<template>
  <oc-modal
    v-if="showModal"
    :title="$gettext('Accept Invitation')"
    :button-cancel-text="$gettext('Decline')"
    :button-confirm-text="$gettext('Accept')"
    :button-confirm-disabled="acceptButtonDisabled"
    @cancel="declineInvitation"
    @confirm="acceptInvitation"
  >
    <template #content>
      <div class="min-h-[200px]">
        <div v-if="loading" class="text-center p-4">
          <app-loading-spinner />
          <p class="mt-2" v-text="$gettext('Processing invitation...')" />
        </div>

        <div v-else class="p-4">
          <div class="flex items-center mb-4">
            <oc-icon name="user-received" size-class="size-8" class="mr-4" />
            <div>
              <h3 v-text="$gettext('You have received an invitation')" />
              <p
                class="text-muted"
                v-text="$gettext('Accept this invitation to establish a federated connection.')"
              />
            </div>
          </div>

          <div class="invitation-details p-4 rounded-lg border bg-role-surface-container-highest">
            <div class="mb-2">
              <strong v-text="$gettext('From Institution:')" />
              <span class="ml-2" v-text="provider" />
            </div>
            <div class="text-sm text-muted">
              <span v-text="$gettext('Token:')" />
              <span class="ml-2 font-mono" v-text="token" />
            </div>
          </div>
        </div>
      </div>
    </template>
  </oc-modal>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { AppLoadingSpinner } from '@opencloud-eu/web-pkg'
import { useInvitationAcceptance } from '../composables/useInvitationAcceptance'

const { showModal, token, provider } = defineProps<{
  showModal: boolean
  token: string
  provider: string
}>()

const emit = defineEmits<{
  (e: 'highlightNewConnections'): void
  (e: 'close'): void
}>()

const {
  loading,
  acceptInvitation: acceptInvitationAPI,
  validateParameters
} = useInvitationAcceptance()

const acceptButtonDisabled = computed(() => {
  return loading.value || !token || !provider
})

const acceptInvitation = async () => {
  try {
    validateParameters(token, provider)

    await acceptInvitationAPI(token, provider)

    emit('highlightNewConnections')
    emit('close')
  } catch (err) {
    console.error('Error accepting invitation:', err)
    emit('close')
  }
}

const declineInvitation = () => {
  emit('close')
}
</script>
