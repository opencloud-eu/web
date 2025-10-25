import { RuntimeError } from '../errors'
import { urlJoin } from '@opencloud-eu/web-client'
import { ClientService } from '../services'
import { triggerDownloadWithFilename } from '../helpers/download'
import { Ref, ref, computed, unref } from 'vue'
import { ArchiverCapability } from '@opencloud-eu/web-client/ocs'
import { UserStore } from '../composables'
import { compareVersions } from '../utils'

interface TriggerDownloadOptions {
  files?: string[]
  fileIds?: string[]
  publicToken?: string
}

export class ArchiverService {
  clientService: ClientService
  userStore: UserStore
  serverUrl: string
  capability: Ref<ArchiverCapability>
  available: Ref<boolean>

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
        .sort((a1, a2) => compareVersions(a2.version, a1.version))
      return archivers.length ? archivers[0] : null
    })

    this.available = computed(() => {
      return !!unref(this.capability)?.version
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
      : await this.clientService.ocs.signUrl(
          downloadUrl,
          this.userStore.user?.onPremisesSamAccountName
        )

    triggerDownloadWithFilename(url)
    return url
  }

  private buildDownloadUrl(options: TriggerDownloadOptions): string {
    const queryParams = []
    if (options.publicToken) {
      queryParams.push(`public-token=${options.publicToken}`)
    }

    queryParams.push(...options.fileIds.map((id) => `id=${id}`))
    return this.url + '?' + queryParams.join('&')
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
}
