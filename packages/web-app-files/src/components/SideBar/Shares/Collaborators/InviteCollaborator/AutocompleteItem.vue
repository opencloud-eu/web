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
      <span class="files-collaborators-autocomplete-username">
        <oc-filter-highlight :text="item.displayName" :term="term" />
      </span>
      <template v-if="!isAnyPrimaryShareType">
        <span
          class="files-collaborators-autocomplete-share-type"
          v-text="`(${$gettext(shareType.label)})`"
        />
      </template>
      <div v-if="additionalInfo" class="files-collaborators-autocomplete-additionalInfo text-sm">
        <oc-filter-highlight :text="additionalInfo" :term="term" />
      </div>
      <div v-if="externalIssuer" class="files-collaborators-autocomplete-externalIssuer text-sm">
        <oc-filter-highlight :text="externalIssuer" :term="term" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, unref } from 'vue'
import { CollaboratorAutoCompleteItem, ShareTypes } from '@opencloud-eu/web-client'
import { UserAvatar } from '@opencloud-eu/web-pkg'
import { OcFilterHighlight } from '@opencloud-eu/design-system/components'

const { item, term = '' } = defineProps<{
  item: CollaboratorAutoCompleteItem
  term?: string
}>()

const additionalInfo = computed(() => {
  return item.mail || item.onPremisesSamAccountName
})

const externalIssuer = computed(() => {
  if (item.shareType === ShareTypes.remote.value) {
    return item.identities?.[0]?.issuer
  }
  return ''
})

const shareType = computed(() => {
  return ShareTypes.getByValue(item.shareType)
})
const shareTypeIcon = computed(() => {
  return unref(shareType).icon
})
const shareTypeKey = computed(() => {
  return unref(shareType).key
})
const isAnyUserShareType = computed(() => {
  return ShareTypes.user.key === unref(shareTypeKey)
})
const isAnyPrimaryShareType = computed(() => {
  return [ShareTypes.user.key, ShareTypes.group.key].includes(unref(shareTypeKey))
})
const collaboratorClass = computed(() => {
  return `files-collaborators-search-${unref(shareTypeKey)}`
})
</script>
