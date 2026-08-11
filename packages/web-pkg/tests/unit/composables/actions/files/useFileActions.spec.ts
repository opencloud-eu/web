import { mock } from 'vitest-mock-extended'
import { GetFileActionsOptions, useFileActions } from '../../../../../src/composables/actions'
import {
  defaultComponentMocks,
  RouteLocation,
  getComposableWrapper
} from '@opencloud-eu/web-test-helpers'
import { computed } from 'vue'
import { describe } from 'vitest'
import { Resource, SpaceResource } from '@opencloud-eu/web-client'
import { FileAction } from '../../../../../src'

const mockUseEmbedMode = vi.fn().mockReturnValue({ isEnabled: computed(() => false) })
vi.mock('../../../../../src/composables/embedMode', () => ({
  useEmbedMode: vi.fn().mockImplementation(() => mockUseEmbedMode())
}))

const actionOptions: GetFileActionsOptions = {
  resources: [
    mock<Resource>({
      id: '1',
      canDownload: () => true,
      mimeType: 'text/plain',
      extension: 'txt'
    })
  ],
  space: null,
  omitSystemActions: true
}

describe('fileActions', () => {
  describe('getAllOpenWithActions', () => {
    it('should provide a list of editors', () => {
      getWrapper({
        setup: ({ getAllOpenWithActions }) => {
          const actions = getAllOpenWithActions(actionOptions)
          const editorActions = actions.filter((a) => a.name?.toString().startsWith('editor-'))
          expect(editorActions.length).toEqual(2)
        }
      })
    })
    it('should omit editors if omitEditorActions is set', () => {
      getWrapper({
        setup: ({ getAllOpenWithActions }) => {
          const actions = getAllOpenWithActions({ ...actionOptions, omitEditorActions: true })
          const editorActions = actions.filter((a) => a.name?.toString().startsWith('editor-'))
          expect(editorActions.length).toBeFalsy()
        }
      })
    })
    it('should provide an empty list if embed mode is enabled', () => {
      mockUseEmbedMode.mockReturnValueOnce({
        isEnabled: computed(() => true)
      })
      getWrapper({
        setup: ({ getAllOpenWithActions }) => {
          const actions = getAllOpenWithActions(actionOptions)
          const editorActions = actions.filter((a) => a.name?.toString().startsWith('editor-'))
          expect(editorActions.length).toBeFalsy()
        }
      })
    })
  })
  describe('getEditorRoute', () => {
    it('returns null when the route does not exist', () => {
      let editorAction: FileAction
      const { mocks } = getWrapper({
        setup: ({ getAllOpenWithActions }) => {
          const actions = getAllOpenWithActions(actionOptions)
          editorAction = actions.find((a) => a.name === 'editor-external')
        }
      })
      mocks.$router.hasRoute.mockReturnValue(false)
      const result = editorAction.route({
        space: mock<SpaceResource>(),
        resources: actionOptions.resources
      })
      expect(result).toBeNull()
    })

    it('returns null when the app has no routeName and no matching app route', () => {
      let editorAction: FileAction
      const { mocks } = getWrapper({
        setup: ({ getAllOpenWithActions }) => {
          const actions = getAllOpenWithActions(actionOptions)
          editorAction = actions.find((a) => a.name === 'editor-text-editor')
        }
      })
      mocks.$router.hasRoute.mockReturnValue(false)
      const result = editorAction.route({
        space: mock<SpaceResource>(),
        resources: actionOptions.resources
      })
      expect(result).toBeNull()
    })

    it('resolves route when the route exists', () => {
      let editorAction: FileAction
      const { mocks } = getWrapper({
        setup: ({ getAllOpenWithActions }) => {
          const actions = getAllOpenWithActions(actionOptions)
          editorAction = actions.find((a) => a.name === 'editor-external')
        }
      })
      mocks.$router.hasRoute.mockReturnValue(true)

      const mockSpace = mock<SpaceResource>({
        getDriveAliasAndItem: () => 'personal/admin/test.txt'
      })

      const result = editorAction.route({
        space: mockSpace,
        resources: actionOptions.resources
      })
      expect(result).not.toBeNull()
    })

    it('encodes special characters like hash in driveAliasAndItem', () => {
      let editorAction: FileAction
      const { mocks } = getWrapper({
        setup: ({ getAllOpenWithActions }) => {
          const actions = getAllOpenWithActions(actionOptions)
          editorAction = actions.find((a) => a.name === 'editor-text-editor')
        }
      })
      mocks.$router.hasRoute.mockReturnValue(true)
      mocks.$router.resolve.mockReturnValue({ href: '/test' } as any)

      const mockSpace = mock<SpaceResource>({
        getDriveAliasAndItem: () => 'personal/admin/ticket#1234/logs.txt'
      })
      const mockResource = mock<Resource>({
        path: '/ticket#1234/logs.txt',
        fileId: 'test-file-id'
      })

      editorAction.route({
        space: mockSpace,
        resources: [mockResource]
      })

      expect(mocks.$router.resolve).toHaveBeenCalledWith(
        expect.objectContaining({
          params: {
            driveAliasAndItem: 'personal/admin/ticket%231234/logs.txt'
          }
        })
      )
    })
  })

  describe('secure view context', () => {
    describe('getAllOpenWithActions', () => {
      it('only displays editors that support secure view', () => {
        getWrapper({
          setup: ({ getAllOpenWithActions }) => {
            const actions = getAllOpenWithActions({
              ...actionOptions,
              resources: [
                mock<Resource>({
                  id: '1',
                  canDownload: () => false,
                  mimeType: 'text/plain',
                  extension: 'txt'
                })
              ]
            })
            const editorActions = actions.filter((a) => a.name?.toString().startsWith('editor-'))
            expect(editorActions.length).toEqual(1)
            expect(editorActions[0].name).toEqual('editor-external')
          }
        })
      })
    })
  })
})

function getWrapper({ setup }: { setup: (instance: ReturnType<typeof useFileActions>) => void }) {
  const mocks = {
    ...defaultComponentMocks({
      currentRoute: mock<RouteLocation>({ name: 'files-spaces-generic', path: '/files' })
    })
  }
  return {
    mocks,
    wrapper: getComposableWrapper(
      () => {
        const instance = useFileActions()
        setup(instance)
      },
      {
        mocks,
        provide: mocks,
        pluginOptions: {
          piniaOptions: {
            appsState: {
              apps: {
                'text-editor': {
                  defaultExtension: 'txt',
                  icon: 'file-text',
                  name: 'Text Editor',
                  id: 'text-editor',
                  color: '#0D856F',
                  extensions: [
                    {
                      extension: 'txt'
                    }
                  ]
                },
                external: {
                  defaultExtension: '',
                  icon: 'puzzle',
                  name: 'External',
                  id: 'external'
                }
              },
              fileExtensions: [
                {
                  app: 'text-editor',
                  extension: 'txt',
                  hasPriority: false
                },
                {
                  app: 'external',
                  label: 'Open in Collabora',
                  mimeType: 'text/plain',
                  routeName: 'external-apps',
                  icon: 'https://host.docker.internal:9980/favicon.ico',
                  name: 'Collabora',
                  hasPriority: false,
                  secureView: true
                }
              ]
            }
          }
        }
      }
    )
  }
}
