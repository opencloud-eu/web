import { ref, unref } from 'vue'
import { SortOptions, useSort } from '../../../../src/composables'
import { Resource } from '@opencloud-eu/web-client'
import { getComposableWrapper } from '@opencloud-eu/web-test-helpers'
import { SortDir } from '@opencloud-eu/design-system/helpers'

describe('useSort', () => {
  it('should be valid', () => {
    expect(useSort).toBeDefined()
  })

  it('does not sort if no sort field was given', () => {
    getComposableWrapper(() => {
      const input: SortOptions<any> = {
        items: [{ id: '3' }, { id: '4' }, { id: '6' }, { id: '1' }, { id: '2' }, { id: '5' }],
        fields: [],
        sortBy: ref<string>(null),
        sortDir: ref<SortDir>(null),
        routeName: 'mocked'
      }

      const { items } = useSort(input)

      expect(unref(items)).toMatchObject([
        { id: '3' },
        { id: '4' },
        { id: '6' },
        { id: '1' },
        { id: '2' },
        { id: '5' }
      ])
    })
  })

  describe('sorting resources', () => {
    const resources: Resource[] = [
      { id: '1', name: 'c.png', path: '', webDavPath: '', mdate: '2' },
      { id: '2', name: 'Dir4', path: '', webDavPath: '', mdate: '4', type: 'folder' },
      { id: '3', name: 'a.png', path: '', webDavPath: '', mdate: '3' },
      { id: '4', name: 'A.png', path: '', webDavPath: '', mdate: '6' },
      { id: '5', name: 'dir2', path: '', webDavPath: '', mdate: '7', type: 'folder' },
      { id: '6', name: 'b.png', path: '', webDavPath: '', mdate: '1' },
      { id: '7', name: 'Dir1', path: '', webDavPath: '', mdate: '5', type: 'folder' },
      { id: '8', name: 'dir11', path: '', webDavPath: '', mdate: '8', type: 'folder' },
      { id: '9', name: 'dir3', path: '', webDavPath: '', mdate: '9', type: 'folder' },
      {
        id: '10',
        name: 'dir.with.dot',
        extension: 'dot',
        path: '',
        webDavPath: '',
        mdate: '10',
        type: 'folder'
      },
      { id: '11', name: 'New file.txt', path: '', webDavPath: '', mdate: '11' },
      { id: '12', name: 'New file (1).txt', path: '', webDavPath: '', mdate: '12' },
      { id: '13', name: 'New file (2).txt', path: '', webDavPath: '', mdate: '13' },
      { id: '14', name: 'New file (10).txt', path: '', webDavPath: '', mdate: '14' },
      { id: '15', name: 'New folder', path: '', webDavPath: '', mdate: '15', type: 'folder' },
      { id: '16', name: 'New folder (1)', path: '', webDavPath: '', mdate: '16', type: 'folder' },
      { id: '17', name: 'a.a.txt', path: '', webDavPath: '', mdate: '17' },
      { id: '18', name: 'a.b.txt', path: '', webDavPath: '', mdate: '18' },
      { id: '19', name: 'a.b.c.txt', path: '', webDavPath: '', mdate: '19' },
      { id: '20', name: 'apfel.txt', path: '', webDavPath: '', mdate: '20' },
      { id: '21', name: 'Apfel.txt', path: '', webDavPath: '', mdate: '21' },
      { id: '22', name: 'äpfel.txt', path: '', webDavPath: '', mdate: '22' },
      { id: '23', name: 'Äpfel.txt', path: '', webDavPath: '', mdate: '23' },
      { id: '24', name: 'file1', path: '', webDavPath: '', mdate: '24' },
      { id: '25', name: 'file2', path: '', webDavPath: '', mdate: '25' },
      { id: '26', name: 'file3', path: '', webDavPath: '', mdate: '26' },
      { id: '27', name: 'file01', path: '', webDavPath: '', mdate: '27' },
      { id: '28', name: 'file02', path: '', webDavPath: '', mdate: '28' },
      { id: '29', name: 'file03', path: '', webDavPath: '', mdate: '29' },
      { id: '30', name: 'file001', path: '', webDavPath: '', mdate: '30' },
      { id: '31', name: 'file002', path: '', webDavPath: '', mdate: '31' },
      { id: '32', name: 'file003', path: '', webDavPath: '', mdate: '32' }
    ]

    it('sorts resources by name', () => {
      getComposableWrapper(() => {
        const sortDir = ref(SortDir.Asc)
        const input = {
          items: ref<Resource[]>(resources),
          fields: [
            {
              name: 'name',
              sortable: true
            },
            {
              name: 'mdate',
              sortable: true
            }
          ],
          sortBy: ref('name'),
          sortDir
        }

        const { items } = useSort<Resource>(input)

        expect(unref(items).map((i) => i.name)).toMatchObject([
          'dir.with.dot',
          'Dir1',
          'dir2',
          'dir3',
          'Dir4',
          'dir11',
          'New folder',
          'New folder (1)',
          'a.png',
          'A.png',
          'a.a.txt',
          'a.b.txt',
          'a.b.c.txt',
          'apfel.txt',
          'Apfel.txt',
          'äpfel.txt',
          'Äpfel.txt',
          'b.png',
          'c.png',
          'file1',
          'file01',
          'file001',
          'file2',
          'file02',
          'file002',
          'file3',
          'file03',
          'file003',
          'New file.txt',
          'New file (1).txt',
          'New file (2).txt',
          'New file (10).txt'
        ])

        sortDir.value = SortDir.Desc
        expect(unref(items).map((i) => i.name)).toMatchObject([
          'New file (10).txt',
          'New file (2).txt',
          'New file (1).txt',
          'New file.txt',
          'file3',
          'file03',
          'file003',
          'file2',
          'file02',
          'file002',
          'file1',
          'file01',
          'file001',
          'c.png',
          'b.png',
          'äpfel.txt',
          'Äpfel.txt',
          'apfel.txt',
          'Apfel.txt',
          'a.b.c.txt',
          'a.b.txt',
          'a.a.txt',
          'a.png',
          'A.png',
          'New folder (1)',
          'New folder',
          'dir11',
          'Dir4',
          'dir3',
          'dir2',
          'Dir1',
          'dir.with.dot'
        ])
      })
    })

    const zeroPrefixBaseNames = [
      '0_NODE_GAMMA',
      '0000_BLOCK_OMEGA',
      '00_SET_IOTA',
      '00000_ITEM_OMEGA',
      '00000_ITEM_ALPHA',
      '00_SET_GAMMA',
      '0_NODE_DELTA',
      '0000_BLOCK_BETA',
      '00000_ITEM_DUMMY',
      '00_SET_BETA',
      '0_NODE_ALPHA',
      '00_SET_ZETA',
      '0000_BLOCK_GAMMA',
      '00_SET_KAPPA',
      '0000_BLOCK_ALPHA',
      '00_SET_DELTA',
      '00_SET_EPSILON',
      '0_NODE_OMEGA',
      '00_SET_OMEGA',
      '0_NODE_BETA',
      '00000_ITEM_GAMMA',
      '00_SET_LAMBDA',
      '00_SET_ALPHA',
      '00_SET_LAMBDA2',
      '00000_ITEM_DELTA2026',
      '000',
      '00',
      '0',
      '0a'
    ]
    const zeroPrefixExpectedAsc = [
      '00000_ITEM_ALPHA',
      '00000_ITEM_DELTA2026',
      '00000_ITEM_DUMMY',
      '00000_ITEM_GAMMA',
      '00000_ITEM_OMEGA',
      '0000_BLOCK_ALPHA',
      '0000_BLOCK_BETA',
      '0000_BLOCK_GAMMA',
      '0000_BLOCK_OMEGA',
      '000',
      '00',
      '00_SET_ALPHA',
      '00_SET_BETA',
      '00_SET_DELTA',
      '00_SET_EPSILON',
      '00_SET_GAMMA',
      '00_SET_IOTA',
      '00_SET_KAPPA',
      '00_SET_LAMBDA',
      '00_SET_LAMBDA2',
      '00_SET_OMEGA',
      '00_SET_ZETA',
      '0',
      '0_NODE_ALPHA',
      '0_NODE_BETA',
      '0_NODE_DELTA',
      '0_NODE_GAMMA',
      '0_NODE_OMEGA',
      '0a'
    ]
    const zeroPrefixExpectedDesc = [
      '0a',
      '0_NODE_OMEGA',
      '0_NODE_GAMMA',
      '0_NODE_DELTA',
      '0_NODE_BETA',
      '0_NODE_ALPHA',
      '0',
      '00_SET_ZETA',
      '00_SET_OMEGA',
      '00_SET_LAMBDA2',
      '00_SET_LAMBDA',
      '00_SET_KAPPA',
      '00_SET_IOTA',
      '00_SET_GAMMA',
      '00_SET_EPSILON',
      '00_SET_DELTA',
      '00_SET_BETA',
      '00_SET_ALPHA',
      '00',
      '000',
      '0000_BLOCK_OMEGA',
      '0000_BLOCK_GAMMA',
      '0000_BLOCK_BETA',
      '0000_BLOCK_ALPHA',
      '00000_ITEM_OMEGA',
      '00000_ITEM_GAMMA',
      '00000_ITEM_DUMMY',
      '00000_ITEM_DELTA2026',
      '00000_ITEM_ALPHA'
    ]

    function withExtension(names: string[], extension: string): string[] {
      if (!extension) {
        return names
      }
      return names.map((name) => `${name}${extension}`)
    }

    function buildZeroPrefixItems(names: string[], asFolders: boolean): Resource[] {
      return names.map((name, index) => ({
        id: `${index}`,
        name,
        path: '',
        webDavPath: '',
        mdate: `${index}`,
        ...(asFolders ? { type: 'folder' } : {})
      }))
    }

    ;[
      { title: 'folders', extension: '', asFolders: true },
      { title: 'files', extension: '.txt', asFolders: false }
    ].forEach(({ title, extension, asFolders }) => {
      it(`sorts ${title} with pure leading zero prefixes like Windows Explorer`, () => {
        getComposableWrapper(() => {
          const sortDir = ref(SortDir.Asc)
          const names = withExtension(zeroPrefixBaseNames, extension)

          const input = {
            items: ref<Resource[]>(buildZeroPrefixItems(names, asFolders)),
            fields: [
              {
                name: 'name',
                sortable: true
              }
            ],
            sortBy: ref('name'),
            sortDir
          }

          const { items } = useSort<Resource>(input)

          expect(unref(items).map((i) => i.name)).toEqual(
            withExtension(zeroPrefixExpectedAsc, extension)
          )

          sortDir.value = SortDir.Desc

          expect(unref(items).map((i) => i.name)).toEqual(
            withExtension(zeroPrefixExpectedDesc, extension)
          )
        })
      })
    })
  })
})
