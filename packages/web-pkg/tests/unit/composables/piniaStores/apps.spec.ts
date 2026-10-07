import { createPinia, setActivePinia } from 'pinia'
import { useAppsStore } from '../../../../src/composables/piniaStores'
import { ApplicationInformation } from '../../../../src/apps'

describe('useAppsStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  describe('icon of an app', () => {
    it('falls back to the puzzle icon', () => {
      expect(registerApp({ id: 'draw' }).app.icon).toEqual('puzzle')
    })
    it('keeps an icon without deprecated fields as declared', () => {
      const { app } = registerApp({ id: 'draw', icon: { src: 'draw.png' } })
      expect(app.icon).toEqual({ src: 'draw.png' })
    })
    it('merges the deprecated fill type into a named icon', () => {
      const { app } = registerApp({ id: 'draw', icon: 'brush', iconFillType: 'line' })
      expect(app.icon).toEqual({ name: 'brush', fillType: 'line' })
    })
    it('prefers the fill type of a named icon over the deprecated fill type', () => {
      const { app } = registerApp({
        id: 'draw',
        icon: { name: 'brush', fillType: 'fill' },
        iconFillType: 'line'
      })
      expect(app.icon).toEqual({ name: 'brush', fillType: 'fill' })
    })
    it('does not merge the deprecated fill type into an image icon', () => {
      const { app } = registerApp({ id: 'draw', icon: { src: 'draw.png' }, iconFillType: 'line' })
      expect(app.icon).toEqual({ src: 'draw.png' })
    })
  })

  describe('icon of a file extension', () => {
    it('merges the deprecated fill type and color into its named icon', () => {
      const { fileExtension } = registerApp({
        id: 'draw',
        extensions: [
          { extension: 'drawio', icon: 'pencil', iconFillType: 'fill', iconColor: 'red' }
        ]
      })
      expect(fileExtension.icon).toEqual({ name: 'pencil', fillType: 'fill', color: 'red' })
    })
    it('prefers the fields of its named icon over the deprecated fields', () => {
      const { fileExtension } = registerApp({
        id: 'draw',
        extensions: [
          { extension: 'drawio', icon: { name: 'pencil', color: 'green' }, iconColor: 'red' }
        ]
      })
      expect(fileExtension.icon).toEqual({ name: 'pencil', color: 'green' })
    })
    it('falls back to the icon of the app', () => {
      const { fileExtension } = registerApp({
        id: 'draw',
        icon: 'brush',
        extensions: [{ extension: 'drawio' }]
      })
      expect(fileExtension.icon).toEqual('brush')
    })
    it('does not merge its deprecated fields into the icon of the app', () => {
      const { fileExtension } = registerApp({
        id: 'draw',
        icon: 'brush',
        extensions: [{ extension: 'drawio', iconFillType: 'fill', iconColor: 'red' }]
      })
      expect(fileExtension.icon).toEqual('brush')
    })
    it('does not apply the deprecated fill type of the app to its own icon', () => {
      const { fileExtension } = registerApp({
        id: 'draw',
        icon: 'brush',
        iconFillType: 'fill',
        extensions: [{ extension: 'drawio', icon: 'pencil' }]
      })
      expect(fileExtension.icon).toEqual('pencil')
    })
    it('inherits the icon of the app together with its deprecated fill type', () => {
      const { fileExtension } = registerApp({
        id: 'draw',
        icon: 'brush',
        iconFillType: 'fill',
        extensions: [{ extension: 'drawio' }]
      })
      expect(fileExtension.icon).toEqual({ name: 'brush', fillType: 'fill' })
    })
    it('falls back to the image icon of the app regardless of deprecated fields', () => {
      const { fileExtension } = registerApp({
        id: 'draw',
        icon: { src: 'draw.png' },
        extensions: [{ extension: 'drawio', iconColor: 'red' }]
      })
      expect(fileExtension.icon).toEqual({ src: 'draw.png' })
    })
  })
})

function registerApp(appInfo: ApplicationInformation) {
  const appsStore = useAppsStore()
  appsStore.registerApp(appInfo)
  return { app: appsStore.apps[appInfo.id], fileExtension: appsStore.fileExtensions[0] }
}
