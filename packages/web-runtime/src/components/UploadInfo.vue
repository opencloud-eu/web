<template>
  <div
    v-if="showInfo"
    id="upload-info"
    class="rounded-xl shadow-sm/10 bg-role-surface mx-auto sm:m-0 w-full sm:w-md max-w-lg [&_.oc-resource-details]:pl-1 border"
  >
    <div class="upload-info-title flex justify-between items-center px-4 py-2 rounded-t-xl">
      <p v-oc-tooltip="uploadDetails" class="my-1 font-bold" v-text="uploadInfoTitle" />
      <div class="flex items-center">
        <oc-button
          id="collapse-upload-info-btn"
          :aria-label="
            bodyCollapsed
              ? $gettext('Expand upload info body')
              : $gettext('Collapse upload info body')
          "
          appearance="raw"
          @click="toggleBodyCollapsed"
        >
          <oc-icon :name="bodyCollapsed ? 'arrow-up-s' : 'arrow-down-s'" fill-type="line" />
        </oc-button>
        <oc-button
          v-if="!itemsInProgressCount"
          id="close-upload-info-btn"
          :aria-label="$gettext('Close')"
          appearance="raw"
          @click="closeInfo"
        >
          <oc-icon name="close" />
        </oc-button>
      </div>
    </div>
    <div v-if="!bodyCollapsed" class="upload-info-body">
      <div
        class="px-4 pt-4 flex justify-between items-center"
        :class="{
          'pb-4': !runningUploads
        }"
      >
        <div v-if="runningUploads" class="flex items-center">
          <oc-icon v-if="uploadsPaused" name="pause" size-class="size-4" class="mr-1" />
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
                size-class="size-4"
                color="var(--oc-role-error)"
              />
              <oc-icon v-else-if="item.status === 'success'" name="check" size-class="size-4" />
              <oc-icon v-else-if="item.status === 'cancelled'" name="close" size-class="size-4" />
              <oc-icon v-else-if="uploadsPaused" name="pause" size-class="size-4" />
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
  </div>
</template>

<script setup lang="ts">
import { ref, watch, unref, computed } from 'vue'
import { isUndefined } from 'lodash-es'
import { getSpeed } from '@uppy/utils'
import { HttpError, Resource, urlJoin, extractParentFolderName } from '@opencloud-eu/web-client'
import {
  OcUppyFile,
  queryItemAsString,
  UppyService,
  useService,
  formatFileSize,
  ResourceListItem,
  ResourceIcon,
  ResourceName
} from '@opencloud-eu/web-pkg'
import { RouteLocationNamedRaw } from 'vue-router'
import { useGettext } from 'vue3-gettext'

type UploadResult = OcUppyFile & {
  path?: string
  targetRoute?: RouteLocationNamedRaw
  status?: string
  filesCount?: number
  successCount?: number
  errorCount?: number
}

const uppyService = useService<UppyService>('$uppyService')
const { $gettext, $ngettext, current: currentLanguage } = useGettext()

const showInfo = ref(false) // show the overlay?
const bodyCollapsed = ref(false)
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

const uploadDetails = computed(() => {
  if (!unref(uploadSpeed) || !unref(runningUploads)) {
    return ''
  }
  const uploadedBytes = formatFileSize(unref(bytesUploaded), currentLanguage)
  const totalBytes = formatFileSize(unref(bytesTotal), currentLanguage)
  const currentUploadSpeed = formatFileSize(unref(uploadSpeed), currentLanguage)

  return $gettext('%{uploadedBytes} of %{totalBytes} (%{currentUploadSpeed}/s)', {
    uploadedBytes,
    totalBytes,
    currentUploadSpeed
  })
})

const uploadInfoTitle = computed(() => {
  if (unref(inFinalization)) {
    return $gettext('Finalizing upload...')
  }

  if (unref(itemsInProgressCount) && !unref(inPreparation)) {
    return $ngettext(
      '%{ filesInProgressCount } item uploading...',
      '%{ filesInProgressCount } items uploading...',
      unref(itemsInProgressCount),
      { filesInProgressCount: unref(itemsInProgressCount).toString() }
    )
  }
  if (unref(uploadsCancelled)) {
    return $gettext('Upload cancelled')
  }
  if (Object.keys(unref(errors)).length) {
    return $gettext('Upload failed')
  }
  if (!unref(runningUploads)) {
    return $gettext('Upload completed')
  }
  return $gettext('Preparing upload...')
})

