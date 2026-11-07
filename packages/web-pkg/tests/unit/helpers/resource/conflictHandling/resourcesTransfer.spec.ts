import {
  ResolveConflict,
  ResolveStrategy,
  ResourceTransfer,
  TransferType,
  type TransferData,
  resolveFileNameDuplicate
} from '../../../../../src/helpers/resource/conflictHandling'
import { mock, mockDeep, mockReset } from 'vitest-mock-extended'
import { buildSpace, Resource, SpaceResource } from '@opencloud-eu/web-client'
import { ListFilesResult } from '@opencloud-eu/web-client/webdav'
import { Drive } from '@opencloud-eu/web-client/graph/generated'
import { createTestingPinia } from '@opencloud-eu/web-test-helpers'
import { ClientService } from '../../../../../src/services'
import { computed } from 'vue'

const clientServiceMock = mockDeep<ClientService>()
let resourcesToMove: Resource[]
let sourceSpace: SpaceResource
let targetSpace: SpaceResource
let targetFolder: Resource

describe('resourcesTransfer', () => {
  beforeEach(() => {
    createTestingPinia()
    mockReset(clientServiceMock)
    resourcesToMove = [
      {
        id: 'a',
        name: 'a',
        path: '/a',
        type: 'folder'
      },
      {
        id: 'b',
        name: 'b',
        path: '/b'
      }
    ]
    const spaceOptions = {
      id: 'c42c9504-2c19-44fd-87cc-b4fc20ecbb54'
    } as unknown as Drive
    sourceSpace = buildSpace(spaceOptions)
    targetSpace = buildSpace(spaceOptions)
    targetFolder = {
      id: 'target',
      path: 'target',
      webDavPath: '/target'
    }
  })
  it.each([
    { name: 'a', extension: '', expectName: 'a (1)' },
    { name: 'a', extension: '', expectName: 'a (2)', existing: [{ name: 'a (1)' }] },
    { name: 'a (1)', extension: '', expectName: 'a (1) (1)' },
    { name: 'b.png', extension: 'png', expectName: 'b (1).png' },
    { name: 'b.png', extension: 'png', expectName: 'b (2).png', existing: [{ name: 'b (1).png' }] },
    { name: '.env', extension: 'env', expectName: '.env (1)' },
    { name: '.env', extension: 'env', expectName: '.env (2)', existing: [{ name: '.env (1)' }] },
    { name: '.config.json', extension: 'json', expectName: '.config (1).json' },
    { name: 'b.md', extension: 'png', expectName: 'b.md (1)' }
  ])('should name duplicate file correctly', (dataSet) => {
    const existing = dataSet.existing ? [...resourcesToMove, ...dataSet.existing] : resourcesToMove
    const result = resolveFileNameDuplicate(dataSet.name, dataSet.extension, existing as Resource[])
    expect(result).toEqual(dataSet.expectName)
  })

  it('should prevent recursive paste', async () => {
    const resourcesTransfer = new ResourceTransfer(
      sourceSpace,
      resourcesToMove,
      targetSpace,
      resourcesToMove[0],
      computed(() => mock<Resource>()),
      clientServiceMock,
      vi.fn(),
      vi.fn()
    )
    const result = await resourcesTransfer.getTransferData(TransferType.COPY)
    expect(result.length).toBe(0)
  })

  it.each([
    { targetPath: '/a/b', expected: true },
    { targetPath: '/a/b/c', expected: true },
    { targetPath: '/ab', expected: false }
  ])('detects recursion for target "$targetPath"', ({ targetPath, expected }) => {
    const resourcesTransfer = new ResourceTransfer(
      sourceSpace,
      [resourcesToMove[0]],
      targetSpace,
      mock<Resource>({ path: targetPath }),
      computed(() => mock<Resource>()),
      clientServiceMock,
      vi.fn(),
      vi.fn()
    )
    expect(resourcesTransfer.hasRecursion()).toBe(expected)
  })

  describe('copyMoveResource without conflicts', () => {
    it.each([TransferType.COPY, TransferType.MOVE])(
      'should copy / move files without renaming them if no conflicts exist',
      async (action: TransferType) => {
        const listFilesResult: ListFilesResult = {
          resource: {} as Resource,
          children: []
        }
        clientServiceMock.webdav.listFiles.mockReturnValueOnce(
          new Promise((resolve) => resolve(listFilesResult))
        )
        const resourcesTransfer = new ResourceTransfer(
          sourceSpace,
          resourcesToMove,
          targetSpace,
          targetFolder,
          computed(() => mock<Resource>()),
          clientServiceMock,
          vi.fn(),
          vi.fn()
        )
        const transferData = await resourcesTransfer.getTransferData(action)

        expect(transferData.length).toBe(resourcesToMove.length)

        for (let i = 0; i < resourcesToMove.length; i++) {
          const input = resourcesToMove[i]
          const output = transferData[i]
          expect(input.name).toBe(output.resource.name)
        }
      }
    )
  })
  it('keeps both with names that are not taken by other items of the same batch', async () => {
    const files = [
      { id: '1', name: 'a.txt', extension: 'txt', path: '/a.txt' },
      { id: '2', name: 'a (1).txt', extension: 'txt', path: '/a (1).txt' }
    ] as Resource[]
    clientServiceMock.webdav.listFiles.mockResolvedValueOnce({
      resource: targetFolder,
      children: [{ id: '3', name: 'a.txt', path: 'target/a.txt' } as Resource]
    })
    const resourcesTransfer = new ResourceTransfer(
      sourceSpace,
      files,
      targetSpace,
      targetFolder,
      computed(() => mock<Resource>()),
      clientServiceMock,
      vi.fn(),
      vi.fn()
    )
    resourcesTransfer.resolveAllConflicts = vi
      .fn()
      .mockResolvedValue([{ resource: files[0], strategy: ResolveStrategy.KEEP_BOTH }])

    const transferData = await resourcesTransfer.getTransferData(TransferType.COPY)

    expect(transferData.map(({ path }) => path)).toEqual(['target/a (2).txt', 'target/a (1).txt'])
  })
  describe('getTransferData with conflicts', () => {
    const batchTargetFolder = { id: 'target', path: '/target', webDavPath: '/target' } as Resource
    const otherSpace = buildSpace({ id: 'other-space' } as unknown as Drive)

    function file(id: string, dir: string, name = 'report.txt') {
      return {
        id,
        name,
        extension: name.includes('.') ? name.split('.').pop() : '',
        path: `/${dir}/${name}`,
        type: 'file',
        isFolder: false
      } as Resource
    }

    function folder(id: string, dir: string, name = 'docs') {
      return {
        id,
        name,
        extension: '',
        path: `/${dir}/${name}`,
        type: 'folder',
        isFolder: true
      } as Resource
    }

    function existing(name: string, isFolder = false) {
      return { id: `existing-${name}`, name, path: `/target/${name}`, isFolder } as Resource
    }

    function getResourceTransfer({
      resources,
      children = [],
      answers = [],
      source = sourceSpace
    }: {
      resources: Resource[]
      children?: Resource[]
      answers?: ResolveConflict[]
      source?: SpaceResource
    }) {
      clientServiceMock.webdav.listFiles.mockResolvedValue({
        resource: batchTargetFolder,
        children
      })
      const resourceTransfer = new ResourceTransfer(
        source,
        resources,
        targetSpace,
        batchTargetFolder,
        computed(() => batchTargetFolder),
        clientServiceMock,
        vi.fn(),
        vi.fn()
      )
      const resolveFileExists = vi.fn()
      for (const answer of answers) {
        resolveFileExists.mockResolvedValueOnce(answer)
      }
      resourceTransfer.resolveFileExists = resolveFileExists
      resourceTransfer.resolveDoCopyInsteadOfMoveForSpaces = vi.fn().mockResolvedValue(true)
      return { resourceTransfer, resolveFileExists }
    }

    function expectUniquePaths(transferData: TransferData[]) {
      const paths = transferData.map(({ path }) => path)
      expect(new Set(paths).size).toBe(paths.length)
    }

    const keepBoth = { strategy: ResolveStrategy.KEEP_BOTH, doForAllConflicts: false }
    const keepBothForAll = { strategy: ResolveStrategy.KEEP_BOTH, doForAllConflicts: true }
    const skip = { strategy: ResolveStrategy.SKIP, doForAllConflicts: false }
    const skipForAll = { strategy: ResolveStrategy.SKIP, doForAllConflicts: true }
    const replace = { strategy: ResolveStrategy.REPLACE, doForAllConflicts: false }
    const replaceForAll = { strategy: ResolveStrategy.REPLACE, doForAllConflicts: true }
    const cancel = { strategy: ResolveStrategy.CANCEL, doForAllConflicts: false }

    describe('closing a conflict dialog', () => {
      it.each([TransferType.MOVE, TransferType.COPY])(
        'cancels the whole transfer when the first dialog is closed (transfer type %s)',
        async (transferType) => {
          const resources = [file('1', 'fa', 'a.txt'), file('2', 'fb', 'b.txt'), file('3', 'fc')]
          const { resourceTransfer, resolveFileExists } = getResourceTransfer({
            resources,
            children: [existing('b.txt'), existing('report.txt')],
            answers: [cancel]
          })

          const transferData = await resourceTransfer.getTransferData(transferType)

          expect(resolveFileExists).toHaveBeenCalledTimes(1)
          expect(transferData).toEqual([])
        }
      )

      it.each([
        { label: 'keep both', answer: keepBoth },
        { label: 'replace', answer: replace },
        { label: 'skip', answer: skip }
      ])(
        'cancels the whole transfer when a later dialog is closed after answering "$label"',
        async ({ answer }) => {
          const resources = [file('1', 'fa', 'a.txt'), file('2', 'fb', 'b.txt'), file('3', 'fc')]
          const { resourceTransfer, resolveFileExists } = getResourceTransfer({
            resources,
            children: [existing('a.txt'), existing('b.txt'), existing('report.txt')],
            answers: [answer, cancel]
          })

          const transferData = await resourceTransfer.getTransferData(TransferType.MOVE)

          expect(resolveFileExists).toHaveBeenCalledTimes(2)
          expect(transferData).toEqual([])
        }
      )

      it.each([TransferType.MOVE, TransferType.COPY])(
        'cancels the whole transfer when the dialog of a clash inside the batch is closed (transfer type %s)',
        async (transferType) => {
          const resources = [file('1', 'fa'), file('2', 'fb'), file('3', 'fc')]
          const { resourceTransfer, resolveFileExists } = getResourceTransfer({
            resources,
            answers: [cancel]
          })

          const transferData = await resourceTransfer.getTransferData(transferType)

          expect(resolveFileExists).toHaveBeenCalledTimes(1)
          expect(transferData).toEqual([])
        }
      )

      it('cancels the whole transfer when the dialog asked again despite "apply to all" is closed', async () => {
        const resources = [file('1', 'fa'), file('2', 'fb'), file('3', 'fc', 'a.txt')]
        const { resourceTransfer, resolveFileExists } = getResourceTransfer({
          resources,
          children: [existing('report.txt'), existing('a.txt')],
          answers: [replaceForAll, cancel]
        })

        const transferData = await resourceTransfer.getTransferData(TransferType.MOVE)

        expect(resolveFileExists).toHaveBeenCalledTimes(2)
        expect(transferData).toEqual([])
      })

      it('cancels the whole transfer when a dialog is closed during a move across spaces', async () => {
        const resources = [file('1', 'fa'), file('2', 'fb', 'b.txt')]
        const { resourceTransfer } = getResourceTransfer({
          resources,
          source: otherSpace,
          children: [existing('report.txt')],
          answers: [cancel]
        })

        const transferData = await resourceTransfer.getTransferData(TransferType.MOVE)

        expect(transferData).toEqual([])
      })

      it('cancels the whole transfer when a dialog is closed while copying into the same folder', async () => {
        const resources = [file('1', 'target', 'a.txt'), file('2', 'target', 'b.txt')]
        const { resourceTransfer, resolveFileExists } = getResourceTransfer({
          resources,
          children: [existing('a.txt'), existing('b.txt')],
          answers: [keepBoth, cancel]
        })

        const transferData = await resourceTransfer.getTransferData(TransferType.COPY)

        expect(resolveFileExists).toHaveBeenCalledTimes(2)
        expect(transferData).toEqual([])
      })
    })

    describe('items of the same batch with the same name', () => {
      it.each([TransferType.MOVE, TransferType.COPY])(
        'asks for the second of two files with the same name and keeps both (transfer type %s)',
        async (transferType) => {
          const resources = [file('1', 'fa'), file('2', 'fb')]
          const { resourceTransfer, resolveFileExists } = getResourceTransfer({
            resources,
            answers: [keepBoth]
          })

          const transferData = await resourceTransfer.getTransferData(transferType)

          expect(resolveFileExists).toHaveBeenCalledExactlyOnceWith(
            resources[1],
            1,
            false,
            false,
            false,
            false,
            true
          )
          expect(
            transferData.map(({ resource, path, overwrite }) => [resource.id, path, overwrite])
          ).toEqual([
            ['1', '/target/report.txt', false],
            ['2', '/target/report (1).txt', false]
          ])
          expect(transferData.map(({ resource }) => resource.name)).toEqual([
            'report.txt',
            'report (1).txt'
          ])
          expect(transferData.every((data) => data.transferType === transferType)).toBe(true)
          // the selected resources themselves are not renamed
          expect(resources.map(({ name }) => name)).toEqual(['report.txt', 'report.txt'])
        }
      )

      it.each([TransferType.MOVE, TransferType.COPY])(
        'keeps both folders with the same name (transfer type %s)',
        async (transferType) => {
          const resources = [folder('1', 'fa'), folder('2', 'fb')]
          const { resourceTransfer, resolveFileExists } = getResourceTransfer({
            resources,
            answers: [keepBoth]
          })

          const transferData = await resourceTransfer.getTransferData(transferType)

          expect(resolveFileExists).toHaveBeenCalledExactlyOnceWith(
            resources[1],
            1,
            false,
            false,
            true,
            false,
            true
          )
          expect(transferData.map(({ path }) => path)).toEqual(['/target/docs', '/target/docs (1)'])
        }
      )

      it('keeps a file and a folder with the same name', async () => {
        const resources = [folder('1', 'fa', 'x'), file('2', 'fb', 'x')]
        const { resourceTransfer } = getResourceTransfer({ resources, answers: [keepBoth] })

        const transferData = await resourceTransfer.getTransferData(TransferType.MOVE)

        expect(transferData.map(({ path }) => path)).toEqual(['/target/x', '/target/x (1)'])
      })

      it('gives three files with the same name different names', async () => {
        const resources = [file('1', 'fa'), file('2', 'fb'), file('3', 'fc')]
        const { resourceTransfer, resolveFileExists } = getResourceTransfer({
          resources,
          answers: [keepBoth, keepBoth]
        })

        const transferData = await resourceTransfer.getTransferData(TransferType.MOVE)

        expect(resolveFileExists.mock.calls.map(([resource, count]) => [resource, count])).toEqual([
          [resources[1], 2],
          [resources[2], 1]
        ])
        expect(transferData.map(({ path }) => path)).toEqual([
          '/target/report.txt',
          '/target/report (1).txt',
          '/target/report (2).txt'
        ])
      })

      it('does not take names of existing items for kept files', async () => {
        const resources = [file('1', 'fa'), file('2', 'fb'), file('3', 'fc')]
        const { resourceTransfer } = getResourceTransfer({
          resources,
          children: [existing('report (1).txt')],
          answers: [keepBoth, keepBoth]
        })

        const transferData = await resourceTransfer.getTransferData(TransferType.COPY)

        expect(transferData.map(({ path }) => path)).toEqual([
          '/target/report.txt',
          '/target/report (2).txt',
          '/target/report (3).txt'
        ])
      })

      it('does not take names of other items of the batch for kept files', async () => {
        const resources = [file('1', 'fa'), file('2', 'fb'), file('3', 'fc', 'report (1).txt')]
        const { resourceTransfer, resolveFileExists } = getResourceTransfer({
          resources,
          answers: [keepBoth]
        })

        const transferData = await resourceTransfer.getTransferData(TransferType.MOVE)

        expect(resolveFileExists).toHaveBeenCalledTimes(1)
        expect(transferData.map(({ path }) => path)).toEqual([
          '/target/report.txt',
          '/target/report (2).txt',
          '/target/report (1).txt'
        ])
      })

      it('skips the second file with the same name', async () => {
        const resources = [file('1', 'fa'), file('2', 'fb')]
        const { resourceTransfer } = getResourceTransfer({ resources, answers: [skip] })

        const transferData = await resourceTransfer.getTransferData(TransferType.MOVE)

        expect(transferData.map(({ resource, path }) => [resource.id, path])).toEqual([
          ['1', '/target/report.txt']
        ])
      })

      it('keeps all files with the same name when keeping both is applied to all', async () => {
        const resources = [file('1', 'fa'), file('2', 'fb'), file('3', 'fc'), file('4', 'fd')]
        const { resourceTransfer, resolveFileExists } = getResourceTransfer({
          resources,
          answers: [keepBothForAll]
        })

        const transferData = await resourceTransfer.getTransferData(TransferType.MOVE)

        expect(resolveFileExists).toHaveBeenCalledTimes(1)
        expect(transferData.map(({ path }) => path)).toEqual([
          '/target/report.txt',
          '/target/report (1).txt',
          '/target/report (2).txt',
          '/target/report (3).txt'
        ])
      })

      it('skips all following clashes when skipping is applied to all', async () => {
        const resources = [
          file('1', 'fa'),
          file('2', 'fb'),
          file('3', 'fc'),
          file('4', 'fd', 'a.txt')
        ]
        const { resourceTransfer, resolveFileExists } = getResourceTransfer({
          resources,
          children: [existing('a.txt')],
          answers: [skipForAll]
        })

        const transferData = await resourceTransfer.getTransferData(TransferType.MOVE)

        expect(resolveFileExists).toHaveBeenCalledTimes(1)
        expect(transferData.map(({ path }) => path)).toEqual(['/target/report.txt'])
      })

      describe('combined with an existing item of the same name', () => {
        it('keeps the second file when the first one replaces the existing item', async () => {
          const resources = [file('1', 'fa'), file('2', 'fb')]
          const { resourceTransfer, resolveFileExists } = getResourceTransfer({
            resources,
            children: [existing('report.txt')],
            answers: [replace, keepBoth]
          })

          const transferData = await resourceTransfer.getTransferData(TransferType.MOVE)

          expect(resolveFileExists.mock.calls.map((args) => args[6])).toEqual([false, true])
          expect(transferData.map(({ path, overwrite }) => [path, overwrite])).toEqual([
            ['/target/report.txt', true],
            ['/target/report (1).txt', false]
          ])
        })

        it('lets the second file replace the existing item when the first one is kept', async () => {
          const resources = [file('1', 'fa'), file('2', 'fb')]
          const { resourceTransfer, resolveFileExists } = getResourceTransfer({
            resources,
            children: [existing('report.txt')],
            answers: [keepBoth, replace]
          })

          const transferData = await resourceTransfer.getTransferData(TransferType.MOVE)

          expect(resolveFileExists.mock.calls.map((args) => args[6])).toEqual([false, false])
          expect(transferData.map(({ path, overwrite }) => [path, overwrite])).toEqual([
            ['/target/report (1).txt', false],
            ['/target/report.txt', true]
          ])
        })

        it('lets the second file replace the existing item when the first one is skipped', async () => {
          const resources = [file('1', 'fa'), file('2', 'fb')]
          const { resourceTransfer, resolveFileExists } = getResourceTransfer({
            resources,
            children: [existing('report.txt')],
            answers: [skip, replace]
          })

          const transferData = await resourceTransfer.getTransferData(TransferType.COPY)

          expect(resolveFileExists.mock.calls.map((args) => args[6])).toEqual([false, false])
          expect(
            transferData.map(({ resource, path, overwrite }) => [resource.id, path, overwrite])
          ).toEqual([['2', '/target/report.txt', true]])
        })

        it('keeps all files when keeping both is applied to all', async () => {
          const resources = [file('1', 'fa'), file('2', 'fb'), file('3', 'fc')]
          const { resourceTransfer, resolveFileExists } = getResourceTransfer({
            resources,
            children: [existing('report.txt'), existing('report (2).txt')],
            answers: [keepBothForAll]
          })

          const transferData = await resourceTransfer.getTransferData(TransferType.COPY)

          expect(resolveFileExists).toHaveBeenCalledTimes(1)
          expect(transferData.map(({ path }) => path)).toEqual([
            '/target/report (1).txt',
            '/target/report (3).txt',
            '/target/report (4).txt'
          ])
        })

        it('asks again without replacing when replacing is applied to all', async () => {
          const resources = [
            file('1', 'fa'),
            file('2', 'fb'),
            file('3', 'fc'),
            file('4', 'fd', 'a.txt')
          ]
          const { resourceTransfer, resolveFileExists } = getResourceTransfer({
            resources,
            children: [existing('report.txt'), existing('a.txt')],
            answers: [replaceForAll, keepBoth, skip]
          })

          const transferData = await resourceTransfer.getTransferData(TransferType.MOVE)

          expect(
            resolveFileExists.mock.calls.map(([resource, count, , , , , hideReplace]) => [
              resource,
              count,
              hideReplace
            ])
          ).toEqual([
            [resources[0], 4, false],
            [resources[1], 3, true],
            [resources[2], 2, true]
          ])
          expect(
            transferData.map(({ resource, path, overwrite }) => [resource.id, path, overwrite])
          ).toEqual([
            ['1', '/target/report.txt', true],
            ['2', '/target/report (1).txt', false],
            ['4', '/target/a.txt', true]
          ])
        })

        it('keeps folders with the same name when the first one replaces the existing folder', async () => {
          const resources = [folder('1', 'fa'), folder('2', 'fb')]
          const { resourceTransfer, resolveFileExists } = getResourceTransfer({
            resources,
            children: [existing('docs', true)],
            answers: [replace, keepBoth]
          })

          const transferData = await resourceTransfer.getTransferData(TransferType.MOVE)

          expect(resolveFileExists.mock.calls.map((args) => [args[4], args[6]])).toEqual([
            [true, false],
            [true, true]
          ])
          expect(transferData.map(({ path, overwrite }) => [path, overwrite])).toEqual([
            ['/target/docs', true],
            ['/target/docs (1)', false]
          ])
        })
      })

      it('copies files with the same name when moving them across spaces', async () => {
        const resources = [file('1', 'fa'), file('2', 'fb')]
        const { resourceTransfer } = getResourceTransfer({
          resources,
          source: otherSpace,
          answers: [keepBoth]
        })

        const transferData = await resourceTransfer.getTransferData(TransferType.MOVE)

        expect(transferData.map(({ path, transferType }) => [path, transferType])).toEqual([
          ['/target/report.txt', TransferType.COPY],
          ['/target/report (1).txt', TransferType.COPY]
        ])
      })

      const choices = { keepBoth, keepBothForAll, skip, skipForAll, replace, replaceForAll }
      const choicePairs = Object.keys(choices).flatMap((first) =>
        Object.keys(choices).map((second) => ({ first, second }))
      )
      it.each(choicePairs)(
        'never transfers two items to the same path (answers: $first, then $second)',
        async (pair) => {
          const first = choices[pair.first as keyof typeof choices]
          const second = choices[pair.second as keyof typeof choices]
          const resources = [
            file('1', 'fa'),
            file('2', 'fb'),
            file('3', 'fc'),
            file('4', 'fd', 'report (1).txt'),
            folder('5', 'fa'),
            folder('6', 'fb')
          ]
          const { resourceTransfer, resolveFileExists } = getResourceTransfer({
            resources,
            children: [existing('report.txt'), existing('docs', true)]
          })
          // replacing is only answered where it is offered, otherwise keep both
          resolveFileExists.mockImplementation((...args: unknown[]) => {
            const answer = resolveFileExists.mock.calls.length === 1 ? first : second
            const hideReplace = args[6]
            if (hideReplace && answer.strategy === ResolveStrategy.REPLACE) {
              return Promise.resolve(keepBoth)
            }
            return Promise.resolve(answer)
          })

          const transferData = await resourceTransfer.getTransferData(TransferType.MOVE)

          expectUniquePaths(transferData)
          for (const { path, overwrite } of transferData) {
            if (overwrite) {
              // only existing items may be replaced, never other items of the batch
              expect(['/target/report.txt', '/target/docs']).toContain(path)
            }
          }
        }
      )

      describe('combined with an item of the batch that is already in the target folder', () => {
        // the listing of the target folder returns the same resource as a separate object
        function inTarget(id: string, name = 'report.txt') {
          const resource = file(id, 'target', name)
          return { resource, child: { ...resource } }
        }

        function expectNoOverwriteOfOtherSources(
          transferData: TransferData[],
          resources: Resource[]
        ) {
          for (const { resource, path, overwrite } of transferData) {
            if (!overwrite) {
              continue
            }
            const otherSources = resources.filter(({ id }) => id !== resource.id)
            expect(otherSources.map((r) => r.path)).not.toContain(path)
          }
        }

        it.each([TransferType.MOVE, TransferType.COPY])(
          'does not offer replacing the item of the batch when it comes later (transfer type %s)',
          async (transferType) => {
            const { resource: targetItem, child } = inTarget('t')
            const resources = [file('1', 'fa'), targetItem]
            const { resourceTransfer, resolveFileExists } = getResourceTransfer({
              resources,
              children: [child],
              answers: [keepBoth, keepBoth]
            })

            const transferData = await resourceTransfer.getTransferData(transferType)

            expect(
              resolveFileExists.mock.calls.map(([resource, , , , , , hideReplace]) => [
                resource,
                hideReplace
              ])
            ).toEqual([
              [resources[0], true],
              [resources[1], false]
            ])
            expect(
              transferData.map(({ resource, path, overwrite }) => [resource.id, path, overwrite])
            ).toEqual([
              ['1', '/target/report (1).txt', false],
              ['t', '/target/report (2).txt', false]
            ])
            expectNoOverwriteOfOtherSources(transferData, resources)
          }
        )

        it.each([TransferType.MOVE, TransferType.COPY])(
          'does not offer replacing the item of the batch when it comes first (transfer type %s)',
          async (transferType) => {
            const { resource: targetItem, child } = inTarget('t')
            const resources = [targetItem, file('1', 'fa')]
            const { resourceTransfer, resolveFileExists } = getResourceTransfer({
              resources,
              children: [child],
              answers: [skip, keepBoth]
            })

            const transferData = await resourceTransfer.getTransferData(transferType)

            expect(
              resolveFileExists.mock.calls.map(([resource, , , , , , hideReplace]) => [
                resource,
                hideReplace
              ])
            ).toEqual([
              [resources[0], false],
              [resources[1], true]
            ])
            expect(
              transferData.map(({ resource, path, overwrite }) => [resource.id, path, overwrite])
            ).toEqual([['1', '/target/report (1).txt', false]])
          }
        )

        it.each([TransferType.MOVE, TransferType.COPY])(
          'keeps the other file when the item of the batch is replaced by itself (transfer type %s)',
          async (transferType) => {
            const { resource: targetItem, child } = inTarget('t')
            const resources = [targetItem, file('1', 'fa')]
            const { resourceTransfer, resolveFileExists } = getResourceTransfer({
              resources,
              children: [child],
              answers: [replace, keepBoth]
            })

            const transferData = await resourceTransfer.getTransferData(transferType)

            expect(resolveFileExists.mock.calls.map((args) => args[6])).toEqual([false, true])
            // replacing an item by itself is a no-op and not transferred
            expect(
              transferData.map(({ resource, path, overwrite }) => [resource.id, path, overwrite])
            ).toEqual([['1', '/target/report (1).txt', false]])
          }
        )

        it.each([
          { order: 'later', ids: ['x', '1', 't'] },
          { order: 'first', ids: ['x', 't', '1'] }
        ])(
          'asks again without replacing when replacing is applied to all and the item of the batch comes $order',
          async ({ ids }) => {
            const { resource: targetItem, child } = inTarget('t')
            const byId: Record<string, Resource> = {
              x: file('x', 'fx', 'a.txt'),
              '1': file('1', 'fa'),
              t: targetItem
            }
            const resources = ids.map((id) => byId[id])
            const { resourceTransfer, resolveFileExists } = getResourceTransfer({
              resources,
              children: [existing('a.txt'), child],
              answers: [replaceForAll, keepBoth]
            })

            const transferData = await resourceTransfer.getTransferData(TransferType.MOVE)

            expect(
              resolveFileExists.mock.calls.map(([resource, , , , , , hideReplace]) => [
                resource.id,
                hideReplace
              ])
            ).toEqual([
              ['x', false],
              ['1', true]
            ])
            expect(
              transferData.map(({ resource, path, overwrite }) => [resource.id, path, overwrite])
            ).toEqual([
              ['x', '/target/a.txt', true],
              ['1', '/target/report (1).txt', false]
            ])
          }
        )

        it.each(
          choicePairs.flatMap((pair) =>
            ['first', 'middle'].flatMap((position) =>
              [TransferType.MOVE, TransferType.COPY].map((transferType) => ({
                ...pair,
                position,
                transferType
              }))
            )
          )
        )(
          'never replaces another item of the batch (answers: $first, then $second, item in the target folder: $position, transfer type $transferType)',
          async ({ position, transferType, ...pair }) => {
            const first = choices[pair.first as keyof typeof choices]
            const second = choices[pair.second as keyof typeof choices]
            const { resource: targetFile, child: targetFileChild } = inTarget('t')
            const targetFolderItem = folder('tf', 'target')
            const others = [
              file('1', 'fa'),
              file('2', 'fb'),
              file('4', 'fd', 'report (1).txt'),
              folder('5', 'fa')
            ]
            const resources =
              position === 'first'
                ? [targetFile, targetFolderItem, ...others]
                : [others[0], targetFile, others[1], others[2], others[3], targetFolderItem]
            const { resourceTransfer, resolveFileExists } = getResourceTransfer({
              resources,
              children: [targetFileChild, { ...targetFolderItem }]
            })
            resolveFileExists.mockImplementation((...args: unknown[]) => {
              const answer = resolveFileExists.mock.calls.length === 1 ? first : second
              const hideReplace = args[6]
              if (hideReplace && answer.strategy === ResolveStrategy.REPLACE) {
                return Promise.resolve(keepBoth)
              }
              return Promise.resolve(answer)
            })

            const transferData = await resourceTransfer.getTransferData(transferType)

            expectUniquePaths(transferData)
            expectNoOverwriteOfOtherSources(transferData, resources)
          }
        )
      })
    })
  })

  it('should show message if conflict exists', async () => {
    const targetFolderItems = [
      {
        id: 'a',
        path: 'target/a',
        webDavPath: '/target/a',
        name: '/target/a'
      }
    ]
    const resourcesTransfer = new ResourceTransfer(
      sourceSpace,
      resourcesToMove,
      targetSpace,
      resourcesToMove[0],
      computed(() => mock<Resource>()),
      clientServiceMock,
      vi.fn(),
      vi.fn()
    )
    resourcesTransfer.resolveFileExists = vi
      .fn()
      .mockImplementation(() => Promise.resolve({ strategy: 0 } as ResolveConflict))
    await resourcesTransfer.resolveAllConflicts(resourcesToMove, targetFolder, targetFolderItems)

    expect(resourcesTransfer.resolveFileExists).toHaveBeenCalled()
  })
  it('should show error message if trying to overwrite parent', () => {
    const targetFolderItems = [
      {
        id: 'a',
        path: 'target/a',
        webDavPath: '/target/a',
        name: '/target/a'
      }
    ]
    const resourcesTransfer = new ResourceTransfer(
      sourceSpace,
      resourcesToMove,
      targetSpace,
      resourcesToMove[0],
      computed(() => mock<Resource>({ path: '/' })),
      clientServiceMock,
      vi.fn(),
      vi.fn()
    )
    const namingClash = resourcesTransfer.isOverwritingParentFolder(
      resourcesToMove[0],
      targetFolder,
      targetFolderItems
    )
    const noNamingClash = resourcesTransfer.isOverwritingParentFolder(
      resourcesToMove[1],
      targetFolder,
      targetFolderItems
    )

    expect(namingClash).toBeTruthy()
    expect(noNamingClash).toBeFalsy()
  })
})
