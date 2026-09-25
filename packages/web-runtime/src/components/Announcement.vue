<template>
  <div
    v-if="isVisible"
    class="announcement flex items-stretch gap-3 px-4 bg-amber-400 text-amber-950"
    role="status"
  >
    <button
      v-if="hasInfo"
      type="button"
      class="announcement-text grow flex items-center gap-2 min-w-0 py-2 cursor-pointer text-amber-950"
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
      <span class="text-sm font-bold truncate" v-text="bannerText" />
      <span
        class="announcement-details ml-auto shrink-0 flex items-center gap-1 text-sm font-medium"
      >
        <span v-text="$gettext('Details')" />
        <oc-icon
          name="arrow-right-s"
          fill-type="line"
          size="small"
          color="var(--color-amber-950)"
        />
      </span>
    </button>
    <div v-else class="announcement-text grow flex items-center gap-2 min-w-0 py-2">
      <oc-icon
        name="error-warning"
        fill-type="line"
        size="small"
        color="var(--color-amber-950)"
        class="shrink-0"
      />
      <span class="text-sm font-bold truncate" v-text="bannerText" />
    </div>
    <span v-if="hasInfo" class="shrink-0 self-center w-px h-4 bg-amber-950" aria-hidden="true" />
    <oc-button
      appearance="raw"
      no-hover
      class="announcement-dismiss shrink-0 self-center"
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
    title: $gettext('Announcement'),
    customComponent: markRaw(AnnouncementModal),
    customComponentAttrs: () => ({ title: unref(bannerText), infoText: unref(infoText) }),
    hideActions: true
  })
}
</script>
