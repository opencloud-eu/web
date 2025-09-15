<template>
  <div id="oc-file-versions-sidebar">
    <div v-if="versions.length" class="ml-2">
      <oc-list class="oc-timeline">
        <li v-for="(item, index) in versions" :key="index">
          <div>
            <span
              v-oc-tooltip="formatVersionDate(item)"
              class="version-date font-semibold"
              data-testid="file-versions-file-last-modified-date"
              >{{ formatVersionDateRelative(item) }}</span
            >
            -
            <span data-testid="file-versions-file-size">{{ formatVersionFileSize(item) }}</span>
          </div>
          <oc-button
            v-if="isRevertible"
            data-testid="file-versions-revert-button"
            appearance="raw"
            justify-content="left"
            :aria-label="$gettext('Restore')"
            class="w-full rounded-sm oc-button-justify-content-left oc-button-gap-m py-2 px-4"
            @click="revertToVersion(item)"
          >
            <oc-icon name="history" class="oc-icon-m mr-2 -mt-1" fill-type="line" />
            {{ $gettext('Restore') }}
          </oc-button>
          <oc-button
            data-testid="file-versions-download-button"
            justify-content="left"
            appearance="raw"
            :aria-label="$gettext('Download')"
            class="w-full rounded-sm c-button-gap-m py-2 px-4"
            @click="downloadVersion(item)"
          >
            <oc-icon name="file-download" class="oc-icon-m mr-2" fill-type="line" />
            {{ $gettext('Download') }}
          </oc-button>
        </li>
      </oc-list>
    </div>
    <div v-else>
      <p v-translate data-testid="file-versions-no-versions">No versions available for this file</p>
    </div>
  </div>
</template>
<script lang="ts">
import { DavPermission } from '@opencloud-eu/web-client/webdav'
import {
  formatRelativeDateFromHTTP,
  formatDateFromJSDate,
  formatFileSize,
  useClientService,
  useDownloadFile,
  useResourcesStore
} from '@opencloud-eu/web-pkg'
import { computed, defineComponent, inject, Ref, unref } from 'vue'
import { isShareSpaceResource, Resource, SpaceResource } from '@opencloud-eu/web-client'
import { useGettext } from 'vue3-gettext'

export default defineComponent({
  name: 'FileVersions',
  props: {
    isReadOnly: {
      type: Boolean,
      required: false,
      default: false
    }
  },
  setup(props) {
    const clientService = useClientService()
    const language = useGettext()
    const { downloadFile } = useDownloadFile({ clientService })
    const { updateResourceField } = useResourcesStore()

    const space = inject<Ref<SpaceResource>>('space')
    const resource = inject<Ref<Resource>>('resource')
    const versions = inject<Ref<Resource[]>>('versions')

    const isRevertible = computed(() => {
      if (props.isReadOnly) {
        return false
      }

      if (isShareSpaceResource(unref(space)) || unref(resource).isReceivedShare()) {
        if (unref(resource).permissions !== undefined) {
          return unref(resource).permissions.includes(DavPermission.Updateable)
        }
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

    return {
      space,
      resource,
      versions,
      isRevertible,
      revertToVersion,
      downloadVersion,
      formatVersionDateRelative,
      formatVersionDate,
      formatVersionFileSize
    }
  }
})
</script>
