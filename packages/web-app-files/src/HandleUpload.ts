import Uppy, { BasePlugin } from '@uppy/core'
import { basename, dirname, join } from 'path'
import { v4 as uuidV4 } from 'uuid'
import { Language } from 'vue3-gettext'
import { Ref, unref } from 'vue'
import { RouteLocationNormalizedLoaded } from 'vue-router'
import { Resource, SpaceResource } from '@opencloud-eu/web-client'
import { urlJoin } from '@opencloud-eu/web-client'
import { UploadResourceConflict } from './helpers/resource'
import {
  ExtensionRegistry,
  FolderVaultEngine,
  MessageStore,
  ResourcesStore,
  SpacesStore,
  UserStore,
  locationPublicLink,
  formatFileSize,
  OcUppyFile,
  OcUppyMeta,
  OcUppyBody,
  resolveFolderVault,
  streamToBlob
} from '@opencloud-eu/web-pkg'
import { locationSpacesGeneric, UppyService } from '@opencloud-eu/web-pkg'
import { isPersonalSpaceResource, isShareSpaceResource } from '@opencloud-eu/web-client'
import { ClientService, queryItemAsString } from '@opencloud-eu/web-pkg'
import { PluginOpts } from '@uppy/core'

export interface HandleUploadOptions {
  clientService: ClientService
  language: Language
  route: Ref<RouteLocationNormalizedLoaded>
  userStore: UserStore
  messageStore: MessageStore
  spacesStore: SpacesStore
  resourcesStore: ResourcesStore
  extensionRegistry: ExtensionRegistry
  uppyService: UppyService
  id?: string
  space?: Ref<SpaceResource>
  quotaCheckEnabled?: boolean
  directoryTreeCreateEnabled?: boolean
  conflictHandlingEnabled?: boolean
}

/**
 * Plugin to handle the file upload with uppy. The process goes through the following steps:
 *
 * 1. convert input files to uppy resources
 * 2. check quota if spaces are enabled
 * 3. handle potential naming conflicts
 * 4. create directory tree if needed
 * 5. start upload
 */
export class HandleUpload extends BasePlugin<PluginOpts, OcUppyMeta, OcUppyBody> {
  clientService: ClientService
  language: Language
  route: Ref<RouteLocationNormalizedLoaded>
  space: Ref<SpaceResource>
  userStore: UserStore
  messageStore: MessageStore
  spacesStore: SpacesStore
  resourcesStore: ResourcesStore
  extensionRegistry: ExtensionRegistry
  uppyService: UppyService
  quotaCheckEnabled: boolean
  directoryTreeCreateEnabled: boolean
  conflictHandlingEnabled: boolean

  constructor(uppy: Uppy<OcUppyMeta, OcUppyBody>, opts: HandleUploadOptions) {
    super(uppy, opts)
    this.id = opts.id || 'HandleUpload'
    this.type = 'modifier'
    this.uppy = uppy

    this.clientService = opts.clientService
    this.language = opts.language
    this.route = opts.route
    this.space = opts.space
    this.userStore = opts.userStore
    this.messageStore = opts.messageStore
    this.spacesStore = opts.spacesStore
    this.resourcesStore = opts.resourcesStore
    this.extensionRegistry = opts.extensionRegistry
    this.uppyService = opts.uppyService

    this.quotaCheckEnabled = opts.quotaCheckEnabled ?? true
    this.directoryTreeCreateEnabled = opts.directoryTreeCreateEnabled ?? true
    this.conflictHandlingEnabled = opts.conflictHandlingEnabled ?? true

    this.handleUpload = this.handleUpload.bind(this)
  }

  removeFilesFromUpload(filesToUpload: OcUppyFile[]) {
    for (const file of filesToUpload) {
      this.uppy.removeFile(file.id)
    }
  }

  getUploadPluginName() {
    return this.uppy.getPlugin('Tus') ? 'tus' : 'xhrUpload'
  }

