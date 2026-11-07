import { Router } from 'vue-router'
import { Task, useTask } from 'vue-concurrency'
import {
  useRouter,
  useClientService,
  useUserStore,
  UserStore,
  SpacesStore,
  useSpacesStore,
  CapabilityStore,
  useCapabilityStore,
  useConfigStore,
  ConfigStore,
  ResourcesStore,
  useResourcesStore,
  SharesStore,
  useSharesStore,
  useAuthService,
  AuthServiceInterface,
  ExtensionRegistry,
  useExtensionRegistry,
  useMessages
} from '../../composables'
import { unref } from 'vue'
import { useGettext } from 'vue3-gettext'
import { ClientService } from '../../services'

import {
  FolderLoaderSpace,
  FolderLoaderFavorites,
  FolderLoaderSharedViaLink,
  FolderLoaderSharedWithMe,
  FolderLoaderSharedWithOthers,
  FolderLoaderTrashbin
} from './loaders'

export type FolderLoaderTask<T = any, TT = any> = Task<T, TT[]>

export type TaskContext = {
  clientService: ClientService
  configStore: ConfigStore
  userStore: UserStore
  spacesStore: SpacesStore
  router: Router
  capabilityStore: CapabilityStore
  resourcesStore: ResourcesStore
  sharesStore: SharesStore
  authService: AuthServiceInterface
  extensionRegistry: ExtensionRegistry
}

export interface FolderLoader {
  isEnabled(): boolean
  isActive(router: Router): boolean
  getTask(options: TaskContext): FolderLoaderTask
}

export class FolderService {
  private readonly loaders: FolderLoader[]

  constructor() {
    this.loaders = [
      new FolderLoaderSpace(),
      new FolderLoaderFavorites(),
      new FolderLoaderSharedViaLink(),
      new FolderLoaderSharedWithMe(),
      new FolderLoaderSharedWithOthers(),
      new FolderLoaderTrashbin()
    ]
  }

  public getTask(): FolderLoaderTask {
    const userStore = useUserStore()
    const spacesStore = useSpacesStore()
    const capabilityStore = useCapabilityStore()
    const router = useRouter()
    const clientService = useClientService()
    const configStore = useConfigStore()
    const resourcesStore = useResourcesStore()
    const sharesStore = useSharesStore()
    const authService = useAuthService()
    const extensionRegistry = useExtensionRegistry()
    const { showErrorMessage } = useMessages()
    const { $gettext } = useGettext()

    const loader = this.loaders.find((l) => l.isEnabled() && l.isActive(unref(router)))
    if (!loader) {
      console.debug('No folder loader found for route')
      return
    }

    // loads can overlap, only the latest one may report its failure
    let latestLoadId = 0

    return useTask(function* (...args) {
      const [signal] = args
      const loadId = ++latestLoadId
      const context = {
        clientService,
        configStore,
        userStore,
        spacesStore,
        capabilityStore,
        resourcesStore,
        sharesStore,
        router,
        authService,
        extensionRegistry
      }
      resourcesStore.startResourcesLoading()
      try {
        // cancel inner load with outer one so the loading state matches store writes
        yield loader
          .getTask(context)
          .perform(...args)
          .canceledOn(signal)
      } catch (e) {
        console.error(e)
        if (loadId !== latestLoadId) {
          return
        }
        const status = e?.statusCode || e?.response?.status
        if (status === 401) {
          // keep the load running until the auth error is handled, e.g. the token got renewed
          try {
            yield authService.handleAuthError(unref(router.currentRoute), e)
          } catch (authError) {
            console.error(authError)
          }
          return
        }
        // a missing resource is shown as such by the views
        if (status === 404) {
          return
        }
        showErrorMessage({ title: $gettext('Failed to load files'), errors: [e] })
      } finally {
        resourcesStore.finishResourcesLoading()
      }
    })
  }
}

export const folderService = new FolderService()
