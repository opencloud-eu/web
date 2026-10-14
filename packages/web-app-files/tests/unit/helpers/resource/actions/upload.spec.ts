import { dirname } from 'path'
import { mock, mockDeep } from 'vitest-mock-extended'
import { Language } from 'vue3-gettext'
import { UploadResourceConflict } from '../../../../../src/helpers/resource'
import { ResolveStrategy, OcUppyFile, useResourcesStore } from '@opencloud-eu/web-pkg'
import { Resource, urlJoin } from '@opencloud-eu/web-client'
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

    it.each(['xhr', 'tus'] as const)(
      'reserves other uploaded folders and gives all children the same replacement folder (%s)',
      async (transport) => {
        const files = [
          createUploadFile('one.txt', '/folder', transport),
          createUploadFile('two.txt', '/folder/nested', transport),
          createUploadFile('three.txt', '/folder (1)', transport)
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
        const folderEndpoints = [
          'https://example.com/dav/folder%20(2)',
          'https://example.com/dav/folder%20(2)/nested',
          'https://example.com/dav/folder%20(1)'
        ]
        const fileEndpoints = [
          'https://example.com/dav/folder%20(2)/one.txt',
          'https://example.com/dav/folder%20(2)/nested/two.txt',
          'https://example.com/dav/folder%20(1)/three.txt'
        ]
        expect(result.files.map(({ meta }) => meta.tusEndpoint)).toEqual(
          transport === 'xhr' ? fileEndpoints : folderEndpoints
        )
        if (transport === 'xhr') {
          expect(result.files.map(({ xhrUpload }) => xhrUpload.endpoint)).toEqual(fileEndpoints)
        } else {
          expect(result.files.map(({ tus }) => tus.endpoint)).toEqual(folderEndpoints)
        }
      }
    )

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
      const OcUppyFile = mockDeep<OcUppyFile>({ name: 'test', meta: { relativeFolder: '' } })
      const conflict = { name: OcUppyFile.name, type: 'file' }

      const instance = getResourceConflictInstance()

      const resolveFileConflictMethod = vi.fn(() =>
        Promise.resolve({ strategy: ResolveStrategy.SKIP, doForAllConflicts: true })
      )
      instance.resolveFileExists = resolveFileConflictMethod

      const result = await instance.displayOverwriteDialog([OcUppyFile], [conflict])
      expect(result.files.length).toBe(0)
    })
    it('should keep files with the same name inside folders when skipping a file', async () => {
      const skippedFile = mockDeep<OcUppyFile>({ name: 'test', meta: { relativeFolder: '' } })
      const nestedFile = mockDeep<OcUppyFile>({
        name: 'test',
        meta: { relativeFolder: '/folder' }
      })
      const conflict = { name: skippedFile.name, type: 'file' }

      const instance = getResourceConflictInstance()
      instance.resolveFileExists = vi.fn(() =>
        Promise.resolve({ strategy: ResolveStrategy.SKIP, doForAllConflicts: false })
      )

      const result = await instance.displayOverwriteDialog([skippedFile, nestedFile], [conflict])
      expect(result.files).toEqual([nestedFile])
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
    it('should only rename the file name segment of the xhr endpoint when keeping both', async () => {
      const fileName = 'Doc'
      const currentFiles = [mockDeep<Resource>({ name: fileName })]
      const file = {
        id: 'file',
        name: fileName,
        meta: { relativeFolder: '', relativePath: '' },
        xhrUpload: { endpoint: `https://example.com/dav/Documents/${fileName}` }
      } as unknown as OcUppyFile

      const instance = getResourceConflictInstance({ currentFiles })
      instance.resolveFileExists = vi.fn(() =>
        Promise.resolve({ strategy: ResolveStrategy.KEEP_BOTH, doForAllConflicts: false })
      )

      const result = await instance.displayOverwriteDialog(
        [file],
        [{ name: fileName, type: 'file' }]
      )

      expect(result.files[0].xhrUpload.endpoint).toBe(
        `https://example.com/dav/Documents/${encodeURIComponent('Doc (1)')}`
      )
    })
    it.each(['report (final)', 'x+y', 'cost$$', 'a$&b', 'x$1', "a$'b", 'a$`b'])(
      'should rename folder "%s" with special characters when keeping both',
      async (folderName) => {
        const currentFiles = [mockDeep<Resource>({ name: folderName })]
        const file = {
          id: 'file',
          name: 'in.txt',
          meta: {
            relativeFolder: `/${folderName}`,
            relativePath: `/${folderName}/in.txt`,
            tusEndpoint: `https://example.com/dav/${encodeURIComponent(folderName)}`
          }
        } as unknown as OcUppyFile

        const instance = getResourceConflictInstance({ currentFiles })
        instance.resolveFileExists = vi.fn(() =>
          Promise.resolve({ strategy: ResolveStrategy.KEEP_BOTH, doForAllConflicts: false })
        )

        const result = await instance.displayOverwriteDialog(
          [file],
          [{ name: folderName, type: 'folder' }]
        )

        const newFolderName = `${folderName} (1)`
        expect(result.files[0].meta.relativeFolder).toBe(`/${newFolderName}`)
        expect(result.files[0].meta.relativePath).toBe(`/${newFolderName}/in.txt`)
        expect(result.files[0].meta.tusEndpoint).toBe(
          `https://example.com/dav/${encodeURIComponent(newFolderName)}`
        )
      }
    )
    describe('uploaded folder has the same name as the current folder', () => {
      const baseUrl = 'https://example.com/dav/Photos'
      const newFolder = encodeURIComponent('Photos (1)')

      async function keepBoth(file: OcUppyFile) {
        const instance = getResourceConflictInstance({
          currentFiles: [mockDeep<Resource>({ name: 'Photos' })]
        })
        instance.resolveFileExists = vi.fn(() =>
          Promise.resolve({ strategy: ResolveStrategy.KEEP_BOTH, doForAllConflicts: false })
        )
        const result = await instance.displayOverwriteDialog(
          [file],
          [{ name: 'Photos', type: 'folder' }]
        )
        return result.files[0]
      }

      it('should rename the uploaded folder in the endpoints of a nested file', async () => {
        const file = {
          id: 'file',
          name: 'a.txt',
          meta: {
            relativeFolder: '/Photos/sub',
            relativePath: '/Photos/sub/a.txt',
            tusEndpoint: `${baseUrl}/Photos/sub`
          },
          tus: { endpoint: `${baseUrl}/Photos/sub` }
        } as unknown as OcUppyFile

        const result = await keepBoth(file)

        expect(result.meta.tusEndpoint).toBe(`${baseUrl}/${newFolder}/sub`)
        expect(result.tus.endpoint).toBe(`${baseUrl}/${newFolder}/sub`)
      })
      it('should rename the uploaded folder in the xhr endpoint of a file', async () => {
        const file = {
          id: 'file',
          name: 'a.txt',
          meta: {
            relativeFolder: '/Photos',
            relativePath: '/Photos/a.txt',
            tusEndpoint: `${baseUrl}/Photos/a.txt`
          },
          xhrUpload: { endpoint: `${baseUrl}/Photos/a.txt` }
        } as unknown as OcUppyFile

        const result = await keepBoth(file)

        expect(result.meta.tusEndpoint).toBe(`${baseUrl}/${newFolder}/a.txt`)
        expect(result.xhrUpload.endpoint).toBe(`${baseUrl}/${newFolder}/a.txt`)
      })
      it('should rename the uploaded folder in the endpoints of its directory entry', async () => {
        const tusFolder = {
          id: 'tus-folder',
          name: 'Photos',
          type: 'directory',
          meta: { relativeFolder: '/Photos', relativePath: '/Photos', tusEndpoint: baseUrl },
          tus: { endpoint: baseUrl }
        } as unknown as OcUppyFile
        const xhrFolder = {
          id: 'xhr-folder',
          name: 'Photos',
          type: 'directory',
          meta: {
            relativeFolder: '/Photos',
            relativePath: '/Photos',
            tusEndpoint: `${baseUrl}/Photos`
          },
          xhrUpload: { endpoint: `${baseUrl}/Photos` }
        } as unknown as OcUppyFile

        const tusResult = await keepBoth(tusFolder)
        const xhrResult = await keepBoth(xhrFolder)

        expect(tusResult.meta.tusEndpoint).toBe(baseUrl)
        expect(tusResult.tus.endpoint).toBe(baseUrl)
        expect(xhrResult.meta.tusEndpoint).toBe(`${baseUrl}/${newFolder}`)
        expect(xhrResult.xhrUpload.endpoint).toBe(`${baseUrl}/${newFolder}`)
      })
    })
    describe('keep both endpoints', () => {
      const folderNames = ['Photos', 'a$$b', "a$&b $' (x)", 'a+b %20', 'Ünï cødé 日本', "a'b!*~"]
      const baseUrls = [
        'https://example.com/dav/spaces/abc$def',
        'https://example.com/dav/public-files/tok'
      ]
      const cases = folderNames.flatMap((folder) =>
        baseUrls.flatMap((baseUrl) =>
          ['/', `/${folder}`, `/x/${folder}/${folder}`].flatMap((currentFolder) =>
            [true, false].map((tus) => ({ folder, baseUrl, currentFolder, tus }))
          )
        )
      )

      function getEndpoint(baseUrl: string, currentFolder: string, segments: string[]) {
        const webDavUrl = urlJoin(
          baseUrl,
          currentFolder.split('/').map(encodeURIComponent).join('/')
        )
        return urlJoin(webDavUrl, segments.map(encodeURIComponent).join('/'))
      }

      // builds the file like HandleUpload.prepareFiles does
      function buildUploadFile(
        relativePath: string,
        name: string,
        type: string,
        { baseUrl, currentFolder, tus }: { baseUrl: string; currentFolder: string; tus: boolean }
      ) {
        const directory = dirname(relativePath)
        const endpointSegments = directory.split('/').filter(Boolean)
        if (!tus) {
          endpointSegments.push(name)
        }
        const endpoint = getEndpoint(baseUrl, currentFolder, endpointSegments)
        return {
          id: relativePath,
          name,
          type,
          meta: {
            relativePath,
            relativeFolder: type === 'directory' ? urlJoin(directory, name) : directory,
            tusEndpoint: endpoint
          },
          [tus ? 'tus' : 'xhrUpload']: { endpoint },
          endpointSegments
        }
      }

      it.each(cases)(
        'renames only the uploaded folder "$folder" in "$currentFolder" of $baseUrl (tus: $tus)',
        async (options) => {
          const { folder } = options
          const newFolder = `${folder} (1)`
          const files = [
            buildUploadFile(`/${folder}`, folder, 'directory', options),
            buildUploadFile(`/${folder}/${folder}`, folder, 'directory', options),
            buildUploadFile(
              `/${folder}/sub/${folder}/${folder}.txt`,
              `${folder}.txt`,
              'file',
              options
            ),
            buildUploadFile(`/${folder}/a.txt`, 'a.txt', 'file', options)
          ]
          const expected = files.map((file) => ({
            relativeFolder: `/${newFolder}${file.meta.relativeFolder.slice(folder.length + 1)}`,
            endpoint: getEndpoint(
              options.baseUrl,
              options.currentFolder,
              file.endpointSegments.map((segment, i) => (i === 0 ? newFolder : segment))
            )
          }))
          const instance = getResourceConflictInstance({
            currentFiles: [mockDeep<Resource>({ name: folder })]
          })
          instance.resolveFileExists = vi.fn(() =>
            Promise.resolve({ strategy: ResolveStrategy.KEEP_BOTH, doForAllConflicts: false })
          )

          const result = await instance.displayOverwriteDialog(files as unknown as OcUppyFile[], [
            { name: folder, type: 'folder' }
          ])

          expect(result.files.length).toBe(files.length)
          for (const [index, file] of result.files.entries()) {
            expect(file.meta.relativeFolder).toBe(expected[index].relativeFolder)
            expect(file.meta.tusEndpoint).toBe(expected[index].endpoint)
            expect(file[options.tus ? 'tus' : 'xhrUpload'].endpoint).toBe(expected[index].endpoint)
          }
          expect(result.files[1].meta.relativePath).toBe(`/${newFolder}/${folder}`)
          expect(result.files[2].meta.relativePath).toBe(
            `/${newFolder}/sub/${folder}/${folder}.txt`
          )
          expect(result.files[3].meta.relativePath).toBe(`/${newFolder}/a.txt`)
        }
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

function createUploadFile(name: string, relativeFolder = '', transport: 'xhr' | 'tus' = 'xhr') {
  const relativePath = `${relativeFolder}/${name}`
  const folderEndpoint = `https://example.com/dav${relativeFolder
    .split('/')
    .map(encodeURIComponent)
    .join('/')}`
  const fileEndpoint = `${folderEndpoint}/${encodeURIComponent(name)}`
  return mockDeep<OcUppyFile>({
    id: relativePath,
    name,
    meta: {
      name,
      relativeFolder,
      relativePath,
      tusEndpoint: transport === 'xhr' ? fileEndpoint : folderEndpoint
    },
    xhrUpload: transport === 'xhr' ? { endpoint: fileEndpoint } : undefined,
    tus: transport === 'tus' ? { endpoint: folderEndpoint } : undefined
  })
}
