<template>
  <div id="oc-file-details-multiple-sidebar">
    <div class="files-preview oc-mb">
      <div class="files-preview-body">
        <oc-icon class="preview-icon" size="xxlarge" name="file-copy" />
        <p class="preview-text" data-testid="selectedFilesText" v-text="selectedFilesString" />
      </div>
    </div>
    <div>
      <oc-definition-list
        :aria-label="$gettext('Overview of the information about the selected files')"
        :items="details"
      />
    </div>
  </div>
</template>
<script lang="ts">
import { computed, defineComponent, unref } from 'vue'
import { storeToRefs } from 'pinia'
import { formatFileSize, useResourcesStore } from '@opencloud-eu/web-pkg'
import { useGettext } from 'vue3-gettext'

export default defineComponent({
  name: 'FileDetailsMultiple',
  props: {
    showSpaceCount: { type: Boolean, default: false }
  },
  setup() {
    const { $gettext, current: currentLanguage } = useGettext()
    const resourcesStore = useResourcesStore()
    const { selectedResources } = storeToRefs(resourcesStore)

    const hasSize = computed(() => {
      return unref(selectedResources).some((resource) => Object.hasOwn(resource, 'size'))
    })

    const filesCount = computed(() => {
      return unref(selectedResources).filter((i) => i.type === 'file').length
    })

    const foldersCount = computed(() => {
      return unref(selectedResources).filter((i) => i.type === 'folder').length
    })

    const spacesCount = computed(() => {
      return unref(selectedResources).filter((i) => i.type === 'space').length
    })

    const sizeValue = computed(() => {
      let size = 0
      unref(selectedResources).forEach((i) => (size += parseInt(i.size?.toString() || '0')))
      return formatFileSize(size, currentLanguage)
    })

    const details = [
      { term: $gettext('Files'), definition: unref(filesCount) },
      { term: $gettext('Folders'), definition: unref(foldersCount) },
      { term: $gettext('Spaces'), definition: unref(spacesCount) },
      { term: $gettext('Size'), definition: unref(sizeValue) }
    ]

    return { hasSize, selectedResources, details }
  },
  computed: {
    selectedFilesCount() {
      return this.selectedResources.length
    },
    selectedFilesString() {
      return this.$ngettext(
        '%{ itemCount } item selected',
        '%{ itemCount } items selected',
        this.selectedFilesCount,
        {
          itemCount: this.selectedFilesCount.toString()
        }
      )
    }
  }
})
</script>
<style lang="scss" scoped>
.files-preview {
  position: relative;
  background-color: var(--oc-role-surface-container-high);
  border: 10px solid var(--oc-role-surface-container-high);
  height: 230px;
  text-align: center;

  &-body {
    margin: 0;
    position: absolute;
    top: 50%;
    left: 50%;
    -ms-transform: translate(-50%, -50%);
    transform: translate(-50%, -50%);

    .preview-icon {
      display: inline-block;
    }

    .preview-text {
      display: block;
    }
  }
}
</style>
