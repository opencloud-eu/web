<template>
  <div
    :data-testid="`recipient-autocomplete-item-${item.displayName}`"
    class="flex items-center py-1"
    :class="collaboratorClass"
  >
    <user-avatar
      v-if="isAnyUserShareType"
      class="mr-2"
      :user-id="item.id"
      :user-name="item.displayName"
    />
    <oc-avatar-item
      v-else
      :width="36"
      :name="shareTypeKey"
      :icon="shareTypeIcon"
      icon-size="medium"
      class="mr-2"
    />
    <div class="truncate">
      <span class="files-collaborators-autocomplete-username" v-text="item.displayName" />
      <template v-if="!isAnyPrimaryShareType">
        <span
          class="files-collaborators-autocomplete-share-type"
          v-text="`(${$gettext(shareType.label)})`"
        />
      </template>
      <div
        v-if="additionalInfo"
        class="files-collaborators-autocomplete-additionalInfo text-sm"
        v-text="`${additionalInfo}`"
      />
      <div
        v-if="externalIssuer"
        class="files-collaborators-autocomplete-externalIssuer text-sm"
        v-text="`${externalIssuer}`"
      />
    </div>
  </div>
</template>

<script lang="ts">
import { computed, PropType } from 'vue'
import { CollaboratorAutoCompleteItem, ShareTypes } from '@opencloud-eu/web-client'
import { UserAvatar } from '@opencloud-eu/web-pkg'

export default {
  name: 'AutocompleteItem',
  components: { UserAvatar },

  props: {
    item: {
      type: Object as PropType<CollaboratorAutoCompleteItem>,
      required: true
    }
  },
  setup(props) {
    const additionalInfo = computed(() => {
      return props.item.mail || props.item.onPremisesSamAccountName
    })

    const externalIssuer = computed(() => {
      if (props.item.shareType === ShareTypes.remote.value) {
        return props.item.identities?.[0]?.issuer
      }
      return ''
    })

    return { additionalInfo, externalIssuer }
  },
  computed: {
    shareType() {
      return ShareTypes.getByValue(this.item.shareType)
    },

    shareTypeIcon() {
      return this.shareType.icon
    },

    shareTypeKey() {
      return this.shareType.key
    },

    isAnyUserShareType() {
      return ShareTypes.user.key === this.shareType.key
    },

    isAnyPrimaryShareType() {
      return [ShareTypes.user.key, ShareTypes.group.key].includes(this.shareType.key)
    },

    collaboratorClass() {
      return `files-collaborators-search-${this.shareType.key}`
    }
  }
}
</script>
