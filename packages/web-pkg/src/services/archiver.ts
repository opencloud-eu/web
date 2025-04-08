// Workaround https://github.com/npm/node-semver/issues/381

// @ts-ignore
import major from 'semver/functions/major'

// @ts-ignore
import rcompare from 'semver/functions/rcompare'

import { RuntimeError } from '../errors'
import { HttpError } from '@opencloud-eu/web-client'
import { ClientService } from '../services'
import { urlJoin } from '@opencloud-eu/web-client'
import { triggerDownloadWithFilename } from '../helpers/download'

import { Ref, ref, computed, unref } from 'vue'
import { ArchiverCapability } from '@opencloud-eu/web-client/ocs'
import { UserStore } from '../composables'

interface TriggerDownloadOptions {
  dir?: string
  files?: string[]
  fileIds?: string[]
  downloadSecret?: string
  publicToken?: string
  publicLinkPassword?: string
}

export class ArchiverService {
  clientService: ClientService
  userStore: UserStore
  serverUrl: string
  capability: Ref<ArchiverCapability>
  available: Ref<boolean>
  fileIdsSupported: Ref<boolean>

  constructor(
    clientService: ClientService,
    userStore: UserStore,
    serverUrl: string,
    archiverCapabilities: Ref<ArchiverCapability[]> = ref([])
  ) {
    this.clientService = clientService
    this.userStore = userStore
    this.serverUrl = serverUrl
    this.capability = computed(() => {
      const archivers = unref(archiverCapabilities)
        .filter((a) => a.enabled)
        .sort((a1, a2) => rcompare(a1.version, a2.version))
      return archivers.length ? archivers[0] : null
    })

    this.available = computed(() => {
      return !!unref(this.capability)?.version
    })

    this.fileIdsSupported = computed(() => {
      return major(unref(this.capability)?.version) >= 2
    })
  }

  public async triggerDownload(options: TriggerDownloadOptions): Promise<string> {
    if (!unref(this.available)) {
      throw new RuntimeError('no archiver available')
    }

    if ((options.fileIds?.length || 0) + (options.files?.length || 0) === 0) {
      throw new RuntimeError('requested archive with empty list of resources')
    }

    const downloadUrl = this.buildDownloadUrl({ ...options })
    if (!downloadUrl) {
      throw new RuntimeError('download url could not be built')
    }

    const url = options.publicToken
      ? downloadUrl
      : await this.clientService.ocsUserContext.signUrl(
          downloadUrl,
          this.userStore.user?.onPremisesSamAccountName
        )

    try {
      // use fetch because we can't reliably retrieve large data streams with axios
      const response = await fetch(url, {
        headers: {
          ...this.clientService.getRequestHeaders({ useAuth: !options.publicLinkPassword }),
          ...(!!options.publicLinkPassword && {
            Authorization:
              'Basic ' +
              Buffer.from(['public', options.publicLinkPassword].join(':')).toString('base64')
          })
        }
      })

      if (!response.ok) {
        throw new HttpError('', response)
      }

      const blob = await response.blob()
      const objectUrl = URL.createObjectURL(blob)
      const fileName = this.getFileNameFromResponseHeaders(response.headers)
      triggerDownloadWithFilename(objectUrl, fileName)
      return url
    } catch (e) {
      throw new HttpError('archive could not be fetched', e.response)
    }
  }

  private buildDownloadUrl(options: TriggerDownloadOptions): string {
    const queryParams = []
    if (options.publicToken) {
      queryParams.push(`public-token=${options.publicToken}`)
    }

    const majorVersion = major(unref(this.capability).version)
    switch (majorVersion) {
      case 2: {
        queryParams.push(...options.fileIds.map((id) => `id=${id}`))
        return this.url + '?' + queryParams.join('&')
      }
      case 1: {
        const downloadStartSecret = Math.random().toString(36).substring(2)
        queryParams.push(
          `dir=${encodeURIComponent(options.dir)}`,
          ...options.files.map((name) => `files[]=${encodeURIComponent(name)}`),
          `downloadStartSecret=${downloadStartSecret}`
        )
        return this.url + '?' + queryParams.join('&')
      }
      default: {
        return undefined
      }
    }
  }

  private get url(): string {
    if (!this.available) {
      throw new RuntimeError('no archiver available')
    }
    const capability = unref(this.capability)
    if (/^https?:\/\//i.test(capability.archiver_url)) {
      return capability.archiver_url
    }
    return urlJoin(this.serverUrl, capability.archiver_url)
  }

  private getFileNameFromResponseHeaders(headers: Headers) {
    const fileName = headers.get('content-disposition')?.split('"')[1]
    return decodeURI(fileName)
  }
}
