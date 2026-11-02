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
  useExtensionRegistry
} from '../../composables'
import { unref } from 'vue'
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

    const loader = this.loaders.find((l) => l.isEnabled() && l.isActive(unref(router)))
    if (!loader) {
      console.debug('No folder loader found for route')
      return
    }

    return useTask(function* (...args) {
      const [signal] = args
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
      } finally {
        resourcesStore.finishResourcesLoading()
      }
    })
  }
}

export const folderService = new FolderService()
