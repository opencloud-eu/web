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
  </div>
</template>

<script lang="ts">
import { defineComponent, onMounted, onUnmounted, ref, unref, Ref } from 'vue'
import ConnectionsPanel from './ConnectionsPanel.vue'
import IncomingInvitations from './IncomingInvitations.vue'
import OutgoingInvitations from './OutgoingInvitations.vue'
import {
  useClientService,
  useScrollTo,
  FederatedConnection,
  useMessages
} from '@opencloud-eu/web-pkg'
import { useGettext } from 'vue3-gettext'
import { buildConnection } from '../functions'

export default defineComponent({
  components: {
    IncomingInvitations,
    OutgoingInvitations,
    ConnectionsPanel
  },
  setup() {
    const { showMessage } = useMessages()
    const { scrollToResource } = useScrollTo()
    const clientSerivce = useClientService()
    const { $gettext } = useGettext()

    const connections: Ref<FederatedConnection[]> = ref([])
    const highlightedConnections: Ref<FederatedConnection[]> = ref([])
    const highlightNewConnectionsInterval = ref<ReturnType<typeof setInterval>>()
    const loadingConnections = ref(true)

    const findAcceptedUsers = async () => {
      try {
        const { data: acceptedUsers } = await clientSerivce.httpAuthenticated.get<
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
      loadingConnections
    }
  }
})
</script>
