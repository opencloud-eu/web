<template>
  <div id="oc-file-versions-sidebar">
    <div v-if="versions.length" class="ml-2">
      <oc-list class="oc-timeline">
        <li v-for="(item, index) in versions" :key="index">
          <div class="flex items-center justify-between gap-2">
            <div>
              <span
                class="block text-role-on-surface-variant text-sm leading-[1lh]"
                data-testid="file-versions-file-full-date"
                v-text="formatVersionDate(item)"
              />
              <div class="flex h-lh items-center gap-2 mt-1">
                <span
                  class="version-date font-semibold"
                  data-testid="file-versions-file-last-modified-date"
                  >{{ formatVersionDateRelative(item) }}</span
                >
                <span aria-hidden="true">·</span>
                <span data-testid="file-versions-file-size" v-text="formatVersionFileSize(item)" />
              </div>
            </div>
            <div class="flex shrink-0 items-center gap-2">
              <oc-button
                v-if="isRevertible"
                v-oc-tooltip="$gettext('Restore')"
                data-testid="file-versions-revert-button"
                appearance="raw"
                :aria-label="$gettext('Restore')"
                @click="revertToVersion(item)"
              >
                <oc-icon name="history" fill-type="line" />
              </oc-button>
              <oc-button
                v-oc-tooltip="$gettext('Download')"
                data-testid="file-versions-download-button"
                appearance="raw"
                :aria-label="$gettext('Download')"
                @click="downloadVersion(item)"
              >
                <oc-icon name="file-download" fill-type="line" />
              </oc-button>
            </div>
          </div>
        </li>
      </oc-list>
    </div>
    <div v-else>
      <p
        data-testid="file-versions-no-versions"
        v-text="$gettext('No versions available for this file')"
      />
    </div>
  </div>
</template>
<script setup lang="ts">
import {
  formatRelativeDateFromHTTP,
  formatDateFromJSDate,
  formatFileSize,
  useClientService,
  useDownloadFile,
  useResourcesStore
} from '@opencloud-eu/web-pkg'
import { computed, inject, Ref, unref } from 'vue'
import {
  GraphSharePermission,
  isProjectSpaceResource,
  isShareSpaceResource,
  Resource,
  SpaceResource
} from '@opencloud-eu/web-client'
import { useGettext } from 'vue3-gettext'

const { isReadOnly = false } = defineProps<{
  isReadOnly?: boolean
}>()

const clientService = useClientService()
const language = useGettext()
const { downloadFile } = useDownloadFile({ clientService })
const { updateResourceField } = useResourcesStore()

const space = inject<Ref<SpaceResource>>('space')
const resource = inject<Ref<Resource>>('resource')
const versions = inject<Ref<Resource[]>>('versions')

const isRevertible = computed(() => {
  if (isReadOnly) {
    return false
  }

  if (isShareSpaceResource(unref(space)) || isProjectSpaceResource(unref(space))) {
    return unref(space).graphPermissions.includes(GraphSharePermission.updateVersions)
  }

  return true
})

const revertToVersion = async (version: Resource) => {
  await clientService.webdav.restoreFileVersion(unref(space), unref(resource), version.name)
  const restoredResource = await clientService.webdav.getFileInfo(unref(space), unref(resource))

  const fieldsToUpdate = ['size', 'mdate'] as const
  for (const field of fieldsToUpdate) {
    if (Object.prototype.hasOwnProperty.call(unref(resource), field)) {
      updateResourceField({
        id: unref(resource).id,
        field: field,
        value: restoredResource[field]
      })
    }
  }
}
const downloadVersion = (version: Resource) => {
  return downloadFile(unref(space), unref(resource), version.name)
}
const formatVersionDateRelative = (version: Resource) => {
  return formatRelativeDateFromHTTP(version.mdate, language.current)
}
const formatVersionDate = (version: Resource) => {
  return formatDateFromJSDate(new Date(version.mdate), language.current)
}
const formatVersionFileSize = (version: Resource) => {
  return formatFileSize(version.size, language.current)
}
</script>
