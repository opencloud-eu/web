<template>
  <dt>{{ $gettext('WebDAV path') }}</dt>
  <dd class="flex">
    <div v-oc-tooltip="webDavPath" class="truncate" v-text="webDavPath" />
    <oc-button
      v-oc-tooltip="$gettext('Copy WebDAV path')"
      class="ml-2"
      appearance="raw"
      size="small"
      :aria-label="$gettext('Copy WebDAV path to clipboard')"
      no-hover
      @click="copyWebDAVPathToClipboard"
    >
      <oc-icon :name="copyWebDAVPathIcon" />
    </oc-button>
  </dd>
  <dt>{{ $gettext('WebDAV URL') }}</dt>
  <dd class="flex">
    <div v-oc-tooltip="webDavUrl" class="truncate" v-text="webDavUrl" />
    <oc-button
      v-oc-tooltip="$gettext('Copy WebDAV URL')"
      class="ml-2"
      appearance="raw"
      size="small"
      :aria-label="$gettext('Copy WebDAV URL to clipboard')"
      no-hover
      @click="copyWebDAVUrlToClipboard"
    >
      <oc-icon :name="copyWebDAVUrlIcon" />
    </oc-button>
    <oc-hidden-announcer
      :announcement="copiedAnnouncement"
      :announcement-key="copiedAnnouncementKey"
    />
  </dd>
</template>

<script setup lang="ts">
import { inject, ref, Ref, computed, unref } from 'vue'
import { Resource, SpaceResource } from '@opencloud-eu/web-client'
import { encodePath } from '../../utils'
import { useGettext } from 'vue3-gettext'

const { space } = defineProps<{
  space: SpaceResource
}>()

const resource = inject<Ref<Resource>>('resource')
const { $gettext } = useGettext()
const copiedIcon = 'check'
const copyIcon = 'file-copy'
const copyWebDAVPathIcon = ref(copyIcon)
const copyWebDAVUrlIcon = ref(copyIcon)
const copiedAnnouncement = ref('')
const copiedAnnouncementKey = ref(0)

const webDavPath = computed(() => {
  return encodePath(unref(resource).webDavPath)
})
const webDavUrl = computed(() => {
  return space?.getWebDavUrl({ path: unref(resource).path })
})

function announceCopied() {
  copiedAnnouncement.value = $gettext('Copied to clipboard!')
  copiedAnnouncementKey.value++
}

const copyWebDAVPathToClipboard = () => {
  navigator.clipboard.writeText(unref(webDavPath))
  copyWebDAVPathIcon.value = copiedIcon
  announceCopied()
  setTimeout(() => (copyWebDAVPathIcon.value = copyIcon), 1500)
}

const copyWebDAVUrlToClipboard = () => {
  navigator.clipboard.writeText(unref(webDavUrl))
  copyWebDAVUrlIcon.value = copiedIcon
  announceCopied()
  setTimeout(() => (copyWebDAVUrlIcon.value = copyIcon), 1500)
}
</script>