  getUploadFolder(uploadId: string): Resource {
    // check if an upload folder has been set for this upload id
    if (uploadId && this.uppyService.uploadFolderMap[uploadId]) {
      return this.uppyService.uploadFolderMap[uploadId]
    }

    // fall back to current folder
    return this.resourcesStore.currentFolder
  }

  isCurrentFolder(uploadFolder?: Resource): boolean {
    const currentFolder = this.resourcesStore.currentFolder
    if (!uploadFolder || !currentFolder) {
      return false
    }
    return (
      uploadFolder.storageId === currentFolder.storageId && uploadFolder.path === currentFolder.path
    )
  }

  /**
   * Converts the input files type UppyResources and updates the uppy upload queue
   */
  prepareFiles(files: OcUppyFile[], uploadFolder: Resource): OcUppyFile[] {
    const filesToUpload: Record<string, OcUppyFile> = {}

    if (!this.resourcesStore.currentFolder && unref(this.route)?.params?.token) {
      // public file drop
      const publicLinkToken = queryItemAsString(unref(this.route).params.token)
      let endpoint = urlJoin(
        this.clientService.webdav.getPublicFileUrl(unref(this.space), publicLinkToken),
        { trailingSlash: true }
      )

      for (const file of files) {
        if (!this.uppy.getPlugin('Tus')) {
          endpoint = urlJoin(endpoint, encodeURIComponent(file.name))
        }

        file[this.getUploadPluginName()] = { endpoint }
        file.meta = {
          ...file.meta,
          tusEndpoint: endpoint,
          uploadId: uuidV4(),
          isFolder: file.type === 'directory'
        }

        filesToUpload[file.id] = file
      }
      this.uppy.setState({ files: { ...this.uppy.getState().files, ...filesToUpload } })
      return Object.values(filesToUpload)
    }
    const { id: currentFolderId, path: currentFolderPath } = uploadFolder

    const { name, params, query } = unref(this.route)
    const topLevelFolderIds: Record<string, string> = {}

    for (const file of files) {
      const relativeFilePath = file.meta.relativePath
      // Directory without filename
      const directory =
        !relativeFilePath || dirname(relativeFilePath) === '.' ? '' : dirname(relativeFilePath)

      let topLevelFolderId: string
      if (relativeFilePath) {
        const topLevelDirectory = relativeFilePath.split('/').filter(Boolean)[0]
        if (!topLevelFolderIds[topLevelDirectory]) {
          topLevelFolderIds[topLevelDirectory] = uuidV4()
        }
        topLevelFolderId = topLevelFolderIds[topLevelDirectory]
      }

      const webDavUrl = unref(this.space).getWebDavUrl({
        path: currentFolderPath.split('/').map(encodeURIComponent).join('/')
      })

      let endpoint = urlJoin(webDavUrl, directory.split('/').map(encodeURIComponent).join('/'))
      if (!this.uppy.getPlugin('Tus')) {
        endpoint = urlJoin(endpoint, encodeURIComponent(file.name))
      }

      file[this.getUploadPluginName()] = { endpoint }
      file.meta = {
        ...file.meta,
        // file data
        name: file.name,
        mtime: (file.data as File).lastModified / 1000,
        isFolder: file.type === 'directory',
        // current path & space
        spaceId: unref(this.space).id,
        spaceName: unref(this.space).name,
        driveAlias: unref(this.space).driveAlias,
        driveType: unref(this.space).driveType,
        currentFolder: currentFolderPath,
        currentFolderId,
        // upload data
        uppyId: this.uppyService.generateUploadId(file),
        relativeFolder: directory,
        tusEndpoint: endpoint,
        uploadId: uuidV4(),
        topLevelFolderId,
        // route data
        routeName: name as string,
        routeDriveAliasAndItem: queryItemAsString(params?.driveAliasAndItem) || '',
        routeShareId: queryItemAsString(query?.shareId) || ''
      }

      if (file.type === 'directory') {
        // folder files need their name appended to the relative folder
        // so they can be created correctly. otherwise, only the parent directories
        // would be created (because that's the behavior with files).
        file.meta.relativeFolder = urlJoin(file.meta.relativeFolder, file.name)
      }

      filesToUpload[file.id] = file
    }

    this.uppy.setState({ files: { ...this.uppy.getState().files, ...filesToUpload } })
    return Object.values(filesToUpload)
  }

