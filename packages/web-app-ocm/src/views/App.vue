<template>
  <div class="sciencemesh overflow-auto">
    <div class="flex flex-col h-full">
      <div class="grid grid-cols-1 md:grid-cols-2 h-auto max-h-auto md:max-h-[360px]">
        <div
          id="sciencemesh-invite"
          class="m-2 p-2 mb-0 lg:mb-2 bg-role-surface-container rounded-xl overflow-auto"
        >
          <outgoing-invitations />
        </div>
        <div
          id="sciencemesh-accept-invites"
          class="m-2 p-2 bg-role-surface-container rounded-xl overflow-auto"
        >
          <incoming-invitations @highlight-new-connections="highlightNewConnections" />
        </div>
      </div>
      <div id="sciencemesh-connections" class="p-2 bg-role-surface-container rounded-xl m-2 flex-1">
        <connections-panel
          v-model:connections="connections"
          :highlighted-connections="highlightedConnections.map((c) => c.id)"
          :loading="loadingConnections"
        />
      </div>
    </div>

    <invitation-acceptance-modal
      v-if="showInvitationModal"
      :show-modal="showInvitationModal"
      :token="invitationToken"
      :provider="invitationProvider"
      @highlight-new-connections="highlightNewConnections"
      @close="closeInvitationModal"
    />
  </div>
</template>

<script lang="ts">
import { defineComponent, onMounted, onUnmounted, ref, unref, Ref, computed, watch } from 'vue'
import ConnectionsPanel from './ConnectionsPanel.vue'
import IncomingInvitations from './IncomingInvitations.vue'
import OutgoingInvitations from './OutgoingInvitations.vue'
import InvitationAcceptanceModal from './InvitationAcceptanceModal.vue'
import {
  useClientService,
  useScrollTo,
  FederatedConnection,
  useMessages,
  useRoute,
  useRouter
} from '@opencloud-eu/web-pkg'
import { useGettext } from 'vue3-gettext'
import { buildConnection } from '../functions'

export default defineComponent({
  components: {
    IncomingInvitations,
    OutgoingInvitations,
    ConnectionsPanel,
    InvitationAcceptanceModal
  },
  setup() {
    const { showMessage } = useMessages()
    const { scrollToResource } = useScrollTo()
    const clientService = useClientService()
    const { $gettext } = useGettext()
    const route = useRoute()
    const router = useRouter()

    const connections: Ref<FederatedConnection[]> = ref([])
    const highlightedConnections: Ref<FederatedConnection[]> = ref([])
    const highlightNewConnectionsInterval = ref<ReturnType<typeof setInterval>>()
    const loadingConnections = ref(true)

    // Modal state for invitation acceptance
    const showInvitationModal = ref(false)
    const invitationToken = ref('')
    const invitationProvider = ref('')

    // Check if we're on the accept-invite route and show modal
    const isAcceptInviteRoute = computed(() => {
      return route.value.name === 'open-cloud-mesh-accept-invite'
    })

    // Watch for route changes to show modal
    watch(
      isAcceptInviteRoute,
      (isAcceptRoute) => {
        if (isAcceptRoute) {
          const token = route.value.query.token as string
          const provider = route.value.query.providerDomain as string

          if (token && provider) {
            invitationToken.value = token
            invitationProvider.value = provider
            showInvitationModal.value = true
          }
        }
      },
      { immediate: true }
    )

    const closeInvitationModal = () => {
      showInvitationModal.value = false
      invitationToken.value = ''
      invitationProvider.value = ''

      // Clear URL query parameters and navigate to invitations
      router.replace({ name: 'open-cloud-mesh-invitations' })
    }

    const findAcceptedUsers = async () => {
      try {
        const { data: acceptedUsers } = await clientService.httpAuthenticated.get<
          FederatedConnection[]
        >('/sciencemesh/find-accepted-users')
        loadingConnections.value = false
        connections.value = acceptedUsers.map(buildConnection)
      } catch {
        connections.value = []
        loadingConnections.value = false
      }
    }

    const highlightNewConnections = async () => {
      const oldConnections = [...unref(connections)]
      await findAcceptedUsers()
      if (oldConnections.length < unref(connections).length) {
        highlightedConnections.value = unref(connections).filter(
          (connection) => !oldConnections.map((c) => c.id).includes(connection.id)
        )
        if (unref(highlightedConnections).length === 1) {
          scrollToResource(unref(highlightedConnections)[0].id)
          showMessage({
            title: $gettext('New federated connection'),
            status: 'success',
            desc: $gettext('You can share with and receive shares from %{user} now', {
              user: unref(highlightedConnections)[0].display_name
            })
          })
        } else if (unref(highlightedConnections).length > 1) {
          const newConnections = unref(highlightedConnections)
            .map((c) => c.display_name)
            .join(', ')

          showMessage({
            title: $gettext('New federated connections'),
            status: 'success',
            desc: $gettext('You can share with and receive shares from %{ connections } now', {
              connections: newConnections
            })
          })
        }
      }
    }

    onMounted(async () => {
      await findAcceptedUsers()
      loadingConnections.value = false
      highlightNewConnectionsInterval.value = setInterval(() => {
        highlightNewConnections()
      }, 10 * 1000)
    })

    onUnmounted(() => {
      clearInterval(unref(highlightNewConnectionsInterval))
    })

    return {
      highlightNewConnections,
      connections,
      highlightedConnections,
      loadingConnections,
      showInvitationModal,
      invitationToken,
      invitationProvider,
      closeInvitationModal
    }
  }
})
</script>
