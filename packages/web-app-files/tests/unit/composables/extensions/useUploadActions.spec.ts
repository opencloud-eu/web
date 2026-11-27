import { mock } from 'vitest-mock-extended'
import { unref } from 'vue'
import {
  defaultComponentMocks,
  getComposableWrapper,
  RouteLocation
} from '@opencloud-eu/web-test-helpers'
import { ApplicationFileExtension, useAppsStore } from '@opencloud-eu/web-pkg'
import { useUploadActions } from '../../../../src/composables/extensions/useUploadActions'

describe('useUploadActions', () => {
  it('contains the new folder and new shortcut actions', () => {
    getWrapper({
      setup: (uploadActions) => {
        const ids = unref(uploadActions).map(({ id }) => id)
        expect(ids).toEqual([
          'com.github.opencloud-eu.web.files.upload-action.new-folder',
          'com.github.opencloud-eu.web.files.upload-action.new-shortcut'
        ])
      }
    })
  })

  it('includes new file actions of file extensions registered after setup', () => {
    getWrapper({
      setup: (uploadActions) => {
        const appsStore = useAppsStore()
        appsStore.fileExtensions = [
          mock<ApplicationFileExtension>({
            app: 'text-editor',
            extension: 'txt',
            newFileMenu: { menuTitle: vi.fn() }
          })
        ]

        const ids = unref(uploadActions).map(({ id }) => id)
        expect(ids).toContain('com.github.opencloud-eu.web.files.upload-action.new-file.txt')
      }
    })
  })

  it('registers quick create actions of quick create file extensions only', () => {
    getWrapper({
      setup: (uploadActions) => {
        const appsStore = useAppsStore()
        appsStore.fileExtensions = [
          mock<ApplicationFileExtension>({
            app: 'text-editor',
            extension: 'ocnote',
            newFileMenu: { menuTitle: vi.fn(), quickCreate: true }
          }),
          mock<ApplicationFileExtension>({
            app: 'text-editor',
            extension: 'txt',
            newFileMenu: { menuTitle: vi.fn(), quickCreate: false }
          })
        ]

        const quickCreateExtensions = unref(uploadActions).filter(({ extensionPointIds }) =>
          extensionPointIds.includes('app.files.quick-create')
        )
        expect(quickCreateExtensions.map(({ id }) => id)).toEqual([
          'com.github.opencloud-eu.web.files.quick-create.new-file.ocnote'
        ])
      }
    })
  })
})

function getWrapper({ setup }: { setup: (instance: ReturnType<typeof useUploadActions>) => void }) {
  const mocks = defaultComponentMocks({
    currentRoute: mock<RouteLocation>({ name: 'files-spaces-generic' })
  })

  return {
    wrapper: getComposableWrapper(
      () => {
        const instance = useUploadActions()
        setup(instance)
      },
      { mocks, provide: mocks }
    )
  }
}
