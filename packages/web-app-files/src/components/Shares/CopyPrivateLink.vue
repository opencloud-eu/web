<template>
  <div class="flex items-center">
    <oc-button
      v-oc-tooltip="tooltip"
      gap-size="none"
      appearance="raw"
      no-hover
      @click="copyLinkToClipboard"
    >
      <oc-icon size="small" :name="copied ? 'checkbox-circle' : 'file-copy'" fill-type="line" />
      <span class="ml-1" v-text="$gettext('Permanent link')" />
    </oc-button>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { Resource } from '@opencloud-eu/web-client'
import { useGettext } from 'vue3-gettext'
import { useClipboard } from '@vueuse/core'
import { useMessages } from '@opencloud-eu/web-pkg'

const { resource } = defineProps<{ resource: Resource }>()
const { $gettext } = useGettext()
const { showMessage } = useMessages()
const { copy, copied } = useClipboard({ legacy: true, copiedDuring: 550 })

const copyLinkToClipboard = () => {
  copy(resource.privateLink)
  showMessage({
    title: $gettext('Permanent link copied'),
    desc: $gettext('The permanent link has been copied to your clipboard.')
  })
}

const tooltip = computed(() => {
  return $gettext(
    'Copy the link to point your team to this item. Works only for people with existing access.'
  )
})
</script>