  checkQuotaExceeded(filesToUpload: OcUppyFile[]): boolean {
    let quotaExceeded = false

    const uploadSizeSpaceMapping = filesToUpload.reduce((acc, uppyFile) => {
      let targetUploadSpace: SpaceResource

      if (uppyFile.meta.routeName === locationPublicLink.name) {
        return acc
      }

      if (uppyFile.meta.routeName === locationSpacesGeneric.name) {
        targetUploadSpace = this.spacesStore.spaces.find(({ id }) => id === uppyFile.meta.spaceId)
      }

      if (
        !targetUploadSpace ||
        isShareSpaceResource(targetUploadSpace) ||
        (isPersonalSpaceResource(targetUploadSpace) &&
          !targetUploadSpace.isOwner(this.userStore.user))
      ) {
        return acc
      }

      const existingFile = this.resourcesStore.resources.find(
        (c) => !uppyFile.meta.relativeFolder && c.name === uppyFile.name
      )
      const existingFileSize = existingFile ? Number(existingFile.size) : 0

      const matchingMappingRecord = acc.find(
        (mappingRecord) => mappingRecord.space.id === targetUploadSpace.id
      )

      if (!matchingMappingRecord) {
        acc.push({
          space: targetUploadSpace,
          uploadSize: uppyFile.data.size - existingFileSize
        })
        return acc
      }

      matchingMappingRecord.uploadSize = uppyFile.data.size - existingFileSize

      return acc
    }, [])

    const { $gettext } = this.language
    uploadSizeSpaceMapping.forEach(({ space, uploadSize }) => {
      if (space.spaceQuota.remaining && space.spaceQuota.remaining < uploadSize) {
        let spaceName = space.name

        if (space.driveType === 'personal') {
          spaceName = $gettext('Personal')
        }

        this.messageStore.showErrorMessage({
          title: $gettext('Insufficient quota'),
          desc: $gettext(
            'Insufficient quota on %{spaceName}. You need additional %{missingSpace} to upload these files',
            {
              spaceName,
              missingSpace: formatFileSize(
                (space.spaceQuota.remaining - uploadSize) * -1,
                this.language.current
              )
            }
          )
        })

        quotaExceeded = true
      }
    })

    return quotaExceeded
  }

