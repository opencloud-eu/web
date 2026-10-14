import { mock, mockDeep } from 'vitest-mock-extended'
import { Language } from 'vue3-gettext'
import { UploadResourceConflict } from '../../../../../src/helpers/resource'
import { ResolveStrategy, OcUppyFile, useResourcesStore } from '@opencloud-eu/web-pkg'
import { Resource } from '@opencloud-eu/web-client'
import { createTestingPinia } from '@opencloud-eu/web-test-helpers'

const getResourceConflictInstance = ({
  currentFiles = [mockDeep<Resource>()]
}: {
  currentFiles?: Resource[]
} = {}) => {
  createTestingPinia({ initialState: { resources: { resources: currentFiles } } })
  const resourcesStore = useResourcesStore()
  return new UploadResourceConflict(resourcesStore, mock<Language>())
}

describe('upload helper', () => {
  describe('method "getConflicts"', () => {
    it('should return file and folder conflicts', () => {
      const fileName = 'someFile.txt'
      const folderName = 'someFolder'
      const currentFiles = [
        mockDeep<Resource>({ name: fileName }),
        mockDeep<Resource>({ name: folderName })
      ]
      const filesToUpload = [
        mockDeep<OcUppyFile>({ name: fileName, meta: { relativePath: '', relativeFolder: '' } }),
        mockDeep<OcUppyFile>({
          name: 'anotherFile',
          meta: { relativePath: `/${folderName}/anotherFile` }
        })
      ]
      const instance = getResourceConflictInstance({ currentFiles })
      const conflicts = instance.getConflicts(filesToUpload)

      expect(conflicts.length).toBe(2)
      expect(conflicts).toContainEqual({ name: fileName, type: 'file' })
      expect(conflicts).toContainEqual({ name: folderName, type: 'folder' })
    })
  })
  describe('method "displayOverwriteDialog"', () => {
    it.each([false, true])(
      'reserves names of other uploaded files when keeping both (reverse order: %s)',
      async (reverseOrder) => {
        const files = [createUploadFile('a.txt'), createUploadFile('a (1).txt')]
        if (reverseOrder) {
          files.reverse()
        }
        const instance = getResourceConflictInstance({
          currentFiles: [mock<Resource>({ name: 'a.txt' })]
        })
        instance.resolveFileExists = vi.fn().mockResolvedValue({
          strategy: ResolveStrategy.KEEP_BOTH,
          doForAllConflicts: false
        })

        const result = await instance.displayOverwriteDialog(files, [
          { name: 'a.txt', type: 'file' }
        ])

        expect(result.files).toHaveLength(2)
        const renamed = result.files.find(({ id }) => id === '/a.txt')
        expect(renamed.name).toBe('a (2).txt')
        expect(renamed.meta.name).toBe('a (2).txt')
        expect(renamed.xhrUpload.endpoint).toBe('https://example.com/dav/a%20(2).txt')
        expect(result.files.find(({ id }) => id === '/a (1).txt').name).toBe('a (1).txt')
      }
    )

    it('reserves replacement names already assigned to other uploaded files', async () => {
      const first = createUploadFile('a.txt')
      const second = createUploadFile('a.txt')
      second.id = 'second'
      const instance = getResourceConflictInstance({
        currentFiles: [mock<Resource>({ name: 'a.txt' })]
      })
      instance.resolveFileExists = vi.fn().mockResolvedValue({
        strategy: ResolveStrategy.KEEP_BOTH,
        doForAllConflicts: true
      })

      const result = await instance.displayOverwriteDialog(
        [first, second],
        [
          { name: 'a.txt', type: 'file' },
          { name: 'a.txt', type: 'file' }
        ]
      )

      expect(result.files.map(({ name }) => name)).toEqual(['a (1).txt', 'a (2).txt'])
    })

    it('reserves other uploaded folders and gives all children the same replacement folder', async () => {
      const files = [
        createUploadFile('one.txt', '/folder'),
        createUploadFile('two.txt', '/folder/nested'),
        createUploadFile('three.txt', '/folder (1)')
      ]
      const instance = getResourceConflictInstance({
        currentFiles: [mock<Resource>({ name: 'folder' })]
      })
      instance.resolveFileExists = vi.fn().mockResolvedValue({
        strategy: ResolveStrategy.KEEP_BOTH,
        doForAllConflicts: false
      })

      const result = await instance.displayOverwriteDialog(files, [
        { name: 'folder', type: 'folder' }
      ])

      expect(result.files.map(({ meta }) => meta.relativeFolder)).toEqual([
        '/folder (2)',
        '/folder (2)/nested',
        '/folder (1)'
      ])
      expect(result.files.map(({ meta }) => meta.relativePath)).toEqual([
        '/folder (2)/one.txt',
        '/folder (2)/nested/two.txt',
        '/folder (1)/three.txt'
      ])
      expect(result.files.map(({ meta }) => meta.tusEndpoint)).toEqual([
        'https://example.com/dav/folder%20(2)',
        'https://example.com/dav/folder%20(2)/nested',
        'https://example.com/dav/folder%20(1)'
      ])
      expect(result.files.map(({ xhrUpload }) => xhrUpload.endpoint)).toEqual([
        'https://example.com/dav/folder%20(2)/one.txt',
        'https://example.com/dav/folder%20(2)/nested/two.txt',
        'https://example.com/dav/folder%20(1)/three.txt'
      ])
      expect(result.files.map(({ tus }) => tus.endpoint)).toEqual(
        result.files.map(({ meta }) => meta.tusEndpoint)
      )
    })

    it('reserves replacement file names when renaming folders in the same batch', async () => {
      const files = [createUploadFile('folder'), createUploadFile('one.txt', '/folder')]
      const instance = getResourceConflictInstance({
        currentFiles: [mock<Resource>({ name: 'folder' })]
      })
      instance.resolveFileExists = vi.fn().mockResolvedValue({
        strategy: ResolveStrategy.KEEP_BOTH,
        doForAllConflicts: true
      })

      const result = await instance.displayOverwriteDialog(files, [
        { name: 'folder', type: 'file' },
        { name: 'folder', type: 'folder' }
      ])

      expect(result.files[0].name).toBe('folder (1)')
      expect(result.files[1].meta.relativeFolder).toBe('/folder (2)')
    })

    it('does not reserve nested file names in the target folder', async () => {
      const files = [createUploadFile('a.txt'), createUploadFile('a (1).txt', '/nested')]
      const instance = getResourceConflictInstance({
        currentFiles: [mock<Resource>({ name: 'a.txt' })]
      })
      instance.resolveFileExists = vi.fn().mockResolvedValue({
        strategy: ResolveStrategy.KEEP_BOTH,
        doForAllConflicts: false
      })

      const result = await instance.displayOverwriteDialog(files, [{ name: 'a.txt', type: 'file' }])

      expect(result.files[0].name).toBe('a (1).txt')
      expect(result.files[1].meta.relativePath).toBe('/nested/a (1).txt')
    })

    it.each([ResolveStrategy.REPLACE, ResolveStrategy.KEEP_BOTH])(
      'should return all files if user chooses replace or keep both for all',
      async (strategy) => {
        const OcUppyFile = mockDeep<OcUppyFile>({
          name: 'test',
          meta: {
            relativeFolder: ''
          }
        })
        const conflict = {
          name: OcUppyFile.name,
          type: 'file'
        }

        const instance = getResourceConflictInstance()
        const resolveFileConflictMethod = vi.fn(() =>
          Promise.resolve({ strategy, doForAllConflicts: true })
        )
        instance.resolveFileExists = resolveFileConflictMethod

        const result = await instance.displayOverwriteDialog([OcUppyFile], [conflict])
        expect(result.files.length).toBe(1)
        expect(result.files).toEqual([OcUppyFile])
      }
    )
    it('should return no files if user chooses skip for all', async () => {
      const OcUppyFile = mockDeep<OcUppyFile>({ name: 'test' })
      const conflict = { name: OcUppyFile.name, type: 'file' }

      const instance = getResourceConflictInstance()

      const resolveFileConflictMethod = vi.fn(() =>
        Promise.resolve({ strategy: ResolveStrategy.SKIP, doForAllConflicts: true })
      )
      instance.resolveFileExists = resolveFileConflictMethod

      const result = await instance.displayOverwriteDialog([OcUppyFile], [conflict])
      expect(result.files.length).toBe(0)
    })
    it('should show dialog once if do for all conflicts is ticked', async () => {
      const OcUppyFileOne = mockDeep<OcUppyFile>({ name: 'test' })
      const OcUppyFileTwo = mockDeep<OcUppyFile>({ name: 'test2' })
      const conflictOne = { name: OcUppyFileOne.name, type: 'file' }
      const conflictTwo = { name: OcUppyFileTwo.name, type: 'file' }

      const instance = getResourceConflictInstance()
      const resolveFileConflictMethod = vi.fn(() =>
        Promise.resolve({ strategy: ResolveStrategy.REPLACE, doForAllConflicts: true })
      )
      instance.resolveFileExists = resolveFileConflictMethod

      await instance.displayOverwriteDialog(
        [OcUppyFileOne, OcUppyFileTwo],
        [conflictOne, conflictTwo]
      )

      expect(resolveFileConflictMethod).toHaveBeenCalledTimes(1)
    })
    it('should update endpoints of files nested inside a renamed folder when keeping both', async () => {
      const folderName = 'test'
      const currentFiles = [mockDeep<Resource>({ name: folderName })]

      const imageFile = {
        id: 'image',
        name: 'image.jpg',
        type: 'image/jpeg',
        meta: {
          relativeFolder: '/test',
          relativePath: '/test/image.jpg',
          tusEndpoint: 'https://example.com/dav/test'
        }
      } as unknown as OcUppyFile

      const nestedImageFile = {
        id: 'nested-image',
        name: 'image2.jpg',
        type: 'image/jpeg',
        meta: {
          relativeFolder: '/test/folderInside',
          relativePath: '/test/folderInside/image2.jpg',
          tusEndpoint: 'https://example.com/dav/test/folderInside'
        }
      } as unknown as OcUppyFile

      const conflict = { name: folderName, type: 'folder' }

      const instance = getResourceConflictInstance({ currentFiles })
      instance.resolveFileExists = vi.fn(() =>
        Promise.resolve({ strategy: ResolveStrategy.KEEP_BOTH, doForAllConflicts: false })
      )

      const result = await instance.displayOverwriteDialog([imageFile, nestedImageFile], [conflict])

      expect(result.files.length).toBe(2)

      const newFolderName = `test (1)`
      const encodedNewFolderName = encodeURIComponent(newFolderName)

      const resultImage = result.files.find((f) => f.name === 'image.jpg')
      expect(resultImage.meta.relativeFolder).toBe(`/${newFolderName}`)
      expect(resultImage.meta.tusEndpoint).toBe(`https://example.com/dav/${encodedNewFolderName}`)

      const resultNested = result.files.find((f) => f.name === 'image2.jpg')
      expect(resultNested.meta.relativeFolder).toBe(`/${newFolderName}/folderInside`)
      expect(resultNested.meta.tusEndpoint).toBe(
        `https://example.com/dav/${encodedNewFolderName}/folderInside`
      )
    })
    it('should return merged folder names when user chooses merge', async () => {
      const folderName = 'someFolder'
      const fileInFolder = mockDeep<OcUppyFile>({
        name: 'file.txt',
        meta: { relativeFolder: `/${folderName}` }
      })
      const conflict = { name: folderName, type: 'folder' }

      const instance = getResourceConflictInstance()
      instance.resolveFileExists = vi.fn(() =>
        Promise.resolve({ strategy: ResolveStrategy.MERGE, doForAllConflicts: false })
      )

      const result = await instance.displayOverwriteDialog([fileInFolder], [conflict])
      expect(result.mergedFolders).toEqual([folderName])
      expect(result.files.length).toBe(1)
    })
    it('should show dialog twice if do for all conflicts is ticked and folders and files are uploaded', async () => {
      const OcUppyFileOne = mockDeep<OcUppyFile>({ name: 'test' })
      const OcUppyFileTwo = mockDeep<OcUppyFile>({ name: 'folder' })
      const conflictOne = {
        name: OcUppyFileOne.name,
        type: 'file',
        meta: { relativeFolder: '/' }
      }
      const conflictTwo = { name: OcUppyFileTwo.name, type: 'folder' }

      const instance = getResourceConflictInstance()
      instance.resolveFileExists = vi.fn(() =>
        Promise.resolve({ strategy: ResolveStrategy.REPLACE, doForAllConflicts: true })
      )

      await instance.displayOverwriteDialog(
        [OcUppyFileOne, OcUppyFileTwo],
        [conflictOne, conflictTwo]
      )

      expect(instance.resolveFileExists).toHaveBeenCalledTimes(2)
    })
  })
})

function createUploadFile(name: string, relativeFolder = '') {
  const relativePath = `${relativeFolder}/${name}`
  const folderEndpoint = `https://example.com/dav${relativeFolder
    .split('/')
    .map(encodeURIComponent)
    .join('/')}`
  return mockDeep<OcUppyFile>({
    id: relativePath,
    name,
    meta: { name, relativeFolder, relativePath, tusEndpoint: folderEndpoint },
    xhrUpload: { endpoint: `${folderEndpoint}/${encodeURIComponent(name)}` },
    tus: { endpoint: folderEndpoint }
  })
}
