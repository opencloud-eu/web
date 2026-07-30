<template>
  <div
    v-if="isVisible"
    class="announcement flex items-center gap-3 px-4 py-2 bg-amber-400 text-amber-950"
    role="status"
  >
    <button
      v-if="hasInfo"
      type="button"
      class="grow flex items-center justify-center gap-2 min-w-0 cursor-pointer text-amber-950"
      aria-haspopup="dialog"
      @click="openModal"
    >
      <oc-icon
        name="information"
        fill-type="line"
        size="small"
        color="var(--color-amber-950)"
        class="shrink-0"
      />
      <span
        class="text-sm font-medium underline-offset-2 hover:underline truncate"
        v-text="bannerText"
      />
    </button>
    <div v-else class="grow flex items-center justify-center gap-2 min-w-0">
      <oc-icon
        name="error-warning"
        fill-type="line"
        size="small"
        color="var(--color-amber-950)"
        class="shrink-0"
      />
      <span class="text-sm font-medium truncate" v-text="bannerText" />
    </div>
    <oc-button
      appearance="raw"
      no-hover
      class="shrink-0"
      :aria-label="$gettext('Dismiss announcement')"
      @click="dismissed = true"
    >
      <oc-icon name="close" fill-type="line" color="var(--color-amber-950)" />
    </oc-button>
  </div>
</template>

<script setup lang="ts">
import { computed, markRaw, ref, unref, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { useConfigStore, useModals } from '@opencloud-eu/web-pkg'
import { useGettext } from 'vue3-gettext'
import AnnouncementModal from './AnnouncementModal.vue'

const { $gettext } = useGettext()

const configStore = useConfigStore()
const { options } = storeToRefs(configStore)
const { dispatchModal } = useModals()

// dismissal is intentionally not persisted, so the banner reappears on reload
const dismissed = ref(false)

const announcement = computed(() => unref(options).announcement)
const bannerText = computed(() => unref(announcement)?.bannerText)
const infoText = computed(() => unref(announcement)?.infoText)
const hasInfo = computed(() => !!unref(infoText))
const isVisible = computed(() => !!unref(bannerText) && !unref(dismissed))

// a new or changed announcement (e.g. a fresh preview) should show again, even after a dismiss
watch(announcement, () => {
  dismissed.value = false
})

function openModal() {
  dispatchModal({
    title: unref(bannerText) || $gettext('Announcement'),
    customComponent: markRaw(AnnouncementModal),
    customComponentAttrs: () => ({ infoText: unref(infoText) }),
    confirmText: $gettext('Close'),
    hideCancelButton: true
  })
}
</script>