const uploadingLabel = computed(() => {
  if (Object.keys(unref(errors)).length) {
    const count = unref(successful).length + Object.keys(unref(errors)).length
    return $ngettext(
      '%{ errors } of %{ uploads } item failed',
      '%{ errors } of %{ uploads } items failed',
      count,
      { uploads: count.toString(), errors: Object.keys(unref(errors)).length.toString() }
    )
  }

  const folderCount = unref(successful).filter(
    (id: string) => unref(uploads)[id]?.meta?.isFolder
  ).length
  const fileCount = unref(successful).length - folderCount

  const parts: string[] = []
  if (fileCount > 0) {
    parts.push(
      $ngettext('%{ fileCount } file', '%{ fileCount } files', fileCount, {
        fileCount: fileCount.toString()
      })
    )
  }
  if (folderCount > 0) {
    parts.push(
      $ngettext('%{ folderCount } folder', '%{ folderCount } folders', folderCount, {
        folderCount: folderCount.toString()
      })
    )
  }

  if (!parts.length) {
    return $ngettext(
      '%{ successfulUploads } item uploaded',
      '%{ successfulUploads } items uploaded',
      unref(successful).length,
      { successfulUploads: unref(successful).length.toString() }
    )
  }

  return $gettext('%{ items } uploaded', { items: parts.join(', ') })
})

const uploadErrorLogContent = computed(() => {
  const requestIds = Object.values(unref(errors)).reduce<string[]>((acc, error) => {
    // tus-js-client error
    const requestId = (error as any).originalRequest?._headers?.['X-Request-ID']

    if (requestId) {
      acc.push(requestId)
    }

    return acc
  }, [])

  return requestIds.map((item) => `X-Request-Id: ${item}`).join('\r\n')
})

const uploadsPausable = computed(() => uppyService.tusActive())
const showErrorLog = computed(() => unref(infoExpanded) && unref(uploadErrorLogContent))

function getRemainingTime(remainingMilliseconds: number) {
  const roundedRemainingMinutes = Math.round(remainingMilliseconds / 1000 / 60)
  if (roundedRemainingMinutes >= 1 && roundedRemainingMinutes < 60) {
    return $ngettext(
      '%{ roundedRemainingMinutes } minute left',
      '%{ roundedRemainingMinutes } minutes left',
      roundedRemainingMinutes,
      { roundedRemainingMinutes: roundedRemainingMinutes.toString() }
    )
  }

  const roundedRemainingHours = Math.round(remainingMilliseconds / 1000 / 60 / 60)
  if (roundedRemainingHours > 0) {
    return $ngettext(
      '%{ roundedRemainingHours } hour left',
      '%{ roundedRemainingHours } hours left',
      roundedRemainingHours,
      { roundedRemainingHours: roundedRemainingHours.toString() }
    )
  }

  return $gettext('Few seconds left')
}

function handleTopLevelFolderUpdate(file: OcUppyFile, status: string) {
  const topLevelFolder = uploads.value[file.meta.topLevelFolderId]
  if (status === 'success') {
    topLevelFolder.successCount += 1
  } else {
    topLevelFolder.errorCount += 1
  }

  // all files for this top level folder are finished
  if (topLevelFolder.successCount + topLevelFolder.errorCount === topLevelFolder.filesCount) {
    topLevelFolder.status = topLevelFolder.errorCount ? 'error' : 'success'
    itemsInProgressCount.value -= 1
  }
}

function cleanOverlay() {
  uploadsCancelled.value = false
  uploads.value = {}
  errors.value = {}
  successful.value = []
  itemsInProgressCount.value = 0
  runningUploads.value = 0
  disableActions.value = false
}

function resetProgress() {
  bytesTotal.value = 0
  bytesUploaded.value = 0
  filesInEstimation.value = {}
  timeStarted.value = null
  remainingTime.value = undefined
  inPreparation.value = true
  inFinalization.value = false
  uploadsPaused.value = false
}

function closeInfo() {
  showInfo.value = false
  bodyCollapsed.value = false
  infoExpanded.value = false
  cleanOverlay()
  resetProgress()

  if (!unref(runningUploads)) {
    // we can safely remove all failed files if no uploads are running and the overlay is closed
    uppyService.removeFailedFiles()
  }
}

function displayFileAsResource(file: UploadResult) {
  return !!file.targetRoute
}

