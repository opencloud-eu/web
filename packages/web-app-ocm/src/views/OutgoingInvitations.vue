<template>
  <div class="sciencemesh-app">
    <div>
      <div class="flex items-center px-4 pt-2">
        <oc-icon name="user-shared" />
        <h2 class="px-2" v-text="$gettext('Invite users')"></h2>
        <oc-contextual-helper class="pl-1" v-bind="helperContent" />
      </div>
      <div class="flex items-center justify-center p-4">
        <oc-button
          :aria-label="
            $gettext('Generate invitation link that can be shared with one or more invitees')
          "
          @click="openInviteModal"
        >
          <oc-icon name="add" />
          <span v-text="$gettext('Generate invitation')" />
        </oc-button>
      </div>
      <oc-modal
        v-if="showInviteModal"
        :title="$gettext('Generate new invitation')"
        :button-cancel-text="$gettext('Cancel')"
        :button-confirm-text="$gettext('Generate')"
        :button-confirm-disabled="!!descriptionErrorMessage"
        focus-trap-initial="#invite_token_description"
        @cancel="resetGenerateInviteToken"
        @confirm="generateToken"
      >
        <template #content>
          <form autocomplete="off" @submit.prevent="generateToken">
            <oc-text-input
              id="invite_token_description"
              v-model="formInput.description"
              class="mb-2"
              :error-message="descriptionErrorMessage"
              :label="$gettext('Add a description (optional)')"
              :clear-button-enabled="true"
              :description-message="
                !descriptionErrorMessage && `${formInput.description?.length || 0}/${50}`
              "
            />
            <input type="submit" class="hidden" />
          </form>
        </template>
      </oc-modal>
      <app-loading-spinner v-if="loading" />
      <template v-else>
        <no-content-message
          v-if="!sortedTokens.length"
          id="invite-tokens-empty"
          class="h-full"
          icon="user-shared"
        >
          <template #message>
            <span v-text="$gettext('You have no invitation links')" />
          </template>
        </no-content-message>
        <oc-table v-else :fields="fields" :data="sortedTokens" :highlighted="lastCreatedToken">
          <template #token="rowData">
            <div class="w-3xs flex">
              <div class="truncate max-w-full">
                <span class="truncate">{{ encodeInviteToken(rowData.item.token) }}</span>
              </div>
              <oc-button
                id="oc-sciencemesh-copy-token"
                v-oc-tooltip="$gettext('Copy invite token')"
                :aria-label="$gettext('Copy invite token')"
                appearance="raw"
                class="ml-2"
                @click="copyToken(rowData)"
              >
                <oc-icon name="file-copy" />
              </oc-button>
            </div>
          </template>
          <template #link="rowData">
            <a :href="rowData.item.link" v-text="$gettext('Link')" />
            <oc-button
              id="oc-sciencemesh-copy-link"
              v-oc-tooltip="$gettext('Copy invitation link')"
              :aria-label="$gettext('Copy invitation link')"
              appearance="raw"
              @click="copyLink(rowData)"
            >
              <oc-icon name="file-copy" />
            </oc-button>
          </template>
          <template #expiration="rowData">
            <span
              v-oc-tooltip="formatDate(rowData.item.expiration)"
              tabindex="0"
              v-text="formatDateRelative(rowData.item.expiration)"
            />
          </template>
        </oc-table>
      </template>
    </div>
  </div>
</template>

<script lang="ts">
import { computed, defineComponent, onMounted, ref, unref } from 'vue'
import {
  NoContentMessage,
  AppLoadingSpinner,
  useClientService,
  useMessages,
  formatDateFromJSDate,
  formatRelativeDateFromJSDate,
  useConfigStore
} from '@opencloud-eu/web-pkg'
import { useGettext } from 'vue3-gettext'
import { inviteListSchema, inviteSchema } from '../schemas'
import { FieldType } from '@opencloud-eu/design-system/helpers'

type Token = {
  id: string
  token: string
  link?: string
  expiration?: Date
  expirationSeconds?: number
  description?: string
}

