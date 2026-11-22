import { mock } from 'vitest-mock-extended'
import { HttpError, SpaceResource } from '@opencloud-eu/web-client'
import { useCreateSpace, useMessages } from '@opencloud-eu/web-pkg'
import { getComposableWrapper } from '@opencloud-eu/web-test-helpers'
import { useSpaceImage } from '../../../../src/composables/spaces'

vi.mock('@opencloud-eu/web-pkg', async (importOriginal) => ({
  ...(await importOriginal<any>()),
  useCreateSpace: vi.fn()
}))

const space = mock<SpaceResource>({ id: '1', name: 'space' })

describe('useSpaceImage', () => {
  describe('saveSpaceImage', () => {
    it('puts the image on the space and reports success', async () => {
      const setSpaceImage = vi.fn().mockResolvedValue(undefined)
      const { instance } = getWrapper({ setSpaceImage })
      const content = new ArrayBuffer(8)
      await instance.saveSpaceImage(space, content)

      expect(setSpaceImage).toHaveBeenCalledWith(space, content)
      expect(useMessages().showMessage).toHaveBeenCalledWith({
        title: 'Space image was set successfully'
      })
    })

    it('reports a failed upload', async () => {
      vi.spyOn(console, 'error').mockImplementation(() => undefined)
      const { instance } = getWrapper({
        setSpaceImage: vi.fn().mockRejectedValue(new Error('nope'))
      })
      await instance.saveSpaceImage(space, new ArrayBuffer(8))

      expect(useMessages().showErrorMessage).toHaveBeenCalledWith(
        expect.objectContaining({ title: 'Failed to set space image' })
      )
    })

    it('names the quota as the reason when the space is full', async () => {
      vi.spyOn(console, 'error').mockImplementation(() => undefined)
      const { instance } = getWrapper({
        setSpaceImage: vi
          .fn()
          .mockRejectedValue(new HttpError('insufficient storage', mock<Response>(), 507))
      })
      await instance.saveSpaceImage(space, new ArrayBuffer(8))

      expect(useMessages().showErrorMessage).toHaveBeenCalledWith(
        expect.objectContaining({ desc: 'Not enough quota to set the space image' })
      )
    })
  })
})

function getWrapper({
  setSpaceImage
}: {
  setSpaceImage: ReturnType<typeof useCreateSpace>['setSpaceImage']
}) {
  vi.mocked(useCreateSpace).mockReturnValue(
    mock<ReturnType<typeof useCreateSpace>>({ setSpaceImage })
  )

  let instance: ReturnType<typeof useSpaceImage>
  const wrapper = getComposableWrapper(() => {
    instance = useSpaceImage()
  })
  return { wrapper, instance }
}
