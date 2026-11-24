<template>
  <li>
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
      <span class="upload-info-item-status sr-only" v-text="status" />
      <resource-list-item
        v-if="item.targetRoute"
        :key="item.path"
        class="ms-2 min-w-0"
        :resource="item as Resource"
        :is-path-displayed="true"
        :is-resource-clickable="item.meta.isFolder === true"
        :parent-folder-name="parentFolderName"
        :link="resourceLink"
        :parent-folder-link="parentFolderLink"
      />
      <span v-else class="flex items-center truncate">
        <resource-icon :resource="item as Resource" size="large" class="file_info__icon mx-2" />
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
      v-if="message"
      class="upload-info-message ms-1 text-sm upload-info-danger text-role-error"
      v-text="message"
    ></span>
  </li>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { isUndefined } from 'lodash-es'
import {
  DavHttpError,
  HttpError,
  Resource,
  urlJoin,
  extractParentFolderName
} from '@opencloud-eu/web-client'
import {
  OcUppyFile,
  queryItemAsString,
  ResourceListItem,
  ResourceIcon,
  ResourceName
} from '@opencloud-eu/web-pkg'
import { RouteLocationNamedRaw } from 'vue-router'
import { useGettext } from 'vue3-gettext'

export type UploadResult = OcUppyFile & {
  path?: string
  targetRoute?: RouteLocationNamedRaw
  status?: string
  filesCount?: number
  successCount?: number
  errorCount?: number
}

// @uppy/xhr-upload attaches the failed XMLHttpRequest to its errors
export type UploadError = HttpError & { request?: XMLHttpRequest }

const {
  item,
  error = undefined,
  uploadsPaused
} = defineProps<{
  item: UploadResult
  error?: UploadError
  uploadsPaused: boolean
}>()

const { $gettext } = useGettext()

const status = computed(() => {
  switch (item.status) {
    case 'error':
      return $gettext('Failed')
    case 'success':
      return $gettext('Uploaded')
    case 'cancelled':
      return $gettext('Cancelled')
  }
  return uploadsPaused ? $gettext('Paused') : $gettext('Uploading')
})

const resourceLink = computed(() => {
  if (!item.meta.isFolder) {
    return {}
  }
  return {
    ...item.targetRoute,
    params: {
      ...item.targetRoute.params,
      driveAliasAndItem: urlJoin(
        queryItemAsString(item.targetRoute.params.driveAliasAndItem),
        item.name,
        { leadingSlash: false }
      )
    },
    query: {
      ...item.targetRoute.query,
      ...(!isUndefined(item.meta.fileId) && { fileId: item.meta.fileId })
    }
  }
})

const parentFolderLink = computed(() => ({
  ...item.targetRoute,
  query: {
    ...item.targetRoute.query,
    ...(!isUndefined(item.meta.currentFolderId) && { fileId: item.meta.currentFolderId })
  }
}))

const parentFolderName = computed(() => {
  const parentFolder = extractParentFolderName(item as Resource)
  if (parentFolder) {
    return parentFolder
  }

  if (item.meta.driveType === 'personal') {
    return $gettext('Personal')
  }

  if (item.meta.driveType === 'public') {
    return $gettext('Public link')
  }

  return item.meta.spaceName
})

// TODO: Remove extraction code as soon as https://github.com/tus/tus-js-client/issues/448 is solved
function formatErrorToObject({ message, request }: UploadError) {
  // tus-js-client puts the response into the message, @uppy/xhr-upload into the request
  const tusResponseCode = message.match(/response code: (\d+)/)?.[1]
  const responseCode = tusResponseCode ? parseInt(tusResponseCode, 10) : request?.status
  const responseText = tusResponseCode
    ? message.match(/response text: ([\s\S]+?), request id/)?.[1] || '{}'
    : request?.responseText || '{}'
  let errorBody: { error?: { code?: string; message?: string } }
  try {
    errorBody = JSON.parse(responseText)
  } catch {
    errorBody = {
      error: { message: responseText.match(/<s:message>([\s\S]*?)<\/s:message>/)?.[1] }
    }
  }

  return {
    responseCode: responseCode || null,
    errorCode: errorBody?.error?.code,
    errorMessage: errorBody?.error?.message
  }
}

const message = computed(() => {
  if (!error) {
    return undefined
  }

  // folders are created via webdav, its errors carry the status and the server message directly
  const errorObject =
    error instanceof DavHttpError
      ? { responseCode: error.statusCode, errorMessage: error.message }
      : formatErrorToObject(error)
  if (error.statusCode === 423 || errorObject.responseCode === 423) {
    return item.meta.isFolder
      ? $gettext("The folder you're uploading to is locked")
      : $gettext('This item is locked')
  }

  switch (errorObject.responseCode) {
    case 507:
      return $gettext('Quota exceeded')
    default:
      return errorObject.errorMessage
        ? $gettext(errorObject.errorMessage)
        : $gettext('Unknown error')
  }
})
</script>
