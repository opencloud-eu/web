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

<script lang="ts">
import { defineComponent, PropType } from 'vue'
import { useMessages } from '@opencloud-eu/web-pkg'
import { useClipboard } from '@vueuse/core'
import { useGettext } from 'vue3-gettext'
import { LinkShare } from '@opencloud-eu/web-client'

export default defineComponent({
  name: 'CopyLink',
  props: {
    linkShare: {
      type: Object as PropType<LinkShare>,
      required: true
    }
  },
  setup(props) {
    const { $gettext } = useGettext()
    const { showMessage } = useMessages()

    const {
      copy,
      copied,
      isSupported: isClipboardCopySupported
    } = useClipboard({ legacy: true, copiedDuring: 550 })

    const copyLinkToClipboard = () => {
      copy(props.linkShare.webUrl)
      showMessage({
        title: props.linkShare.isQuickLink
          ? $gettext('The link has been copied to your clipboard.')
          : $gettext('The link "%{linkName}" has been copied to your clipboard.', {
              linkName: props.linkShare.displayName
            })
      })
    }

    return {
      copied,
      copyLinkToClipboard,
      isClipboardCopySupported
    }
  }
})
</script>
