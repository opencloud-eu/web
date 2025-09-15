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
        <oc-icon name="close" size="small" />
      </oc-button>
    </template>
  </oc-recipient>
</template>

<script lang="ts">
import { CollaboratorAutoCompleteItem, ShareTypes } from '@opencloud-eu/web-client'
import { computed, defineComponent, PropType } from 'vue'
import { Recipient } from '@opencloud-eu/design-system/helpers'
import { UserAvatar } from '@opencloud-eu/web-pkg'

export default defineComponent({
  components: { UserAvatar },
  props: {
    recipient: {
      type: Object as PropType<CollaboratorAutoCompleteItem>,
      required: true
    },
    deselect: {
      type: Function,
      required: false,
      default: null
    }
  },
  setup(props) {
    const externalIssuer = computed(() => {
      if (props.recipient.shareType === ShareTypes.remote.value) {
        return props.recipient.identities?.[0]?.issuer
      }
      return ''
    })

    return {
      externalIssuer,
      ShareTypes
    }
  },
  data(): { formattedRecipient: Recipient } {
    let name = this.recipient.displayName
    if (this.externalIssuer) {
      name += ` (${this.externalIssuer})`
    }

    return {
      formattedRecipient: {
        name,
        icon: this.getRecipientIcon()
      }
    }
  },

  computed: {
    btnDeselectRecipientLabel() {
      return this.$gettext('Deselect %{name}', { name: this.recipient.displayName })
    }
  },

  methods: {
    getRecipientIcon() {
      switch (this.recipient.shareType) {
        case ShareTypes.group.value:
          return {
            name: ShareTypes.group.icon,
            label: this.$gettext('Group')
          }

        case ShareTypes.guest.value:
          return {
            name: ShareTypes.guest.icon,
            label: this.$gettext('Guest user')
          }

        case ShareTypes.remote.value:
          return {
            name: ShareTypes.remote.icon,
            label: this.$gettext('External user')
          }

        default:
          return {
            name: ShareTypes.user.icon,
            label: this.$gettext('User')
          }
      }
    }
  }
})
</script>
