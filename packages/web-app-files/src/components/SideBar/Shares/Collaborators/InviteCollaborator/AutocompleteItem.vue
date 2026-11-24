<template>
  <div
    :data-testid="`recipient-autocomplete-item-${item.displayName}`"
    class="flex items-center py-1"
    :class="collaboratorClass"
  >
    <user-avatar
      v-if="isAnyUserShareType"
      class="me-2"
      :user-id="item.id"
      :user-name="item.displayName"
    />
    <oc-avatar-item
      v-else
      :width="36"
      :name="shareTypeKey"
      :icon="shareTypeIcon"
      icon-size="medium"
      class="me-2"
    />
    <div class="truncate">
      <div class="flex gap-1">
        <span class="files-collaborators-autocomplete-username truncate min-w-0" :title="title">
          <oc-filter-highlight :text="item.displayName" :term="term" />
        </span>
        <span v-if="shareTypeLabel || hint" class="shrink-0">
          <span
            v-if="shareTypeLabel"
            class="files-collaborators-autocomplete-share-type"
            v-text="`(${shareTypeLabel})`"
          />
          <span
            v-if="hint"
            class="files-collaborators-autocomplete-hint ms-1"
            v-text="`(${hint})`"
          />
        </span>
      </div>
      <div
        v-if="additionalInfo"
        class="files-collaborators-autocomplete-additionalInfo text-sm truncate"
        :title="additionalInfo"
      >
        <oc-filter-highlight :text="additionalInfo" :term="term" />
      </div>
      <div
        v-if="externalIssuer"
        class="files-collaborators-autocomplete-externalIssuer text-sm truncate"
        :title="externalIssuer"
      >
        <oc-filter-highlight :text="externalIssuer" :term="term" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, unref } from 'vue'
import { useGettext } from 'vue3-gettext'
import { CollaboratorAutoCompleteItem, ShareTypes } from '@opencloud-eu/web-client'
import { UserAvatar } from '@opencloud-eu/web-pkg'
import { OcFilterHighlight } from '@opencloud-eu/design-system/components'

const {
  item,
  term = '',
  hint = ''
} = defineProps<{
  item: CollaboratorAutoCompleteItem
  term?: string
  hint?: string
}>()

const { $gettext } = useGettext()

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
const shareTypeLabel = computed(() => {
  if (unref(isAnyPrimaryShareType)) {
    return ''
  }
  return $gettext(unref(shareType).label)
})
const title = computed(() => {
  return [
    item.displayName,
    unref(shareTypeLabel) && `(${unref(shareTypeLabel)})`,
    hint && `(${hint})`
  ]
    .filter(Boolean)
    .join(' ')
})
const collaboratorClass = computed(() => {
  return `files-collaborators-search-${unref(shareTypeKey)}`
})
</script>
