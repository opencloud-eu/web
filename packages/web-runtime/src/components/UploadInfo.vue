<template>
  <div
    v-if="showInfo"
    id="upload-info"
    class="rounded-sm shadow-md/20 bg-role-surface mx-auto sm:m-0 w-full sm:w-md max-w-lg [&_.oc-resource-details]:pl-1"
  >
    <div
      class="upload-info-title flex justify-between items-center px-4 py-2 rounded-t-sm bg-role-surface-container"
    >
      <p v-oc-tooltip="uploadDetails" class="my-1" v-text="uploadInfoTitle" />
      <oc-button
        v-if="!itemsInProgressCount"
        id="close-upload-info-btn"
        :aria-label="$gettext('Close')"
        appearance="raw"
        class="p-1 raw-hover-surface"
        @click="closeInfo"
      >
        <oc-icon name="close" />
      </oc-button>
    </div>
    <div
      class="px-4 pt-4 flex justify-between items-center"
      :class="{
        'pb-4': !runningUploads
      }"
    >
      <div v-if="runningUploads" class="flex items-center">
        <oc-icon v-if="uploadsPaused" name="pause" size="small" class="mr-1" />
        <oc-spinner v-else size="small" class="mr-1" />
        <span class="text-sm text-role-on-surface-variant leading-7" v-text="remainingTime" />
      </div>
      <div
        v-else
        class="upload-info-label"
        :class="{
          'upload-info-danger text-role-error': Object.keys(errors).length && !uploadsCancelled,
          'upload-info-success': !Object.keys(errors).length && !uploadsCancelled
        }"
      >
        {{ uploadingLabel }}
      </div>
      <div class="flex">
        <oc-button
          appearance="raw"
          class="text-role-on-surface-variant text-sm upload-info-toggle-details-btn"
          no-hover
          @click="toggleInfo"
        >
          {{ infoExpanded ? $gettext('Hide details') : $gettext('Show details') }}
        </oc-button>
        <oc-button
          v-if="!runningUploads && Object.keys(errors).length && !disableActions"
          v-oc-tooltip="$gettext('Retry all failed uploads')"
          class="ml-1 p-1"
          appearance="raw"
          :aria-label="$gettext('Retry all failed uploads')"
          @click="retryUploads"
        >
          <oc-icon name="restart" fill-type="line" />
        </oc-button>

        <oc-button
          v-if="
            runningUploads &&
            uploadsPausable &&
            !inPreparation &&
            !inFinalization &&
            !disableActions
          "
          id="pause-upload-info-btn"
          v-oc-tooltip="uploadsPaused ? $gettext('Resume upload') : $gettext('Pause upload')"
          class="ml-1 p-1"
          appearance="raw"
          :aria-label="uploadsPaused ? $gettext('Resume upload') : $gettext('Pause upload')"
          @click="togglePauseUploads"
        >
          <oc-icon :name="uploadsPaused ? 'play-circle' : 'pause-circle'" fill-type="line" />
        </oc-button>
        <oc-button
          v-if="runningUploads && !inPreparation && !inFinalization && !disableActions"
          id="cancel-upload-info-btn"
          v-oc-tooltip="$gettext('Cancel upload')"
          class="ml-1 p-1"
          appearance="raw"
          :aria-label="$gettext('Cancel upload')"
          @click="cancelAllUploads"
        >
          <oc-icon name="close-circle" fill-type="line" />
        </oc-button>
      </div>
    </div>
    <div v-if="runningUploads" class="upload-info-progress mx-4 pb-4 mt-2 oc-text">
      <oc-progress
        :value="totalProgress"
        :max="100"
        size="small"
        :indeterminate="!itemsInProgressCount"
      />
    </div>
    <div
      v-if="infoExpanded"
      class="upload-info-items px-4 pb-4 max-h-[50vh] overflow-y-auto"
      :class="{ 'max-h-[calc(50vh-100px)]': showErrorLog }"
    >
      <ul class="oc-list">
        <li v-for="(item, idx) in uploads" :key="idx">
          <span class="flex items-center">
            <oc-icon
              v-if="item.status === 'error'"
              name="close"
              size="small"
              color="var(--oc-role-error)"
            />
            <oc-icon v-else-if="item.status === 'success'" name="check" size="small" />
            <oc-icon v-else-if="item.status === 'cancelled'" name="close" size="small" />
            <oc-icon v-else-if="uploadsPaused" name="pause" size="small" />
            <div v-else class="flex"><oc-spinner size="small" /></div>
            <resource-list-item
              v-if="displayFileAsResource(item)"
              :key="item.path"
              class="ml-2"
              :resource="item as Resource"
              :is-path-displayed="true"
              :is-resource-clickable="isResourceClickable(item)"
              :parent-folder-name="parentFolderName(item)"
              :link="resourceLink(item)"
              :parent-folder-link="parentFolderLink(item)"
            />
            <span v-else class="flex items-center truncate">
              <resource-icon
                :resource="item as Resource"
                size="large"
                class="file_info__icon mx-2"
              />
              <resource-name
                :name="item.name"
                :extension="item.extension"
                :type="item.type"
                full-path=""
                :is-path-displayed="false"
              />
            </span>
          </span>
          <span
            v-if="getUploadItemMessage(item)"
            class="upload-info-message ml-1 text-sm"
            :class="getUploadItemClass(item)"
            v-text="getUploadItemMessage(item)"
          ></span>
        </li>
      </ul>
    </div>
    <oc-error-log
      v-if="showErrorLog"
      class="upload-info-error-log pt-4 pb-4 px-4"
      :content="uploadErrorLogContent"
    />
  </div>