function isResourceClickable(file: UploadResult) {
  return file.meta.isFolder === true
}

function resourceLink(file: UploadResult) {
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
      ...(!isUndefined(file.meta.fileId) && { fileId: file.meta.fileId })
    }
  }
}

function parentFolderLink(file: UploadResult) {
  return {
    ...file.targetRoute,
    query: {
      ...file.targetRoute.query,
      ...(!isUndefined(file.meta.currentFolderId) && { fileId: file.meta.currentFolderId })
    }
  }
}

function parentFolderName(file: UploadResult) {
  const { meta } = file
  const parentFolder = extractParentFolderName(file as Resource)
  if (parentFolder) {
    return parentFolder
  }

  if (meta.driveType === 'personal') {
    return $gettext('Personal')
  }

  if (meta.driveType === 'public') {
    return $gettext('Public link')
  }

  return meta.spaceName
}

function buildRouteFromUppyResource(resource: OcUppyFile): RouteLocationNamedRaw {
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
}

function toggleInfo() {
  infoExpanded.value = !infoExpanded.value
}

function toggleBodyCollapsed() {
  bodyCollapsed.value = !bodyCollapsed.value
}

function togglePauseUploads() {
  if (unref(uploadsPaused)) {
    uppyService.resumeAllUploads()
    timeStarted.value = null
  } else {
    uppyService.pauseAllUploads()
  }

  uploadsPaused.value = !unref(uploadsPaused)
}

function cancelAllUploads() {
  uploadsCancelled.value = true
  itemsInProgressCount.value = 0
  runningUploads.value = 0
  resetProgress()
  uppyService.cancelAllUploads()
  const running = Object.values(unref(uploads)).filter(
    (u) => u.status !== 'success' && u.status !== 'error'
  )

  for (const item of running) {
    uploads.value[item.meta.uploadId].status = 'cancelled'
  }
}

function retryUploads() {
  itemsInProgressCount.value += Object.keys(unref(errors)).length
  runningUploads.value += 1
  for (const fileID of Object.keys(unref(errors))) {
    uploads.value[fileID].status = undefined

    const topLevelFolderId = uploads.value[fileID].meta.topLevelFolderId
    if (topLevelFolderId) {
      uploads.value[topLevelFolderId].status = undefined
      uploads.value[topLevelFolderId].errorCount = 0
    }
  }
  errors.value = {}
  uppyService.retryAllUploads()
}

function getUploadItemMessage(item: UploadResult) {
  const error = unref(errors)[item.meta.uploadId]

  if (!error) {
    return
  }

  // TODO: Remove extraction code as soon as https://github.com/tus/tus-js-client/issues/448 is solved
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
  if (unref(errors)[item.meta.uploadId]?.statusCode === 423) {
    return $gettext("The folder you're uploading to is locked")
  }

  switch (errorObject.responseCode) {
    case 507:
      return $gettext('Quota exceeded')
    default:
      return errorObject.errorMessage
        ? $gettext(errorObject.errorMessage)
        : $gettext('Unknown error')
  }
}

const getUploadItemClass = (item: UploadResult) => {
  return unref(errors)[item.meta.uploadId]
    ? 'upload-info-danger text-role-error'
    : 'upload-info-success'
}

