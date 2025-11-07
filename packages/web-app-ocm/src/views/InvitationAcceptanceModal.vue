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
      <div class="invitation-acceptance-content">
        <div v-if="loading" class="text-center p-4">
          <app-loading-spinner />
          <p class="mt-2" v-text="$gettext('Processing invitation...')" />
        </div>

        <div v-else class="p-4">
          <div class="flex items-center mb-4">
            <oc-icon name="user-received" size="large" class="mr-4" />
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

<script lang="ts">
import { computed, defineComponent } from 'vue'
import { AppLoadingSpinner } from '@opencloud-eu/web-pkg'
import { useInvitationAcceptance } from '../composables/useInvitationAcceptance'

export default defineComponent({
  components: {
    AppLoadingSpinner
  },
  props: {
    showModal: {
      type: Boolean,
      required: true
    },
    token: {
      type: String,
      required: true
    },
    provider: {
      type: String,
      required: true
    }
  },
  emits: ['highlightNewConnections', 'close'],
  setup(props, { emit }) {
    const {
      loading,
      acceptInvitation: acceptInvitationAPI,
      validateParameters
    } = useInvitationAcceptance()

    const acceptButtonDisabled = computed(() => {
      return loading.value || !props.token || !props.provider
    })

    const acceptInvitation = async () => {
      try {
        validateParameters(props.token, props.provider)

        await acceptInvitationAPI(props.token, props.provider)

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

    return {
      loading,
      acceptButtonDisabled,
      acceptInvitation,
      declineInvitation
    }
  }
})
</script>

<style lang="scss" scoped>
.invitation-acceptance-content {
  min-height: 200px;
}
</style>
