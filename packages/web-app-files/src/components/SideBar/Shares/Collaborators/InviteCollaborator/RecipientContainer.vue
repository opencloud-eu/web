<template>
  <oc-recipient
    :data-testid="`recipient-container-${formattedRecipient.name}`"
    class="wrap-anywhere"
    :recipient="formattedRecipient"
  >
    <template #avatar>
      <user-avatar
        v-if="recipient.shareType === ShareTypes.user.value"
        :user-id="recipient.id"
        :user-name="recipient.displayName"
        :width="16.8"
      />
    </template>
    <template #append>
      <oc-button
        class="files-share-invite-recipient-btn-remove raw-hover-surface"
        appearance="raw"
        :aria-label="btnDeselectRecipientLabel"
        @click.stop="deselect(recipient)"
      >
        <oc-icon name="close" size-class="size-4" />
      </oc-button>
    </template>
  </oc-recipient>
</template>

<script setup lang="ts">
import { CollaboratorAutoCompleteItem, ShareTypes } from '@opencloud-eu/web-client'
import { computed, unref } from 'vue'
import { Recipient } from '@opencloud-eu/design-system/helpers'
import { UserAvatar } from '@opencloud-eu/web-pkg'
import { useGettext } from 'vue3-gettext'

const { recipient, deselect = undefined } = defineProps<{
  recipient: CollaboratorAutoCompleteItem
  deselect?: (recipient: CollaboratorAutoCompleteItem) => void
}>()

const { $gettext } = useGettext()

const externalIssuer = computed(() => {
  if (recipient.shareType === ShareTypes.remote.value) {
    return recipient.identities?.[0]?.issuer
  }
  return ''
})

const formattedRecipient = computed<Recipient>(() => {
  let name = unref(recipient).displayName
  if (externalIssuer.value) {
    name += ` (${externalIssuer.value})`
  }

  return {
    name,
    icon: getRecipientIcon()
  }
})

const btnDeselectRecipientLabel = computed(() => {
  return $gettext('Deselect %{name}', { name: recipient.displayName })
})

const getRecipientIcon = (): Recipient['icon'] => {
  switch (recipient.shareType) {
    case ShareTypes.group.value:
      return {
        name: ShareTypes.group.icon,
        label: $gettext('Group')
      }

    case ShareTypes.mail.value:
      return {
        name: ShareTypes.mail.icon,
        label: $gettext('Guest user')
      }

    case ShareTypes.contact.value:
      return {
        name: ShareTypes.contact.icon,
        label: $gettext('Contact')
      }

    case ShareTypes.remote.value:
      return {
        name: ShareTypes.remote.icon,
        label: $gettext('External user')
      }

    default:
      return {
        name: ShareTypes.user.icon,
        label: $gettext('User')
      }
  }
}
</script>