  /**
   * Creates the directory tree and removes files of failed directories from the upload queue.
   */
  async createDirectoryTree(
    filesToUpload: OcUppyFile[],
    uploadFolder: Resource,
    mergedFolders: string[] = [],
    vaultEngine: FolderVaultEngine | null = null
  ): Promise<{ filesToUpload: OcUppyFile[]; folderFiles: OcUppyFile[] }> {
    const { webdav } = this.clientService
    const space = unref(this.space)
    const { id: currentFolderId, path: currentFolderPath } = uploadFolder

    const routeName = filesToUpload[0].meta.routeName
    const routeDriveAliasAndItem = filesToUpload[0].meta.routeDriveAliasAndItem
    const routeShareId = filesToUpload[0].meta.routeShareId

    const failedFolders: string[] = []
    const directoryTree: Record<string, any> = {}
    const topLevelIds: Record<string, string> = {}

    // folder files are manually constructed folders.
    // they should not be part of the Uppy upload queue (which only knows files)
    // and will be created separately. they need to be filtered out later.
    const folderFiles: OcUppyFile[] = []

    for (const file of filesToUpload.filter(({ meta }) => !!meta.relativeFolder)) {
      if (file.type === 'directory') {
        folderFiles.push(file)
      }

      const folders = file.meta.relativeFolder.split('/').filter(Boolean)
      let current = directoryTree
      // first folder is always top level
      topLevelIds[urlJoin(folders[0])] = file.meta.topLevelFolderId
      for (const folder of folders) {
        current[folder] = current[folder] || {}
        current = current[folder]
      }
    }

    const createDirectoryLevel = async (current: Record<string, any>, path = '') => {
      if (path) {
        const isRoot = path.split('/').length <= 1
        path = urlJoin(path, { leadingSlash: true })
        const uploadId = !isRoot ? uuidV4() : topLevelIds[path]
        const relativeFolder = dirname(path) === '/' ? '' : dirname(path)

        const uppyFile = {
          id: uuidV4(),
          name: basename(path),
          type: 'folder',
          meta: {
            spaceId: space.id,
            spaceName: space.name,
            driveAlias: space.driveAlias,
            driveType: space.driveType,
            currentFolder: currentFolderPath,
            currentFolderId,
            relativeFolder,
            uploadId,
            routeName,
            routeDriveAliasAndItem,
            routeShareId,
            isFolder: true
          }
        }

        if (failedFolders.includes(relativeFolder)) {
          // return if top level folder failed to create
          return
        }

        this.uppyService.publish('addedForUpload', [uppyFile])

        try {
          // Inside a vault every path segment we create on the server must
          // be ciphertext. The directoryTree itself stays in cleartext for
          // tracking purposes; we only translate the path right before the
          // MKCOL call.
          const cleartextPath = urlJoin(currentFolderPath, path)
          const mkcolPath = vaultEngine
            ? await vaultEngine.encryptPath(cleartextPath)
            : cleartextPath
          const folder = await webdav.createFolder(space, {
            path: mkcolPath,
            fetchFolder: isRoot // FIXME: remove once we get the fileId from the server here
          })
          this.uppyService.publish('uploadSuccess', {
            ...uppyFile,
            meta: { ...uppyFile.meta, fileId: folder?.fileId }
          })
        } catch (error) {
          if (error.statusCode !== 405) {
            console.error(error)
            failedFolders.push(path)
            this.uppyService.publish('uploadError', { file: uppyFile, error })
          } else if (isRoot && mergedFolders.includes(basename(path))) {
            // top-level folder already exists because the user chose to merge - count it as uploaded
            this.uppyService.publish('uploadSuccess', { ...uppyFile })
          }
        }
      }

      const foldersToBeCreated = Object.keys(current)
      const promises: Promise<unknown>[] = []
      for (const folder of foldersToBeCreated) {
        promises.push(createDirectoryLevel(current[folder], join(path, folder)))
      }
      return Promise.allSettled(promises)
    }

    await createDirectoryLevel(directoryTree)

    let filesToRemove: string[] = []
    if (failedFolders.length || folderFiles.length) {
      // remove files of folders that could not be created and folder files
      filesToRemove = filesToUpload
        .filter(
          (f) => f.meta.isFolder || failedFolders.some((r) => f.meta.relativeFolder.startsWith(r))
        )
        .map(({ id }) => id)

      for (const fileId of filesToRemove) {
        this.uppy.removeFile(fileId)
      }
    }

    return {
      filesToUpload: filesToUpload.filter(({ id }) => !filesToRemove.includes(id)),
      folderFiles
    }
  }

