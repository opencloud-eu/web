import { ref, unref } from 'vue'
import { mock } from 'vitest-mock-extended'
import { defaultComponentMocks, getComposableWrapper } from '@opencloud-eu/web-test-helpers'
import { SpaceResource } from '@opencloud-eu/web-client'
import { useAppDefaults } from '../../../../src/composables/appDefaults'
import { useDriveResolver } from '../../../../src/composables/driveResolver'
import { ApplicationInformation } from '../../../../src/apps'

vi.mock('../../../../src/composables/driveResolver')

describe('useAppDefaults', () => {
  describe('currentFileContext', () => {
    it('uses the share name as file name for a single file shared with the user', () => {
      const space = mock<SpaceResource>({
        driveType: 'share',
        name: 'notes.md',
        webDavPath: '/spaces/a0ca6a90-a365-4782-871e-d44447bbc668$a0ca6a90!share-id'
      })
      const fileName = getFileName({ space, item: '' })

      expect(fileName).toBe('notes.md')
    })

    it('uses the base name of the path for a file inside a space', () => {
      const space = mock<SpaceResource>({
        driveType: 'project',
        name: 'Project',
        webDavPath: '/spaces/project-id'
      })
      const fileName = getFileName({ space, item: '/folder/notes.md' })

      expect(fileName).toBe('notes.md')
    })
  })
})

function getFileName({ space, item }: { space: SpaceResource; item: string }) {
  vi.mocked(useDriveResolver).mockReturnValue(
    mock<ReturnType<typeof useDriveResolver>>({
      space: ref(space),
      item: ref(item),
      itemId: ref('item-id')
    })
  )

  const mocks = defaultComponentMocks()
  let fileName: string
  getComposableWrapper(
    () => {
      const { currentFileContext } = useAppDefaults({ applicationId: 'text-editor' })
      fileName = unref(unref(currentFileContext).fileName)
    },
    {
      mocks,
      provide: mocks,
      pluginOptions: {
        piniaOptions: {
          appsState: {
            apps: { 'text-editor': mock<ApplicationInformation>({ id: 'text-editor' }) }
          }
        }
      }
    }
  )
  return fileName
}