</template>

<script lang="ts">
import { defineComponent, ref, watch, unref } from 'vue'
import { isUndefined } from 'lodash-es'
import { getSpeed } from '@uppy/utils'
import { HttpError, Resource, urlJoin } from '@opencloud-eu/web-client'
import {
  OcUppyFile,
  queryItemAsString,
  UppyService,
  useConfigStore,
  useService
} from '@opencloud-eu/web-pkg'
import { formatFileSize, ResourceListItem, ResourceIcon, ResourceName } from '@opencloud-eu/web-pkg'
import { extractParentFolderName } from '@opencloud-eu/web-client'
import { storeToRefs } from 'pinia'
import { RouteLocationNamedRaw } from 'vue-router'

type UploadResult = OcUppyFile & {
  path?: string
  targetRoute?: RouteLocationNamedRaw
  status?: string
  filesCount?: number
  successCount?: number
  errorCount?: number
}

export default defineComponent({
  components: { ResourceListItem, ResourceIcon, ResourceName },
  setup() {
    const uppyService = useService<UppyService>('$uppyService')
    const configStore = useConfigStore()
    const { options: configOptions } = storeToRefs(configStore)

    const showInfo = ref(false) // show the overlay?
    const infoExpanded = ref(false) // show the info including all uploads?
    const uploads = ref<Record<string, UploadResult>>({}) // uploads that are being displayed via "infoExpanded"
    const errors = ref<Record<string, HttpError>>({}) // all failed files
    const successful = ref<string[]>([]) // all successful root level items
    const itemsInProgressCount = ref(0) // root level files and folders that are being processed currently
    const totalProgress = ref(0) // current uploads progress (0-100)
    const uploadsPaused = ref(false) // all uploads paused?
    const uploadsCancelled = ref(false) // all uploads cancelled?
    const inFinalization = ref(false) // uploads transferred but still need to be finalized
    const inPreparation = ref(true) // preparation before upload
    const runningUploads = ref(0) // all uploads (not files!) that are in progress currently
    const bytesTotal = ref(0)
    const bytesUploaded = ref(0)
    const uploadSpeed = ref(0)
    const filesInEstimation = ref<Record<string, number>>({})
    const timeStarted = ref<Date>(null)
    const remainingTime = ref<string>(undefined)
    const disableActions = ref(false) // disables the following actions: pause, resume, retry

    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      if (unref(runningUploads)) {
        e.preventDefault()
      }
    }

    watch(runningUploads, (val) => {
      if (val === 0) {
        return window.removeEventListener('beforeunload', onBeforeUnload)
      }
      return window.addEventListener('beforeunload', onBeforeUnload)
    })

    return {
      configOptions,
      showInfo,
      infoExpanded,
      uploads,
      errors,
      successful,
      itemsInProgressCount,
      totalProgress,
      uploadsPaused,
      uploadsCancelled,
      inFinalization,
      inPreparation,
      runningUploads,
      bytesTotal,
      bytesUploaded,
      uploadSpeed,
      filesInEstimation,
      timeStarted,
      remainingTime,
      disableActions,
      uppyService
    }
  },
  computed: {
    uploadDetails() {
      if (!this.uploadSpeed || !this.runningUploads) {
        return ''
      }
      const uploadedBytes = formatFileSize(this.bytesUploaded, this.$language.current)
      const totalBytes = formatFileSize(this.bytesTotal, this.$language.current)
      const currentUploadSpeed = formatFileSize(this.uploadSpeed, this.$language.current)

      return this.$gettext('%{uploadedBytes} of %{totalBytes} (%{currentUploadSpeed}/s)', {
        uploadedBytes,
        totalBytes,
        currentUploadSpeed
      })
    },
    uploadInfoTitle() {
      if (this.inFinalization) {
        return this.$gettext('Finalizing upload...')
      }

      if (this.itemsInProgressCount && !this.inPreparation) {
        return this.$ngettext(
          '%{ filesInProgressCount } item uploading...',
          '%{ filesInProgressCount } items uploading...',
          this.itemsInProgressCount,
          { filesInProgressCount: this.itemsInProgressCount.toString() }
        )
      }
      if (this.uploadsCancelled) {
        return this.$gettext('Upload cancelled')
      }
      if (Object.keys(this.errors).length) {
        return this.$gettext('Upload failed')
      }
      if (!this.runningUploads) {
        return this.$gettext('Upload completed')
      }
      return this.$gettext('Preparing upload...')
    },
    uploadingLabel() {
      if (Object.keys(this.errors).length) {
        const count = this.successful.length + Object.keys(this.errors).length
        return this.$ngettext(
          '%{ errors } of %{ uploads } item failed',
          '%{ errors } of %{ uploads } items failed',
          count,
          { uploads: count.toString(), errors: Object.keys(this.errors).length.toString() }
        )
      }
      return this.$ngettext(
        '%{ successfulUploads } item uploaded',
        '%{ successfulUploads } items uploaded',
        this.successful.length,
        { successfulUploads: this.successful.length.toString() }
      )
    },
    uploadsPausable() {
      return this.uppyService.tusActive()
    },
    showErrorLog() {
      return this.infoExpanded && this.uploadErrorLogContent
    },
    uploadErrorLogContent() {
      const requestIds = Object.values(this.errors).reduce<string[]>((acc, error) => {
        // tus-js-client error
        const requestId = (error as any).originalRequest?._headers?.['X-Request-ID']

        if (requestId) {
          acc.push(requestId)
        }

        return acc
      }, [])

      return requestIds.map((item) => `X-Request-Id: ${item}`).join('\r\n')
    }
  },
  created() {
    this.uppyService.subscribe('uploadStarted', () => {
      if (!this.remainingTime) {
        this.remainingTime = this.$gettext('Calculating estimated time...')
      }

      // No upload in progress -> clean overlay
      if (!this.runningUploads && this.showInfo) {
        this.cleanOverlay()
      }

      this.showInfo = true
      this.runningUploads += 1
      this.inFinalization = false
    })
    this.uppyService.subscribe('addedForUpload', (files: OcUppyFile[]) => {
      // only count root level files and folders
      this.itemsInProgressCount += files.filter((f) => !f.meta.relativeFolder).length

      for (const file of files) {
        if (!this.disableActions && file.isRemote) {
          this.disableActions = true
        }

        if (file.data?.size) {
          this.bytesTotal += file.data.size
        }

        const { relativeFolder, uploadId, topLevelFolderId } = file.meta
        const isTopLevelItem = !relativeFolder
        // only add top level items to this.uploads because we only show those
        if (isTopLevelItem) {
          this.uploads[uploadId] = file
          // top level folders get initialized with file counts about their files inside
          if (file.meta.isFolder && this.uploads[uploadId].filesCount === undefined) {
            this.uploads[uploadId].filesCount = 0
            this.uploads[uploadId].errorCount = 0
            this.uploads[uploadId].successCount = 0
          }
        }

        // count all files inside top level folders to mark them as successful or failed later
        if (!file.meta.isFolder && !isTopLevelItem && this.uploads[topLevelFolderId]) {
          this.uploads[topLevelFolderId].filesCount += 1
        }
      }
    })
    this.uppyService.subscribe('uploadCompleted', () => {
      this.runningUploads -= 1

      if (!this.runningUploads) {
        this.resetProgress()
      }
    })
    this.uppyService.subscribe('progress', (value: number) => {
      this.totalProgress = value
    })
    this.uppyService.subscribe(
      'upload-progress',
      ({ file, progress }: { file: OcUppyFile; progress: { bytesUploaded: number } }) => {
        if (!this.timeStarted) {
          this.timeStarted = new Date()
          this.inPreparation = false
        }

        if (this.filesInEstimation[file.meta.uploadId] === undefined) {
          this.filesInEstimation[file.meta.uploadId] = 0
        }

        const byteIncrease = progress.bytesUploaded - this.filesInEstimation[file.meta.uploadId]
        this.bytesUploaded += byteIncrease
        this.filesInEstimation[file.meta.uploadId] = progress.bytesUploaded

        const timeElapsed = +new Date().getTime() - this.timeStarted.getTime()

        this.uploadSpeed = getSpeed({
          bytesUploaded: this.bytesUploaded,
          uploadStarted: this.timeStarted.getTime(),
          bytesTotal: this.bytesTotal
        })

        const progressPercent = (100 * this.bytesUploaded) / this.bytesTotal
        if (progressPercent === 0) {
          return
        }
        const totalTimeNeededInMilliseconds = (timeElapsed / progressPercent) * 100
        const remainingMilliseconds = totalTimeNeededInMilliseconds - timeElapsed

        this.remainingTime = this.getRemainingTime(remainingMilliseconds)
        if (progressPercent === 100) {
          this.inFinalization = true
        }
      }
    )
    this.uppyService.subscribe(
      'uploadError',
      ({ file, error }: { file: OcUppyFile; error: Error }) => {
        if (this.errors[file.meta.uploadId]) {
          return
        }

        // file inside folder -> was not added to this.uploads, but must be now because of error
        if (!this.uploads[file.meta.uploadId]) {
          this.uploads[file.meta.uploadId] = file
        }

        if (file.meta.relativePath) {
          this.uploads[file.meta.uploadId].path = file.meta.relativePath
        } else {
          this.uploads[file.meta.uploadId].path = urlJoin(file.meta.currentFolder, file.name)
        }

        this.uploads[file.meta.uploadId].targetRoute = this.buildRouteFromUppyResource(file)
        this.uploads[file.meta.uploadId].status = 'error'
        this.errors[file.meta.uploadId] = error as HttpError

        if (!file.meta.isFolder) {
          if (!file.meta.relativeFolder && this.itemsInProgressCount > 0) {
            // reduce count for failed root level files. count for folders is handled in handleTopLevelFolderUpdate
            this.itemsInProgressCount -= 1
          }

          if (file.meta.topLevelFolderId) {
            this.handleTopLevelFolderUpdate(file, 'error')
          }
        }
      }
    )
    this.uppyService.subscribe('uploadSuccess', (file: OcUppyFile) => {
      // item inside folder
      if (!this.uploads[file.meta.uploadId] || file.meta.relativeFolder) {
        if (!file.meta.isFolder && file.meta.topLevelFolderId) {
          this.handleTopLevelFolderUpdate(file, 'success')
        }

        if (this.uploads[file.meta.uploadId]) {
          // retries end up in this.uploads, even if they're not at the top level.
          // a succeeded retry can now be removed from this.uploads.
          delete this.uploads[file.meta.uploadId]
        }

        return
      }

      this.uploads[file.meta.uploadId] = file
      this.uploads[file.meta.uploadId].path = urlJoin(file.meta.currentFolder, file.name)
      this.uploads[file.meta.uploadId].targetRoute = this.buildRouteFromUppyResource(file)
      this.uploads[file.meta.uploadId].status = 'success'
      this.successful.push(file.meta.uploadId)

      if (!file.meta.isFolder && this.itemsInProgressCount > 0) {
        // reduce count for succeeded root level files. count for folders is handled in handleTopLevelFolderUpdate
        this.itemsInProgressCount -= 1
      }
    })
  },
  methods: {
    getRemainingTime(remainingMilliseconds: number) {
      const roundedRemainingMinutes = Math.round(remainingMilliseconds / 1000 / 60)
      if (roundedRemainingMinutes >= 1 && roundedRemainingMinutes < 60) {
        return this.$ngettext(
          '%{ roundedRemainingMinutes } minute left',
          '%{ roundedRemainingMinutes } minutes left',
          roundedRemainingMinutes,
          { roundedRemainingMinutes: roundedRemainingMinutes.toString() }
        )
      }

      const roundedRemainingHours = Math.round(remainingMilliseconds / 1000 / 60 / 60)
      if (roundedRemainingHours > 0) {
        return this.$ngettext(
          '%{ roundedRemainingHours } hour left',
          '%{ roundedRemainingHours } hours left',
          roundedRemainingHours,
          { roundedRemainingHours: roundedRemainingHours.toString() }
        )
      }

      return this.$gettext('Few seconds left')
    },
    handleTopLevelFolderUpdate(file: OcUppyFile, status: string) {
      const topLevelFolder = this.uploads[file.meta.topLevelFolderId]
      if (status === 'success') {
        topLevelFolder.successCount += 1
      } else {
        topLevelFolder.errorCount += 1
      }

      // all files for this top level folder are finished
      if (topLevelFolder.successCount + topLevelFolder.errorCount === topLevelFolder.filesCount) {
        topLevelFolder.status = topLevelFolder.errorCount ? 'error' : 'success'
        this.itemsInProgressCount -= 1
      }
    },
    closeInfo() {
      this.showInfo = false
      this.infoExpanded = false
      this.cleanOverlay()
      this.resetProgress()

      if (!this.runningUploads) {
        // we can safely remove all failed files if no uploads are running and the overlay is closed
        this.uppyService.removeFailedFiles()
      }
    },
    cleanOverlay() {
      this.uploadsCancelled = false
      this.uploads = {}
      this.errors = {}
      this.successful = []
      this.itemsInProgressCount = 0
      this.runningUploads = 0
      this.disableActions = false
    },
    resetProgress() {
      this.bytesTotal = 0
      this.bytesUploaded = 0
      this.filesInEstimation = {}
      this.timeStarted = null
      this.remainingTime = undefined
      this.inPreparation = true
      this.inFinalization = false
      this.uploadsPaused = false
    },
    displayFileAsResource(file: UploadResult) {
      return !!file.targetRoute
    },
    isResourceClickable(file: UploadResult) {
      return file.meta.isFolder === true
    },
    resourceLink(file: UploadResult) {
      if (!file.meta.isFolder) {
        return {}
      }
      return {
        ...file.targetRoute,
        params: {
          ...file.targetRoute.params,
          driveAliasAndItem: urlJoin(
            queryItemAsString(file.targetRoute.params.driveAliasAndItem),
            file.name,
            {
              leadingSlash: false
            }
          )
        },
        query: {
          ...file.targetRoute.query,
          ...(this.configOptions.routing.idBased &&
            !isUndefined(file.meta.fileId) && { fileId: file.meta.fileId })
        }
      }
    },
    parentFolderLink(file: UploadResult) {
      return {
        ...file.targetRoute,
        query: {
          ...file.targetRoute.query,
          ...(this.configOptions.routing.idBased &&
            !isUndefined(file.meta.currentFolderId) && { fileId: file.meta.currentFolderId })
        }
      }
    },
    buildRouteFromUppyResource(resource: OcUppyFile): RouteLocationNamedRaw {
      if (!resource.meta.routeName) {
        return null
      }
      return {
        name: resource.meta.routeName,
        params: {
          driveAliasAndItem: resource.meta.routeDriveAliasAndItem
        },
        query: {
          ...(resource.meta.routeShareId && { shareId: resource.meta.routeShareId })
        }
      }
    },
    parentFolderName(file: UploadResult) {
      const {
        meta: { spaceName, driveType }
      } = file

      const parentFolder = extractParentFolderName(file as Resource)
      if (parentFolder) {
        return parentFolder
      }

      if (driveType === 'personal') {
        return this.$gettext('Personal')
      }

      if (driveType === 'public') {
        return this.$gettext('Public link')
      }

      return spaceName
    },
    toggleInfo() {
      this.infoExpanded = !this.infoExpanded
    },
    retryUploads() {
      this.itemsInProgressCount += Object.keys(this.errors).length
      this.runningUploads += 1
      for (const fileID of Object.keys(this.errors)) {
        this.uploads[fileID].status = undefined

        const topLevelFolderId = this.uploads[fileID].meta.topLevelFolderId
        if (topLevelFolderId) {
          this.uploads[topLevelFolderId].status = undefined
          this.uploads[topLevelFolderId].errorCount = 0
        }
      }
      this.errors = {}
      this.uppyService.retryAllUploads()
    },
    togglePauseUploads() {
      if (this.uploadsPaused) {
        this.uppyService.resumeAllUploads()
        this.timeStarted = null
      } else {
        this.uppyService.pauseAllUploads()
      }

      this.uploadsPaused = !this.uploadsPaused
    },
    cancelAllUploads() {
      this.uploadsCancelled = true
      this.itemsInProgressCount = 0
      this.runningUploads = 0
      this.resetProgress()
      this.uppyService.cancelAllUploads()
      const runningUploads = Object.values(this.uploads).filter(
        (u) => u.status !== 'success' && u.status !== 'error'
      )

      for (const item of runningUploads) {
        this.uploads[item.meta.uploadId].status = 'cancelled'
      }
    },
    getUploadItemMessage(item: UploadResult) {
      const error = this.errors[item.meta.uploadId]

      if (!error) {
        return
      }

      //TODO: Remove extraction code as soon as https://github.com/tus/tus-js-client/issues/448 is solved
      const formatErrorMessageToObject = (errorMessage: string) => {
        const responseCode = errorMessage.match(/response code: (\d+)/)?.[1]
        const errorBody = JSON.parse(
          errorMessage.match(/response text: ([\s\S]+?), request id/)?.[1] || '{}'
        )

        return {
          responseCode: responseCode ? parseInt(responseCode) : null,
          errorCode: errorBody?.error?.code,
          errorMessage: errorBody?.error?.message
        }
      }

      const errorObject = formatErrorMessageToObject(error.message)
      if (this.errors[item.meta.uploadId]?.statusCode === 423) {
        return this.$gettext("The folder you're uploading to is locked")
      }

      switch (errorObject.responseCode) {
        case 507:
          return this.$gettext('Quota exceeded')
        case 412:
          return this.$gettext('Parent folder does not exist')
        default:
          return errorObject.errorMessage
            ? this.$gettext(errorObject.errorMessage)
            : this.$gettext('Unknown error')
      }
    },
    getUploadItemClass(item: UploadResult) {
      return this.errors[item.meta.uploadId]
        ? 'upload-info-danger text-role-error'
        : 'upload-info-success'
    }
  }
})
</script>
