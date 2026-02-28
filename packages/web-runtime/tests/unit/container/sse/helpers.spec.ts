import { Resource } from '@opencloud-eu/web-client'
import { createTestingPinia } from '@opencloud-eu/web-test-helpers'
import {
  ClientService,
  PreviewService,
  useAuthStore,
  useConfigStore,
  useMessages,
  useResourcesStore,
  useSharesStore,
  useSpacesStore,
  useUserStore
} from '@opencloud-eu/web-pkg'
import { mock, mockDeep } from 'vitest-mock-extended'
import { sseEventWrapper } from '../../../../src/container/sse'
import PQueue from 'p-queue'
import { Language } from 'vue3-gettext'
import { Router } from 'vue-router'

describe('helpers', () => {
  describe('method "sseEventWrapper"', () => {
    it('calls "console.debug" when executed', () => {
      console.debug = vi.fn()
      const topic = 'folder-created'
      const msg = mock<MessageEvent>({ data: JSON.stringify({ itemid: 'newfolder' }) })
      sseEventWrapper({
        msg,
        topic,
        method: () => {},
        ...getMocks()
      })
      expect(console.debug).toHaveBeenCalledWith(`SSE event '${topic}'`, { itemid: 'newfolder' })
    })
    it('calls "console.error" when error was thrown', () => {
      console.error = vi.fn()
      const topic = 'folder-created'
      const msg = mock<MessageEvent>({ data: JSON.stringify({ itemid: 'newfolder' }) })
      const error = new Error('processing failed')
      sseEventWrapper({
        msg,
        topic,
        method: () => {
          throw error
        },
        ...getMocks()
      })
      expect(console.error).toHaveBeenCalledWith(`Unable to process sse event ${topic}`, error)
    })
  })
})

const getMocks = ({
  currentFolder = mock<Resource>({
    id: 'currenFolder!currentFolder',
    isFolder: true,
    storageId: 'space1'
  })
}: { currentFolder?: Resource } = {}) => {
  createTestingPinia()
  const resourcesStore = useResourcesStore()
  resourcesStore.currentFolder = currentFolder
  const spacesStore = useSpacesStore()
  const messageStore = useMessages()
  const userStore = useUserStore()
  const configStore = useConfigStore()
  const sharesStore = useSharesStore()
  const authStore = useAuthStore()
  const clientService = mockDeep<ClientService>()
  const previewService = mockDeep<PreviewService>()
  const router = mockDeep<Router>()
  const language = mockDeep<Language>()
  const resourceQueue = mockDeep<PQueue>()

  return {
    resourcesStore,
    spacesStore,
    router,
    messageStore,
    userStore,
    sharesStore,
    configStore,
    authStore,
    clientService,
    previewService,
    resourceQueue,
    language
  }
}