  /**
   * The handler that prepares all files to be uploaded and goes through all necessary steps.
   * Eventually triggers to upload in Uppy.
   */
  async handleUpload(files: OcUppyFile[]) {
    if (!files.length) {
      return
    }

    const uploadId = files[0].meta?.uploadId
    const uploadFolder = this.getUploadFolder(uploadId)
    let filesToUpload = this.prepareFiles(files, uploadFolder)

    // Vault-aware upload: when the target folder lives inside a vault, swap
    // every file's content for its ciphertext and rewrite the upload endpoint
    // to the encrypted server path before Uppy starts pushing bytes. Folder
    // creation (MKCOL) inside createDirectoryTree is vault-aware too — it
    // pulls the engine out of the same registry.
    const vaultEngine = resolveFolderVault(
      this.extensionRegistry,
      unref(this.space),
      uploadFolder?.path
    )
    if (vaultEngine) {
      filesToUpload = await this.applyVaultEncryption(filesToUpload, uploadFolder, vaultEngine)
    }

    if (!this.directoryTreeCreateEnabled) {
      // if directory tree creation is disabled, we need to remove all folder files
      // from the upload queue (both locally and from Uppy's state to prevent upload attempts)
      const directoryFiles = filesToUpload.filter((file) => file.type === 'directory')
      this.removeFilesFromUpload(directoryFiles)
      filesToUpload = filesToUpload.filter((file) => file.type !== 'directory')
      if (!filesToUpload.length) {
        // if there are no files left to upload, we can clear the inputs and do nothing
        this.uppyService.clearInputs()
        return
      }
    }

    // quota check
    if (this.quotaCheckEnabled) {
      const quotaExceeded = this.checkQuotaExceeded(filesToUpload)
      if (quotaExceeded) {
        this.removeFilesFromUpload(filesToUpload)
        return this.uppyService.clearInputs()
      }
    }

    // name conflict handling. skipped when uploads target a folder other than the
    // user's current one (caller used setUploadFolder, e.g. unzip extracting into a
    // fresh folder). getConflicts only checks the current folder and would fire
    // false positives in that case.
    let mergedFolders: string[] = []
    if (this.conflictHandlingEnabled && this.isCurrentFolder(uploadFolder)) {
      const conflictHandler = new UploadResourceConflict(this.resourcesStore, this.language)
      const conflicts = conflictHandler.getConflicts(filesToUpload)
      if (conflicts.length) {
        const dashboard = document.getElementsByClassName('uppy-Dashboard')
        if (dashboard.length) {
          ;(dashboard[0] as HTMLElement).style.display = 'none'
        }

        const result = await conflictHandler.displayOverwriteDialog(filesToUpload, conflicts)
        if (result.files.length === 0) {
          this.removeFilesFromUpload(filesToUpload)
          return this.uppyService.clearInputs()
        }

        filesToUpload = result.files
        mergedFolders = result.mergedFolders
        const conflictMap = result.files.reduce<Record<string, OcUppyFile>>((acc, file) => {
          acc[file.id] = file
          return acc
        }, {})
        this.uppy.setState({ files: { ...this.uppy.getState().files, ...conflictMap } })
      }
    }

    this.uppyService.publish('uploadStarted')
    let folderFiles: OcUppyFile[] = []
    if (this.directoryTreeCreateEnabled) {
      const result = await this.createDirectoryTree(
        filesToUpload,
        uploadFolder,
        mergedFolders,
        vaultEngine
      )
      filesToUpload = result.filesToUpload
      folderFiles = result.folderFiles
    }

    if (!filesToUpload.length) {
      const successful: OcUppyFile[] = []
      if (folderFiles.length) {
        // case where only empty folders have been uploaded
        successful.push(...folderFiles)
      }
      this.uppyService.publish('uploadCompleted', { successful })
      this.uppyService.removeUploadFolder(uploadId)
      return this.uppyService.clearInputs()
    }

    this.uppyService.publish('addedForUpload', filesToUpload)
    this.uppyService.uploadFiles()
    this.uppyService.removeUploadFolder(uploadId)
  }

