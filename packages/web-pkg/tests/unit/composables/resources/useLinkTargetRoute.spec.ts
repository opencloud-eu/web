import { getComposableWrapper } from '@opencloud-eu/web-test-helpers'
import { mock } from 'vitest-mock-extended'
import { Resource, SpaceResource } from '@opencloud-eu/web-client'
import { RouteLocationNamedRaw } from 'vue-router'
import { useLinkTargetRoute, useResourceLink } from '../../../../src/composables/resources'

vi.mock('../../../../src/composables/resources/useResourceLink', () => ({
  useResourceLink: vi.fn()
}))

const editorRoute: RouteLocationNamedRaw = {
  name: 'text-editor',
  params: { driveAliasAndItem: 'personal/admin/folder/file.txt' },
  query: {}
}

const buildSpace = (attrs: Partial<SpaceResource> = {}) =>
  mock<SpaceResource>({
    driveType: 'personal',
    driveAlias: 'personal/admin',
    id: 'personal-space-id',
    getDriveAliasAndItem: ({ path }: Resource) => `personal/admin${path}`,
    ...attrs
  })

const buildFile = (attrs: Partial<Resource> = {}) =>
  mock<Resource>({
    fileId: 'file-id',
    parentFolderId: 'folder-id',
    isFolder: false,
    type: 'file',
    ...attrs
  })

describe('useLinkTargetRoute', () => {
  describe('file list route', () => {
    it('resolves a file to its parent folder and scrolls to it', () => {
      getWrapper({
        setup: ({ getLinkTargetRoute }) => {
          const route = getLinkTargetRoute({
            space: buildSpace(),
            resource: buildFile(),
            path: '/folder/file.txt'
          })

          expect(route.name).toBe('files-spaces-generic')
          expect(route.params).toEqual(
            expect.objectContaining({ driveAliasAndItem: 'personal/admin/folder' })
          )
          expect(route.query).toEqual(
            expect.objectContaining({ fileId: 'folder-id', scrollTo: 'file-id' })
          )
        }
      })
    })
    it('resolves a folder to itself', () => {
      getWrapper({
        setup: ({ getLinkTargetRoute }) => {
          const route = getLinkTargetRoute({
            space: buildSpace(),
            resource: buildFile({ isFolder: true, type: 'folder' }),
            path: '/folder'
          })

          expect(route.params).toEqual(
            expect.objectContaining({ driveAliasAndItem: 'personal/admin/folder' })
          )
          expect(route.query).toEqual(expect.objectContaining({ fileId: 'file-id' }))
          expect(route.query).toEqual(expect.not.objectContaining({ scrollTo: 'file-id' }))
        }
      })
    })
    it('resolves to the public link route for public spaces', () => {
      getWrapper({
        setup: ({ getLinkTargetRoute }) => {
          const route = getLinkTargetRoute({
            space: buildSpace({
              driveType: 'public',
              driveAlias: 'public/token',
              getDriveAliasAndItem: ({ path }) => `public/token${path}`
            }),
            resource: buildFile(),
            path: '/file.txt'
          })

          expect(route.name).toBe('files-public-link')
        }
      })
    })
    it('resolves to the shared with me route for share roots', () => {
      getWrapper({
        setup: ({ getLinkTargetRoute }) => {
          const route = getLinkTargetRoute({
            space: buildSpace({ driveType: 'share', driveAlias: 'share/file.txt' }),
            resource: buildFile(),
            path: '/'
          })

          expect(route.name).toBe('files-shares-with-me')
        }
      })
    })
    it('passes the details and the file list query', () => {
      getWrapper({
        setup: ({ getLinkTargetRoute }) => {
          const route = getLinkTargetRoute({
            space: buildSpace(),
            resource: buildFile(),
            path: '/folder/file.txt',
            details: 'sharing',
            fileListQuery: { 'q_share-visibility': 'hidden' }
          })

          expect(route.query).toEqual(
            expect.objectContaining({ details: 'sharing', 'q_share-visibility': 'hidden' })
          )
        }
      })
    })
  })

  describe('default app route', () => {
    it('resolves to the app route and adds the context route for files', () => {
      getWrapper({
        resourceLink: editorRoute,
        setup: ({ getLinkTargetRoute }) => {
          const route = getLinkTargetRoute({
            space: buildSpace(),
            resource: buildFile(),
            path: '/folder/file.txt',
            fileListQuery: { 'q_share-visibility': 'hidden' }
          })

          expect(route.name).toBe('text-editor')
          expect(route.query).toEqual(
            expect.objectContaining({
              contextRouteName: 'files-spaces-generic',
              contextRouteParams: { driveAliasAndItem: 'personal/admin/folder' },
              contextRouteQuery: { fileId: 'folder-id', 'q_share-visibility': 'hidden' }
            })
          )
        }
      })
    })
    it('does not add a context route for folders', () => {
      getWrapper({
        resourceLink: editorRoute,
        setup: ({ getLinkTargetRoute }) => {
          const route = getLinkTargetRoute({
            space: buildSpace(),
            resource: buildFile({ isFolder: true, type: 'folder' }),
            path: '/folder'
          })

          expect(route.query).toEqual(expect.not.objectContaining({ contextRouteName: undefined }))
          expect(Object.keys(route.query)).not.toContain('contextRouteName')
        }
      })
    })
    it('is skipped when the default app is not requested', () => {
      getWrapper({
        resourceLink: editorRoute,
        setup: ({ getLinkTargetRoute }) => {
          const route = getLinkTargetRoute({
            space: buildSpace(),
            resource: buildFile(),
            path: '/folder/file.txt',
            openWithDefaultApp: false
          })

          expect(route.name).toBe('files-spaces-generic')
        }
      })
    })
    it('is skipped when a details panel is requested', () => {
      getWrapper({
        resourceLink: editorRoute,
        setup: ({ getLinkTargetRoute }) => {
          const route = getLinkTargetRoute({
            space: buildSpace(),
            resource: buildFile(),
            path: '/folder/file.txt',
            details: 'sharing'
          })

          expect(route.name).toBe('files-spaces-generic')
        }
      })
    })
  })
})

function getWrapper({
  setup,
  resourceLink = undefined
}: {
  setup: (instance: ReturnType<typeof useLinkTargetRoute>) => void
  resourceLink?: RouteLocationNamedRaw
}) {
  vi.mocked(useResourceLink).mockReturnValue({
    getResourceLink: vi.fn().mockReturnValue(resourceLink)
  })

  return {
    wrapper: getComposableWrapper(() => {
      setup(useLinkTargetRoute())
    })
  }
}
