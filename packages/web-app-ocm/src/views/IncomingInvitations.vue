<template>
  <div id="incoming" class="sciencemesh-app">
    <div>
      <div class="flex items-center px-4 pt-2">
        <oc-icon name="user-received" />
        <h2 class="px-2" v-text="$gettext('Accept invitations')" />
        <oc-contextual-helper class="pl-1" v-bind="helperContent" />
      </div>
      <div class="flex flex-col items-center justify-center p-4">
        <div class="w-[50%]">
          <oc-text-input
            v-model="token"
            :label="$gettext('Enter invite token')"
            :clear-button-enabled="true"
            class="mb-2"
            @update:model-value="decodeInviteToken"
          />
          <div
            :class="{
              'oc-text-input-danger': providerError && token,
              'oc-text-input-success': provider
            }"
          >
            <span v-text="$gettext('Institution:')" />
            <span v-if="!token" v-text="'-'" />
            <span v-else-if="provider" v-text="provider" />
            <span v-else v-text="$gettext('invalid invite token')" />
          </div>
        </div>
        <oc-button
          size="small"
          :disabled="acceptInvitationButtonDisabled"
          class="mt-2"
          @click="acceptInvite"
        >
          <oc-icon name="add" />
          <span v-text="$gettext('Accept invitation')" />
        </oc-button>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { computed, defineComponent, ref, unref } from 'vue'
import { useClientService, useRoute, useRouter, useMessages } from '@opencloud-eu/web-pkg'
import { useGettext } from 'vue3-gettext'

export default defineComponent({
  emits: ['highlightNewConnections'],
  setup(props, { emit }) {
    const { showErrorMessage } = useMessages()
    const router = useRouter()
    const route = useRoute()
    const clientService = useClientService()
    const { $gettext } = useGettext()

    const token = ref<string>(undefined)
    const decodedToken = ref<string>(undefined)
    const provider = ref<string>(undefined)
    const providerError = ref(false)

    const helperContent = computed(() => {
      return {
        text: $gettext(
          'Once you accept the invitation, the inviter will be added to your connections.'
        ),
        title: $gettext('Accepting invitations')
      }
    })

    const acceptInvitationButtonDisabled = computed(() => {
      return !unref(decodedToken) || !unref(provider)
    })

    const errorPopup = (error: Error) => {
      console.error(error)
      showErrorMessage({
        title: $gettext('Error'),
        desc: $gettext('An error occurred'),
        errors: [error]
      })
    }
    const acceptInvite = async () => {
      try {
        await clientService.httpAuthenticated.post('/sciencemesh/accept-invite', {
          token: unref(decodedToken),
          providerDomain: unref(provider)
        })
        token.value = undefined
        provider.value = undefined

        const { token: currentToken, providerDomain, ...query } = unref(route).query
        router.replace({
          name: 'open-cloud-mesh-invitations',
          query
        })

        emit('highlightNewConnections')
      } catch (error) {
        errorPopup(error)
      }
    }

    const decodeInviteToken = (value: string) => {
      try {
        const decoded = atob(value)
        if (!decoded.includes('@')) {
          throw new Error()
        }
        const [token, serverUrl] = decoded.split('@')
        provider.value = serverUrl
        decodedToken.value = token
        providerError.value = false
      } catch (e) {
        provider.value = ''
        decodedToken.value = ''
        providerError.value = true
      }
    }

    return {
      helperContent,
      token,
      provider,
      providerError,
      acceptInvitationButtonDisabled,
      acceptInvite,
      decodeInviteToken
    }
  }
})
</script>
