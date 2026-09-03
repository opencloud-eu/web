import { ref } from 'vue'
import { mock } from 'vitest-mock-extended'
import { Resource, SpaceResource } from '@opencloud-eu/web-client'
import { getComposableWrapper } from '@opencloud-eu/web-test-helpers'
import { useResourceLink } from '../../../../src/composables/resources'
import { ApplicationFileExtension } from '../../../../src/apps'

const { getDefaultActionMock, getFolderLinkMock } = vi.hoisted(() => ({
  getDefaultActionMock: vi.fn(),
  getFolderLinkMock: vi.fn()
}))

vi.mock('../../../../src/composables/actions/useFileActions', () => ({
  useFileActions: () => ({ getDefaultAction: getDefaultActionMock })
}))
vi.mock('../../../../src/composables/folderLink/useFolderLink', () => ({
  useFolderLink: () => ({ getFolderLink: getFolderLinkMock })
}))

const folderLink = { name: 'files-spaces-generic' }
const actionLink = { name: 'external-apps' }

describe('useResourceLink', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    getFolderLinkMock.mockReturnValue(folderLink)
  })

  describe('getResourceLink', () => {
    it('returns the folder link for plain folders without resolving the default action', () => {
      getWrapper({
        setup: ({ getResourceLink }) => {
          const resource = mock<Resource>({ isFolder: true, type: 'folder', extension: '' })

          expect(getResourceLink(resource)).toEqual(folderLink)
          expect(getDefaultActionMock).not.toHaveBeenCalled()
        }
      })
    })

    it('returns the default action route for folders claimed by an app', () => {
      getWrapper({
        fileExtensions: [{ extension: 'ocnb', type: 'folder' }],
        setup: ({ getResourceLink }) => {
          const resource = mock<Resource>({
            isFolder: true,
            type: 'folder',
            extension: 'ocnb'
          })
          getDefaultActionMock.mockReturnValue({ route: () => actionLink })

          expect(getResourceLink(resource)).toEqual(actionLink)
        }
      })
    })

    it('matches app folder extensions case-insensitively', () => {
      getWrapper({
        fileExtensions: [{ extension: 'ocnb', type: 'folder' }],
        setup: ({ getResourceLink }) => {
          const resource = mock<Resource>({
            isFolder: true,
            type: 'folder',
            extension: 'OCNB'
          })
          getDefaultActionMock.mockReturnValue({ route: () => actionLink })

          expect(getResourceLink(resource)).toEqual(actionLink)
        }
      })
    })

    it('returns the folder link for folders whose extension is only registered for files', () => {
      getWrapper({
        fileExtensions: [{ extension: 'ocnb', type: 'file' }],
        setup: ({ getResourceLink }) => {
          const resource = mock<Resource>({
            isFolder: true,
            type: 'folder',
            extension: 'ocnb'
          })

          expect(getResourceLink(resource)).toEqual(folderLink)
          expect(getDefaultActionMock).not.toHaveBeenCalled()
        }
      })
    })

    it('falls back to the folder link if an app folder has no default action route', () => {
      getWrapper({
        fileExtensions: [{ extension: 'ocnb', type: 'folder' }],
        setup: ({ getResourceLink }) => {
          const resource = mock<Resource>({
            isFolder: true,
            type: 'folder',
            extension: 'ocnb'
          })
          getDefaultActionMock.mockReturnValue(undefined)

          expect(getResourceLink(resource)).toEqual(folderLink)
        }
      })
    })

    it('returns the default action route for files', () => {
      getWrapper({
        setup: ({ getResourceLink }) => {
          const resource = mock<Resource>({ isFolder: false, type: 'file', extension: 'txt' })
          getDefaultActionMock.mockReturnValue({ route: () => actionLink })

          expect(getResourceLink(resource)).toEqual(actionLink)
        }
      })
    })

    it('returns undefined for files without a default action route', () => {
      getWrapper({
        setup: ({ getResourceLink }) => {
          const resource = mock<Resource>({ isFolder: false, type: 'file', extension: 'txt' })
          getDefaultActionMock.mockReturnValue(undefined)

          expect(getResourceLink(resource)).toBeUndefined()
          expect(getFolderLinkMock).not.toHaveBeenCalled()
        }
      })
    })
  })
})

function getWrapper({
  setup,
  fileExtensions = []
}: {
  setup: (instance: ReturnType<typeof useResourceLink>) => void
  fileExtensions?: ApplicationFileExtension[]
}) {
  return {
    wrapper: getComposableWrapper(
      () => {
        const instance = useResourceLink({ space: ref(mock<SpaceResource>()) })
        setup(instance)
      },
      { pluginOptions: { piniaOptions: { appsState: { fileExtensions } } } }
    )
  }
}