  /**
   * Replace each file's content + name with their encrypted forms and rewrite
   * the upload endpoint so Uppy/Tus pushes ciphertext to the encrypted
   * server path. Sub-paths inside a drag-drop are walked segment-by-segment
   * — every segment of `relativeFolder` ends up as ciphertext on the wire,
   * even though we keep the original cleartext tree on `file.meta` for
   * progress UI / directory creation tracking.
   */
  private async applyVaultEncryption(
    filesToUpload: OcUppyFile[],
    uploadFolder: Resource,
    vaultEngine: FolderVaultEngine
  ): Promise<OcUppyFile[]> {
    const space = unref(this.space)
    const encryptedFolderPath = await vaultEngine.encryptPath(uploadFolder.path)

    const updated: Record<string, OcUppyFile> = {}
    for (const file of filesToUpload) {
      if (file.type === 'directory') {
        // Folder entries don't get an HTTP payload of their own — the MKCOLs
        // happen in createDirectoryTree (which is also vault-aware). Skip
        // here so we don't try to encrypt a non-existent content stream.
        continue
      }

      // Walk the cleartext relativeFolder segment-by-segment so each part
      // is encrypted independently (rclone-crypt's filename EME operates
      // per segment) and join the ciphertext segments back into a path the
      // server understands.
      const clearRelative = file.meta.relativeFolder || ''
      const encryptedRelativeSegments: string[] = []
      for (const segment of clearRelative.split('/').filter(Boolean)) {
        encryptedRelativeSegments.push(await vaultEngine.encryptName(segment, uploadFolder.path))
      }
      const encryptedRelativeFolder = encryptedRelativeSegments.join('/')

      const encryptedName = await vaultEngine.encryptName(file.name, uploadFolder.path)

      // Feed the engine the Blob's native stream instead of materialising the
      // whole plaintext first. The engine internals still collect today
      // (lib only exposes `encryptData(Uint8Array)`), but keeping the
      // input side genuinely streamed means a future engine that emits
      // rclone-crypt blocks straight onto nacl can be swapped in without
      // touching this call site.
      //
      // FIXME(poc-vault): the output is still collected into a Blob because
      // Uppy + tus-js-client require `file.data` to be `Blob`-shaped with a
      // working `.slice()` for chunked uploads. End-to-end streaming would
      // need either a stream-aware uppy plugin or replacing the transport;
      // both are out of PoC scope. The engine API stays streaming so that
      // change lands as a pure replacement here.
      // Drive the engine end-to-end with streams. Collection only happens
      // because Uppy + tus need a sliceable Blob for file.data, not because
      // the engine API forces it.
      const cipherBlob = await streamToBlob(
        vaultEngine.encryptContent((file.data as Blob).stream()),
        'application/octet-stream'
      )

      const endpointFolder = urlJoin(encryptedFolderPath, encryptedRelativeFolder)
      const endpointFolderUrl = space.getWebDavUrl({
        path: endpointFolder.split('/').map(encodeURIComponent).join('/')
      })
      let endpoint = endpointFolderUrl
      if (!this.uppy.getPlugin('Tus')) {
        endpoint = urlJoin(endpoint, encodeURIComponent(encryptedName))
      }

      // Mutate in-place so existing meta (uploadId, spaceId, …) is preserved.
      // We keep meta.relativeFolder in cleartext on purpose — directoryTree
      // creation reads it to decide which folders to MKCOL and translates
      // the path itself at the very last step.
      file.data = cipherBlob
      file.size = cipherBlob.size
      file.name = encryptedName
      file[this.getUploadPluginName()] = { endpoint }
      file.meta = {
        ...file.meta,
        name: encryptedName,
        tusEndpoint: endpoint
      }
      updated[file.id] = file
    }
    this.uppy.setState({ files: { ...this.uppy.getState().files, ...updated } })
    return filesToUpload
  }

  install() {
    this.uppy.on('files-added', this.handleUpload)
  }

  uninstall() {
    this.uppy.off('files-added', this.handleUpload)
  }
}