uppyService.subscribe('uploadStarted', () => {
  if (!unref(remainingTime)) {
    remainingTime.value = $gettext('Calculating estimated time...')
  }

  // No upload in progress -> clean overlay
  if (!unref(runningUploads) && unref(showInfo)) {
    cleanOverlay()
  }

  showInfo.value = true
  runningUploads.value += 1
  inFinalization.value = false
})
uppyService.subscribe('addedForUpload', (files: OcUppyFile[]) => {
  // only count root level files and folders
  itemsInProgressCount.value += files.filter((f) => !f.meta.relativeFolder).length

  for (const file of files) {
    if (!unref(disableActions) && file.isRemote) {
      disableActions.value = true
    }

    if (file.data?.size) {
      bytesTotal.value += file.data.size
    }

    const { relativeFolder, uploadId, topLevelFolderId } = file.meta
    const isTopLevelItem = !relativeFolder
    // only add top level items to this.uploads because we only show those
    if (isTopLevelItem) {
      uploads.value[uploadId] = file
      // top level folders get initialized with file counts about their files inside
      if (file.meta.isFolder && uploads.value[uploadId].filesCount === undefined) {
        uploads.value[uploadId].filesCount = 0
        uploads.value[uploadId].errorCount = 0
        uploads.value[uploadId].successCount = 0
      }
    }

    // count all files inside top level folders to mark them as successful or failed later
    if (!file.meta.isFolder && !isTopLevelItem && uploads.value[topLevelFolderId]) {
      uploads.value[topLevelFolderId].filesCount += 1
    }
  }
})
uppyService.subscribe('uploadCompleted', () => {
  runningUploads.value -= 1

  if (!unref(runningUploads)) {
    resetProgress()
  }
})
uppyService.subscribe('progress', (value: number) => {
  totalProgress.value = value
})
uppyService.subscribe(
  'upload-progress',
  ({ file, progress }: { file: OcUppyFile; progress: { bytesUploaded: number } }) => {
    if (!unref(timeStarted)) {
      timeStarted.value = new Date()
      inPreparation.value = false
    }

    if (filesInEstimation.value[file.meta.uploadId] === undefined) {
      filesInEstimation.value[file.meta.uploadId] = 0
    }

    const byteIncrease = progress.bytesUploaded - filesInEstimation.value[file.meta.uploadId]
    bytesUploaded.value += byteIncrease
    filesInEstimation.value[file.meta.uploadId] = progress.bytesUploaded

    const timeElapsed = +new Date().getTime() - unref(timeStarted).getTime()

    uploadSpeed.value = getSpeed({
      bytesUploaded: unref(bytesUploaded),
      uploadStarted: unref(timeStarted).getTime(),
      bytesTotal: unref(bytesTotal)
    })

    const progressPercent = (100 * unref(bytesUploaded)) / unref(bytesTotal)
    if (progressPercent === 0) {
      return
    }
    const totalTimeNeededInMilliseconds = (timeElapsed / progressPercent) * 100
    const remainingMilliseconds = totalTimeNeededInMilliseconds - timeElapsed

    remainingTime.value = getRemainingTime(remainingMilliseconds)
    if (progressPercent === 100) {
      inFinalization.value = true
    }
  }
)
uppyService.subscribe('uploadError', ({ file, error }: { file: OcUppyFile; error: Error }) => {
  if (unref(errors)[file.meta.uploadId]) {
    return
  }

  // file inside folder -> was not added to this.uploads, but must be now because of error
  if (!uploads.value[file.meta.uploadId]) {
    uploads.value[file.meta.uploadId] = file
  }

  if (file.meta.relativePath) {
    uploads.value[file.meta.uploadId].path = file.meta.relativePath
  } else {
    uploads.value[file.meta.uploadId].path = urlJoin(file.meta.currentFolder, file.name)
  }

  uploads.value[file.meta.uploadId].targetRoute = buildRouteFromUppyResource(file)
  uploads.value[file.meta.uploadId].status = 'error'
  errors.value[file.meta.uploadId] = error as HttpError

  if (!file.meta.isFolder) {
    if (!file.meta.relativeFolder && unref(itemsInProgressCount) > 0) {
      // reduce count for failed root level files. count for folders is handled in handleTopLevelFolderUpdate
      itemsInProgressCount.value -= 1
    }

    if (file.meta.topLevelFolderId) {
      handleTopLevelFolderUpdate(file, 'error')
    }
  }
})
uppyService.subscribe('uploadSuccess', (file: OcUppyFile) => {
  // item inside folder
  if (!uploads.value[file.meta.uploadId] || file.meta.relativeFolder) {
    if (!file.meta.isFolder && file.meta.topLevelFolderId) {
      handleTopLevelFolderUpdate(file, 'success')
    }

    if (uploads.value[file.meta.uploadId]) {
      // retries end up in uploads, even if they're not at the top level.
      // a succeeded retry can now be removed from uploads.
      delete uploads.value[file.meta.uploadId]
    }

    return
  }

  uploads.value[file.meta.uploadId] = file
  uploads.value[file.meta.uploadId].path = urlJoin(file.meta.currentFolder, file.name)
  uploads.value[file.meta.uploadId].targetRoute = buildRouteFromUppyResource(file)
  uploads.value[file.meta.uploadId].status = 'success'
  successful.value.push(file.meta.uploadId)

  if (!file.meta.isFolder && unref(itemsInProgressCount) > 0) {
    // reduce count for succeeded root level files. count for folders is handled in handleTopLevelFolderUpdate
    itemsInProgressCount.value -= 1
  }
})
</script>