export default defineComponent({
  components: {
    NoContentMessage,
    AppLoadingSpinner
  },
  setup() {
    const { showMessage, showErrorMessage } = useMessages()
    const clientService = useClientService()
    const configStore = useConfigStore()
    const { $gettext, current: currentLanguage } = useGettext()

    const lastCreatedToken = ref('')
    const showInviteModal = ref(false)
    const formInput = ref({
      description: ''
    })
    const tokens = ref<Token[]>([])
    const loading = ref(true)
    const descriptionErrorMessage = ref<string>()
    const fields = computed<FieldType[]>(() => {
      const haveLinks = unref(sortedTokens)[0]?.link

      return [
        haveLinks && {
          name: 'link',
          title: $gettext('Invitation link'),
          alignH: 'left',
          type: 'slot'
        },
        {
          name: 'token',
          title: $gettext('Invite token'),
          alignH: haveLinks ? 'right' : 'left',
          type: 'slot'
        },
        {
          name: 'description',
          title: $gettext('Description'),
          alignH: 'right'
        },
        {
          name: 'expiration',
          title: $gettext('Expires'),
          alignH: 'right',
          type: 'slot'
        }
      ].filter(Boolean) as FieldType[]
    })
    const sortedTokens = computed(() => {
      return [...unref(tokens)].sort((a, b) => (a.expirationSeconds < b.expirationSeconds ? 1 : -1))
    })
    const helperContent = computed(() => {
      return {
        text: $gettext(
          'Create an invitation link and send it to the person you want to share with.'
        ),
        title: $gettext('Invitation link')
      }
    })

    const encodeInviteToken = (token: string) => {
      const url = new URL(configStore.serverUrl)
      return btoa(`${token}@${url.host}`)
    }

    const generateToken = async () => {
      const { description } = unref(formInput)

      if (unref(descriptionErrorMessage)) {
        return
      }
      try {
        const { data: tokenInfo } = await clientService.httpAuthenticated.post(
          '/sciencemesh/generate-invite',
          {
            ...(description && { description })
          },
          {
            schema: inviteSchema
          }
        )

        if (tokenInfo.token) {
          tokens.value.push({
            id: tokenInfo.token,
            link: tokenInfo.invite_link,
            token: tokenInfo.token,
            ...(tokenInfo.expiration && {
              expiration: toDateTime(tokenInfo.expiration)
            }),
            ...(tokenInfo.expiration && {
              expirationSeconds: tokenInfo.expiration
            }),
            ...(tokenInfo.description && { description: tokenInfo.description })
          })
          showMessage({
            title: $gettext('Success'),
            status: 'success',
            desc: $gettext(
              'New token has been created and copied to your clipboard. Send it to the invitee(s).'
            )
          })

          const quickToken = encodeInviteToken(tokenInfo.token)
          lastCreatedToken.value = quickToken
          navigator.clipboard.writeText(quickToken)
        }
      } catch (error) {
        lastCreatedToken.value = ''
        errorPopup(error)
      } finally {
        resetGenerateInviteToken()
      }
    }

    const listTokens = async () => {
      const url = '/sciencemesh/list-invite'
      try {
        const { data } = await clientService.httpAuthenticated.get(url, {
          schema: inviteListSchema
        })
        data.forEach((t) => {
          tokens.value.push({
            id: t.token,
            token: t.token,
            ...(t.expiration && {
              expiration: toDateTime(t.expiration)
            }),
            ...(t.expiration && {
              expirationSeconds: t.expiration
            }),
            ...(t.description && { description: t.description })
          })
        })
      } catch (error) {
        console.log(error)
      } finally {
        loading.value = false
      }
    }

    const copyLink = (rowData: { item: { link: string; token: string } }) => {
      navigator.clipboard.writeText(rowData.item.link)
      showMessage({
        title: $gettext('Invition link copied'),
        desc: $gettext('Invitation link has been copied to your clipboard.')
      })
    }
    const copyToken = (rowData: { item: { link: string; token: string } }) => {
      navigator.clipboard.writeText(encodeInviteToken(rowData.item.token))
      showMessage({
        title: $gettext('Invite token copied'),
        desc: $gettext('Invite token has been copied to your clipboard.')
      })
    }
    const errorPopup = (error: Error) => {
      console.error(error)
      showErrorMessage({
        title: $gettext('Error'),
        desc: $gettext('An error occurred when generating the token'),
        errors: [error]
      })
    }

    const openInviteModal = () => {
      showInviteModal.value = true
    }

    const resetGenerateInviteToken = () => {
      showInviteModal.value = false
      formInput.value = {
        description: ''
      }
    }

    const toDateTime = (secs: number) => {
      const d = new Date(Date.UTC(1970, 0, 1))
      d.setUTCSeconds(secs)
      return d
    }

    onMounted(() => {
      listTokens()
    })

    const formatDate = (date: Date) => {
      return formatDateFromJSDate(date, currentLanguage)
    }
    const formatDateRelative = (date: Date) => {
      return formatRelativeDateFromJSDate(date, currentLanguage)
    }

    return {
      helperContent,
      openInviteModal,
      showInviteModal,
      descriptionErrorMessage,
      resetGenerateInviteToken,
      generateToken,
      formInput,
      loading,
      sortedTokens,
      copyToken,
      copyLink,
      lastCreatedToken,
      fields,
      formatDate,
      formatDateRelative,
      encodeInviteToken
    }
  }
})
</script>
