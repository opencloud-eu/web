<template>
  <oc-button
    v-if="isClipboardCopySupported"
    v-oc-tooltip="$gettext('Copy link to clipboard')"
    :aria-label="$gettext('Copy link to clipboard')"
    appearance="raw"
    class="oc-files-public-link-copy-url raw-hover-surface p-1"
    @click="copyLinkToClipboard"
  >
    <oc-icon :name="copied ? 'checkbox-circle' : 'file-copy'" fill-type="line" />
  </oc-button>
</template>

<script setup lang="ts">
import { useMessages } from '@opencloud-eu/web-pkg'
import { useClipboard } from '@vueuse/core'
import { useGettext } from 'vue3-gettext'
import { LinkShare } from '@opencloud-eu/web-client'

const { linkShare } = defineProps<{
  linkShare: LinkShare
}>()

const { $gettext } = useGettext()
const { showMessage } = useMessages()

const {
  copy,
  copied,
  isSupported: isClipboardCopySupported
} = useClipboard({ legacy: true, copiedDuring: 550 })

const copyLinkToClipboard = () => {
  copy(linkShare.webUrl)
  showMessage({
    title: linkShare.isQuickLink
      ? $gettext('The link has been copied to your clipboard.')
      : $gettext('The link "%{linkName}" has been copied to your clipboard.', {
          linkName: linkShare.displayName
        })
  })
}
</script>
