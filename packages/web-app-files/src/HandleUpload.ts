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
  VaultEngine,
  MessageStore,
  ResourcesStore,
  SpacesStore,
  UserStore,
  locationPublicLink,
  formatFileSize,
  OcUppyFile,
  OcUppyMeta,
  OcUppyBody,
  resolveVaultEngine,
  encryptVaultPath,
  getVaultNameMaxBytes,
  getTextByteSize,
  streamToBlob
} from '@opencloud-eu/web-pkg'
import { locationSpacesGeneric, UppyService } from '@opencloud-eu/web-pkg'
import { isPersonalSpaceResource, isShareSpaceResource } from '@opencloud-eu/web-client'
import { ClientService, queryItemAsString } from '@opencloud-eu/web-pkg'
import { PluginOpts } from '@uppy/core'
import { keyBy } from 'lodash-es'

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
 * 2. handle potential naming conflicts
 * 3. check quota if spaces are enabled
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
   * Converts the input files to UppyResources
   */
  prepareFiles(files: OcUppyFile[], uploadFolder: Resource): OcUppyFile[] {
    const filesToUpload: Record<string, OcUppyFile> = {}

    if (!this.resourcesStore.currentFolder && unref(this.route)?.params?.token) {
      // public file drop
      const publicLinkToken = queryItemAsString(unref(this.route).params.token)
      const baseEndpoint = urlJoin(
        this.clientService.webdav.getPublicFileUrl(unref(this.space), publicLinkToken),
        { trailingSlash: true }
      )

      for (const file of files) {
        let endpoint = baseEndpoint
        if (!this.uppy.getPlugin('Tus')) {
          endpoint = urlJoin(baseEndpoint, encodeURIComponent(file.name))
        }

        file[this.getUploadPluginName()] = { endpoint }
        file.meta = {
          ...file.meta,
          name: file.name,
          mtime: (file.data as File).lastModified / 1000,
          tusEndpoint: endpoint,
          uploadId: uuidV4(),
          isFolder: file.type === 'directory'
        }

        filesToUpload[file.id] = file
      }
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

    return Object.values(filesToUpload)
  }

  checkQuotaExceeded(filesToUpload: OcUppyFile[], mergedFolders: string[] = []): boolean {
    let quotaExceeded = false

    const uploadSizeSpaceMapping = filesToUpload.reduce((acc, uppyFile) => {
      let targetUploadSpace: SpaceResource

      // folder dummies have no size and would turn the summed upload size into NaN
      if (uppyFile.type === 'directory' || uppyFile.meta.routeName === locationPublicLink.name) {
        return acc
      }

      // existing file sizes in merged folders are unknown, the server enforces the quota there
      if (mergedFolders.some((folder) => uppyFile.meta.relativeFolder.split('/')[1] === folder)) {
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
      // remote files may have an unknown size, which would turn the sum into NaN
      const uploadSize = (uppyFile.data.size || 0) - existingFileSize

      const matchingMappingRecord = acc.find(
        (mappingRecord) => mappingRecord.space.id === targetUploadSpace.id
      )

      if (!matchingMappingRecord) {
        acc.push({
          space: targetUploadSpace,
          uploadSize
        })
        return acc
      }

      matchingMappingRecord.uploadSize += uploadSize

      return acc
    }, [])

    const { $gettext } = this.language
    uploadSizeSpaceMapping.forEach(({ space, uploadSize }) => {
      if (
        typeof space.spaceQuota.remaining === 'number' &&
        space.spaceQuota.remaining < uploadSize
      ) {
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
   * Filters out files whose name or folder names are too long
   * for the vault they get uploaded into, since their encrypted names would be
   * rejected by the server.
   */
  removeVaultNamesTooLong(filesToUpload: OcUppyFile[], uploadFolder: Resource): OcUppyFile[] {
    const maxNameBytes = getVaultNameMaxBytes(
      this.extensionRegistry,
      unref(this.space),
      uploadFolder?.path
    )
    if (!maxNameBytes) {
      return filesToUpload
    }

    const namesTooLong = new Set<string>()
    const filesTooLong = new Set<OcUppyFile>()
    for (const file of filesToUpload) {
      const segments = urlJoin(file.meta.relativeFolder || '', file.name)
        .split('/')
        .filter(Boolean)
      const tooLong = segments.filter((segment) => getTextByteSize(segment) > maxNameBytes)
      if (tooLong.length) {
        tooLong.forEach((segment) => namesTooLong.add(segment))
        filesTooLong.add(file)
      }
    }
    if (!filesTooLong.size) {
      return filesToUpload
    }

    const { $gettext, $ngettext } = this.language
    const [shownName] = namesTooLong
    const hiddenCount = namesTooLong.size - 1
    this.messageStore.showErrorMessage({
      title: $ngettext(
        'Name too long for an encrypted folder',
        'Names too long for an encrypted folder',
        namesTooLong.size
      ),
      desc: hiddenCount
        ? $ngettext(
            '»%{name}« and %{count} more could not be uploaded.',
            '»%{name}« and %{count} more could not be uploaded.',
            hiddenCount,
            { name: shownName, count: hiddenCount.toString() }
          )
        : $gettext('»%{name}« could not be uploaded.', { name: shownName })
    })
    return filesToUpload.filter((file) => !filesTooLong.has(file))
  }

  /**
   * Creates the directory tree and filters out files of failed directories and folder files.
   */
  async createDirectoryTree(
    filesToUpload: OcUppyFile[],
    uploadFolder: Resource,
    mergedFolders: string[] = []
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
          const folder = await webdav.createFolder(space, {
            path: urlJoin(currentFolderPath, path),
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

    return {
      filesToUpload: filesToUpload.filter(
        (f) =>
          !folderFiles.includes(f) &&
          !failedFolders.some((r) => f.meta.relativeFolder.startsWith(r))
      ),
      folderFiles
    }
  }

  /**
   * Holds the added files back from Uppy while uploadBatch prepares them, since another
   * batch's upload() would upload them early.
   */
  async handleUpload(files: OcUppyFile[]) {
    if (!files.length) {
      return
    }

    const uploadId = files[0].meta?.uploadId
    const uploadFolder = this.getUploadFolder(uploadId)
    const preparedFiles = this.prepareFiles(files, uploadFolder)

    const cancelController = new AbortController()
    // released on cancel right away so the files can be dropped again while preparation winds down
    const onCancel = () => {
      cancelController.abort()
      this.uppyService.releaseHeldBackFiles(preparedFiles)
    }
    this.uppyService.holdBackFiles(preparedFiles)
    this.uppy.on('cancel-all', onCancel)
    try {
      await this.uploadBatch(preparedFiles, uploadFolder, uploadId, cancelController.signal)
    } finally {
      this.uppy.off('cancel-all', onCancel)
      // after a cancel, a new batch may already hold the same files
      if (!cancelController.signal.aborted) {
        this.uppyService.releaseHeldBackFiles(preparedFiles)
      }
    }
  }

  /**
   * Prepares all files to be uploaded and goes through all necessary steps.
   * Puts the files to upload back into Uppy and eventually triggers the upload.
   */
  private async uploadBatch(
    preparedFiles: OcUppyFile[],
    uploadFolder: Resource,
    uploadId: string,
    cancelSignal: AbortSignal
  ) {
    let filesToUpload = preparedFiles

    if (!this.directoryTreeCreateEnabled) {
      filesToUpload = filesToUpload.filter((file) => file.type !== 'directory')
      if (!filesToUpload.length) {
        // if there are no files left to upload, we can clear the inputs and do nothing
        this.uppyService.clearInputs()
        return
      }
    }

    filesToUpload = this.removeVaultNamesTooLong(filesToUpload, uploadFolder)
    if (!filesToUpload.length) {
      return this.uppyService.clearInputs()
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
        if (result.dismissed) {
          const { $gettext } = this.language
          this.messageStore.showMessage({
            title: $gettext('Upload cancelled'),
            desc: $gettext('The conflict dialog was closed, no files were uploaded.'),
            status: 'warning'
          })
        }
        if (result.files.length === 0) {
          return this.uppyService.clearInputs()
        }

        filesToUpload = result.files
        mergedFolders = result.mergedFolders

        // "keep both" appends a suffix, which can push a name past the vault limit
        filesToUpload = this.removeVaultNamesTooLong(filesToUpload, uploadFolder)
        if (!filesToUpload.length) {
          return this.uppyService.clearInputs()
        }
      }
    }

    // quota check after the conflict handling, so that only files that will actually be uploaded count
    if (this.quotaCheckEnabled) {
      const quotaExceeded = this.checkQuotaExceeded(filesToUpload, mergedFolders)
      if (quotaExceeded) {
        return this.uppyService.clearInputs()
      }
    }

    // Vault-aware upload: when the target folder lives inside a vault, swap
    // every file's content for its ciphertext and rewrite the upload endpoint
    // to the encrypted server path before Uppy starts pushing bytes. Folder
    // creation (MKCOL) inside createDirectoryTree is vault-aware too - it
    // pulls the engine out of the same registry.
    //
    // This MUST run *after* conflict handling: getConflicts compares file
    // names against the (cleartext) resource store, so encrypting names any
    // earlier would hide every real name collision and silently overwrite.
    // It also encrypts the cleartext names produced by a "keep both" choice.
    const vaultEngine = await resolveVaultEngine(
      this.extensionRegistry,
      unref(this.space),
      uploadFolder?.path
    )
    if (vaultEngine) {
      filesToUpload = await this.applyVaultEncryption(filesToUpload, uploadFolder, vaultEngine)
    }

    if (cancelSignal.aborted) {
      return this.uppyService.clearInputs()
    }

    this.uppyService.publish('uploadStarted')
    let folderFiles: OcUppyFile[] = []
    if (this.directoryTreeCreateEnabled) {
      const result = await this.createDirectoryTree(filesToUpload, uploadFolder, mergedFolders)
      filesToUpload = result.filesToUpload
      folderFiles = result.folderFiles
    }

    if (cancelSignal.aborted) {
      return this.uppyService.clearInputs()
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
    this.uppy.setState({
      files: { ...this.uppy.getState().files, ...keyBy(filesToUpload, 'id') }
    })
    this.uppyService.uploadFiles()
    this.uppyService.removeUploadFolder(uploadId)
  }

  /**
   * Replace each file's content + name with their encrypted forms and rewrite
   * the upload endpoint so Uppy/Tus pushes ciphertext to the encrypted
   * server path. Sub-paths inside a drag-drop are walked segment-by-segment
   * - every segment of `relativeFolder` ends up as ciphertext on the wire,
   * even though we keep the original cleartext tree on `file.meta` for
   * progress UI / directory creation tracking.
   */
  private async applyVaultEncryption(
    filesToUpload: OcUppyFile[],
    uploadFolder: Resource,
    vaultEngine: VaultEngine
  ): Promise<OcUppyFile[]> {
    const space = unref(this.space)
    const encryptedFolderPath = await encryptVaultPath(vaultEngine, uploadFolder.path)

    for (const file of filesToUpload) {
      if (file.type === 'directory') {
        // Folder entries don't get an HTTP payload of their own - the MKCOLs
        // happen in createDirectoryTree (which is also vault-aware). Skip
        // here so we don't try to encrypt a non-existent content stream.
        continue
      }

      // relativeFolder is already relative to the upload target, so encrypt it
      // as one vault-relative path (the engine handles its own segments). The
      // filename is just a one-segment path.
      const clearRelative = file.meta.relativeFolder || ''
      const encryptedRelativeFolder = clearRelative
        ? await vaultEngine.encryptPath(clearRelative)
        : ''
      const encryptedName = await vaultEngine.encryptPath(file.name)

      // TODO(vault): the engine streams block by block, but the output is still
      // collected into a Blob because Uppy + tus-js-client require `file.data`
      // to be `Blob`-shaped with a working `.slice()` for chunked uploads.
      // End-to-end streaming needs a custom tus fileReader that encrypts
      // each requested slice on demand.
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
      // We keep meta.relativeFolder in cleartext on purpose - directoryTree
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
    }
    return filesToUpload
  }

  install() {
    this.uppy.on('files-added', this.handleUpload)
  }

  uninstall() {
    this.uppy.off('files-added', this.handleUpload)
  }
}
