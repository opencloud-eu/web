import MediaControls from '../../../src/components/MediaControls.vue'
import { defaultPlugins, PartialComponentProps, shallowMount } from '@opencloud-eu/web-test-helpers'
import { mock } from 'vitest-mock-extended'
import { MediaFile } from '../../../src/helpers/types'

const selectors = {
  controlsPrevious: '.preview-controls-previous',
  controlsNext: '.preview-controls-next',
  controlsFullScreen: '.preview-controls-fullscreen',
  controlsImageShrink: '.preview-controls-image-shrink',
  controlsImageZoom: '.preview-controls-image-zoom',
  controlsRotateLeft: '.preview-controls-rotate-left',
  controlsRotateRight: '.preview-controls-rotate-right',
  controlsImageReset: '.preview-controls-image-reset',
  togglePhotoRoll: '[data-testid="toggle-photo-roll"]'
}

describe('MediaControls component', () => {
  describe('previous button', () => {
    it('exists', () => {
      const { wrapper } = getWrapper()
      expect(wrapper.find(selectors.controlsPrevious).exists()).toBeTruthy()
    })
    it('emits "togglePrevious"-event on click', async () => {
      const { wrapper } = getWrapper()
      await wrapper.find(selectors.controlsPrevious).trigger('click')
      expect(wrapper.emitted('togglePrevious').length).toBeDefined()
    })
  })
  describe('next button', () => {
    it('exists', () => {
      const { wrapper } = getWrapper()
      expect(wrapper.find(selectors.controlsNext).exists()).toBeTruthy()
    })
    it('emits "toggleNext"-event on click', async () => {
      const { wrapper } = getWrapper()
      await wrapper.find(selectors.controlsNext).trigger('click')
      expect(wrapper.emitted('toggleNext').length).toBeDefined()
    })
  })
  describe('full screen toggle', () => {
    it('exists', () => {
      const { wrapper } = getWrapper()
      expect(wrapper.find(selectors.controlsFullScreen).exists()).toBeTruthy()
    })
    it('emits "toggleFullScreen"-event on click', async () => {
      const { wrapper } = getWrapper()
      await wrapper.find(selectors.controlsFullScreen).trigger('click')
      expect(wrapper.emitted('toggleFullScreen').length).toBeDefined()
    })
  })
  describe('size', () => {
    describe('shrink button', () => {
      it('exists if file is an image', () => {
        const { wrapper } = getWrapper({ showImageControls: true })
        expect(wrapper.find(selectors.controlsImageShrink).exists()).toBeTruthy()
      })
      it('emits "setZoom"-event on click', async () => {
        const { wrapper } = getWrapper({ showImageControls: true })
        await wrapper.find(selectors.controlsImageShrink).trigger('click')
        expect(wrapper.emitted('setShrink')).toBeTruthy
      })
    })
    describe('zoom button', () => {
      it('exists if file is an image', () => {
        const { wrapper } = getWrapper({ showImageControls: true })
        expect(wrapper.find(selectors.controlsImageZoom).exists()).toBeTruthy()
      })
      it('emits "setZoom"-event on click', async () => {
        const { wrapper } = getWrapper({ showImageControls: true })
        await wrapper.find(selectors.controlsImageZoom).trigger('click')
        expect(wrapper.emitted('setZoom')).toBeTruthy()
      })
    })
  })
  describe('rotation', () => {
    describe('left button', () => {
      it('exists if file is an image', () => {
        const { wrapper } = getWrapper({ showImageControls: true })
        expect(wrapper.find(selectors.controlsRotateLeft).exists()).toBeTruthy()
      })
      it('emits "setRotation"-event on click', async () => {
        const { wrapper } = getWrapper({ showImageControls: true })
        await wrapper.find(selectors.controlsRotateLeft).trigger('click')
        expect(wrapper.emitted('setRotationLeft')).toBeTruthy()
      })
    })
    describe('right button', () => {
      it('exists if file is an image', () => {
        const { wrapper } = getWrapper({ showImageControls: true })
        expect(wrapper.find(selectors.controlsRotateRight).exists()).toBeTruthy()
      })
      it('emits "setRotation"-event on click', async () => {
        const { wrapper } = getWrapper({ showImageControls: true })
        await wrapper.find(selectors.controlsRotateRight).trigger('click')
        expect(wrapper.emitted('setRotationRight')).toBeTruthy()
      })
    })
  })
  describe('reset', () => {
    describe('reset button', () => {
      it('exists if file is an image', () => {
        const { wrapper } = getWrapper({ showImageControls: true })
        expect(wrapper.find(selectors.controlsImageReset).exists()).toBeTruthy()
      })
      it('emits "resetImage"-event on click', async () => {
        const { wrapper } = getWrapper({ showImageControls: true })
        await wrapper.find(selectors.controlsImageReset).trigger('click')
        expect(wrapper.emitted('resetImage').length).toBeDefined()
      })
    })
  })
  describe('photo roll toggle', () => {
    it('exists', () => {
      const { wrapper } = getWrapper({ showImageControls: true })
      expect(wrapper.find(selectors.togglePhotoRoll).exists()).toBeTruthy()
    })
    it('emits "togglePhotoRoll"-event on click', async () => {
      const { wrapper } = getWrapper({ showImageControls: true })
      await wrapper.find(selectors.togglePhotoRoll).trigger('click')
      expect(wrapper.emitted('togglePhotoRoll').length).toBeDefined()
    })
  })
})

function getWrapper(props: PartialComponentProps<typeof MediaControls> = {}) {
  return {
    wrapper: shallowMount(MediaControls, {
      props: {
        files: [mock<MediaFile>()],
        activeIndex: 0,
        ...props
      },
      global: {
        plugins: [...defaultPlugins()]
      }
    })
  }
}
