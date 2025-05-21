<template>
  <div>
    <input
      id="space-image-upload-input"
      ref="spaceImageInput"
      type="file"
      name="file"
      tabindex="-1"
      :accept="supportedSpaceImageMimeTypes"
      @change="showModalImageSpace"
    />
    <oc-list id="oc-spaces-actions-sidebar" class-name="oc-mt-s">
      <action-menu-item
        v-for="(action, index) in actions"
        :key="`action-${index}`"
        :action="action"
        :action-options="actionOptions"
        class="oc-rounded"
      />
    </oc-list>
  </div>
</template>

<script lang="ts">
import { computed, defineComponent, inject, Ref, ref, unref, VNodeRef } from 'vue'
import { Resource, SpaceResource } from '@opencloud-eu/web-client'
import {
  ActionMenuItem,
  FileActionOptions,
  SpaceActionOptions,
  useSpaceActionsSetIcon
} from '@opencloud-eu/web-pkg'
import { usePreviewService } from '@opencloud-eu/web-pkg'
import {
  useSpaceActionsDelete,
  useSpaceActionsDisable,
  useSpaceActionsDuplicate,
  useSpaceActionsEditDescription,
  useSpaceActionsEditQuota,
  useSpaceActionsEditReadmeContent,
  useSpaceActionsRename,
  useSpaceActionsRestore
} from '@opencloud-eu/web-pkg'
import { useSpaceActionsUploadImage } from '../../../composables'
import { useFileActionsDownloadArchive } from '@opencloud-eu/web-pkg'

export default defineComponent({
  name: 'SpaceActions',
  components: { ActionMenuItem },
  setup() {
    const previewService = usePreviewService()
    const resource = inject<Ref<SpaceResource>>('resource')
    const actionOptions = computed((): SpaceActionOptions & FileActionOptions<Resource> => ({
      space: undefined,
      resources: [unref(resource)]
    }))

    const spaceImageInput: VNodeRef = ref(null)
    const supportedSpaceImageMimeTypes = computed(() => {
      return previewService.getSupportedMimeTypes('image/').join(',')
    })

    const { actions: deleteActions } = useSpaceActionsDelete()
    const { actions: disableActions } = useSpaceActionsDisable()
    const { actions: duplicateActions } = useSpaceActionsDuplicate()
    const { actions: editDescriptionActions } = useSpaceActionsEditDescription()
    const { actions: editQuotaActions } = useSpaceActionsEditQuota()
    const { actions: editReadmeContentActions } = useSpaceActionsEditReadmeContent()
    const { actions: renameActions } = useSpaceActionsRename()
    const { actions: restoreActions } = useSpaceActionsRestore()
    const { actions: uploadImageActions, showModalImageSpace } = useSpaceActionsUploadImage({
      spaceImageInput
    })
    const { actions: setSpaceIconActions } = useSpaceActionsSetIcon()
    const { actions: downloadArchiveActions } = useFileActionsDownloadArchive()

    const actions = computed(() =>
      [
        ...unref(downloadArchiveActions),
        ...unref(renameActions),
        ...unref(duplicateActions),
        ...unref(editDescriptionActions),
        ...unref(uploadImageActions),
        ...unref(setSpaceIconActions),
        ...unref(editReadmeContentActions),
        ...unref(editQuotaActions),
        ...unref(restoreActions),
        ...unref(deleteActions),
        ...unref(disableActions)
      ].filter((item) => item.isVisible(unref(actionOptions)))
    )

    return {
      actions,
      actionOptions,
      spaceImageInput,
      supportedSpaceImageMimeTypes,

      uploadImageActions,
      showModalImageSpace
    }
  }
})
</script>

<style lang="scss">
#space-image-upload-input {
  position: absolute;
  left: -99999px;
}

#oc-spaces-actions-sidebar {
  > li a,
  > li a:hover {
    display: inline-flex;
    gap: 10px;
    vertical-align: top;
  }
}
</style>
