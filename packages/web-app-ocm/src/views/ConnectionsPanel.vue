<template>
  <div class="sciencemesh-app">
    <div>
      <div class="flex justify-between">
        <div class="flex items-center px-4 py-2">
          <oc-icon name="contacts-book" />
          <h2 class="px-2" v-text="$gettext('Federated connections')" />
          <oc-contextual-helper class="pl-1" v-bind="helperContent" />
        </div>
        <div id="shares-links" class="flex items-center flex-wrap mr-4 invisible md:visible">
          <label class="mr-2" v-text="$gettext('Federated shares:')" />
          <oc-button
            :aria-current="$gettext('Federated shares with me')"
            appearance="raw"
            class="p-2 mr-2"
            @click="toSharedWithMe"
          >
            <oc-icon name="share-forward" />
            <span v-text="$gettext('with me')" />
          </oc-button>
          <oc-button
            :aria-current="$gettext('Federated shares with me')"
            appearance="raw"
            class="p-2"
            @click="toSharedWithOthers"
          >
            <oc-icon name="reply" />
            <span v-text="$gettext('with others')" />
          </oc-button>
        </div>
      </div>
      <app-loading-spinner v-if="loading" />
      <template v-else>
        <no-content-message
          v-if="!connections?.length"
          id="accepted-invitations-empty"
          class="h-full"
          icon="contacts-book"
        >
          <template #message>
            <span v-text="$gettext('You have no sharing connections')" />
          </template>
        </no-content-message>
        <oc-table v-else :fields="fields" :data="connections" :highlighted="highlightedConnections">
          <template #actions="{ item }">
            <oc-button appearance="raw" class="p-2" @click="deleteConnection(item)">
              <oc-icon name="delete-bin-5" fill-type="line" size="medium" />
              <span v-text="$gettext('Delete')" />
            </oc-button>
          </template>
        </oc-table>
      </template>
    </div>
  </div>
</template>

<script lang="ts">
import { computed, defineComponent, PropType } from 'vue'
import {
  NoContentMessage,
  AppLoadingSpinner,
  useRouter,
  useClientService,
  useMessages,
  FederatedConnection
} from '@opencloud-eu/web-pkg'
import { useGettext } from 'vue3-gettext'
import { ShareTypes } from '@opencloud-eu/web-client'
import { buildConnection } from '../functions'
import { FieldType } from '@opencloud-eu/design-system/helpers'

export default defineComponent({
  components: {
    NoContentMessage,
    AppLoadingSpinner
  },
  props: {
    /**
     * Accepted connections
     */
    connections: {
      type: Array as PropType<FederatedConnection[]>,
      required: true
    },
    /**
     * Highlighted connections
     */
    highlightedConnections: {
      type: Array as PropType<string[]>,
      required: false,
      default: (): string[] => []
    },
    /**
     * Loading
     */
    loading: {
      type: Boolean,
      required: false,
      default: () => true
    }
  },
  emits: ['update:connections'],
  setup(props, { emit }) {
    const router = useRouter()
    const { $gettext } = useGettext()
    const clientService = useClientService()
    const { showErrorMessage } = useMessages()

    const fields = computed<FieldType[]>(() => {
      return [
        {
          name: 'display_name',
          title: $gettext('User'),
          alignH: 'left'
        },
        {
          name: 'mail',
          title: $gettext('Email'),
          alignH: 'right'
        },
        {
          name: 'idp',
          title: $gettext('Institution'),
          alignH: 'right'
        },
        {
          name: 'actions',
          title: $gettext('Actions'),
          type: 'slot',
          alignH: 'right',
          wrap: 'nowrap',
          width: 'shrink'
        }
      ]
    })

    const helperContent = computed(() => {
      return {
        text: $gettext(
          'Federated connections for mutual sharing. To share, go to "Files" app, select the resource, click "Share" in the context menu and select account type "federated".'
        ),
        title: $gettext('Federated connections')
      }
    })

    const toSharedWithMe = () => {
      router.push({ name: 'files-shares-with-me', query: { q_shareType: ShareTypes.remote.key } })
    }
    const toSharedWithOthers = () => {
      router.push({
        name: 'files-shares-with-others',
        query: { q_shareType: ShareTypes.remote.key }
      })
    }

    const deleteConnection = async (user: FederatedConnection) => {
      try {
        await clientService.httpAuthenticated.delete('/sciencemesh/delete-accepted-user', {
          data: { user_id: user.user_id, idp: user.idp }
        })

        const updatedConnections = props.connections.filter(
          ({ id }) => id !== buildConnection(user).id
        )

        emit('update:connections', updatedConnections)
      } catch (error) {
        console.error('Failed to delete connection:', error)
        showErrorMessage({
          title: $gettext('Error'),
          desc: $gettext('Failed to delete connection'),
          errors: [error]
        })
      }
    }

    return { helperContent, toSharedWithOthers, toSharedWithMe, fields, deleteConnection }
  }
})
</script>
