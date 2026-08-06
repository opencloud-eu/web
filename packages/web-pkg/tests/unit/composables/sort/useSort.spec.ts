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
      }
    ]

    it('sorts resources by name', () => {
      getComposableWrapper(() => {
        const sortDir = ref(SortDir.Asc)
        const input = {
          items: ref<Resource[]>([
            ...resources,
            { id: '11', name: '000', path: '', webDavPath: '', mdate: '11', type: 'folder' },
            { id: '12', name: '0', path: '', webDavPath: '', mdate: '12', type: 'folder' },
            { id: '13', name: '0000', path: '', webDavPath: '', mdate: '13', type: 'folder' },
            { id: '14', name: '00', path: '', webDavPath: '', mdate: '14', type: 'folder' },
            { id: '87', name: '00000', path: '', webDavPath: '', mdate: '87', type: 'folder' },
            { id: '88', name: '000000', path: '', webDavPath: '', mdate: '88', type: 'folder' },
            {
              id: '15',
              name: '000 my folder',
              path: '',
              webDavPath: '',
              mdate: '15',
              type: 'folder'
            },
            {
              id: '16',
              name: '0 my folder',
              path: '',
              webDavPath: '',
              mdate: '16',
              type: 'folder'
            },
            {
              id: '17',
              name: '0000 my folder',
              path: '',
              webDavPath: '',
              mdate: '17',
              type: 'folder'
            },
            {
              id: '18',
              name: '00 my folder',
              path: '',
              webDavPath: '',
              mdate: '18',
              type: 'folder'
            },
            {
              id: '19',
              name: '0.folder set',
              path: '',
              webDavPath: '',
              mdate: '19',
              type: 'folder'
            },
            {
              id: '20',
              name: '00.folder set',
              path: '',
              webDavPath: '',
              mdate: '20',
              type: 'folder'
            },
            {
              id: '21',
              name: '000.folder set',
              path: '',
              webDavPath: '',
              mdate: '21',
              type: 'folder'
            },
            {
              id: '22',
              name: '0000.folder set',
              path: '',
              webDavPath: '',
              mdate: '22',
              type: 'folder'
            },
            {
              id: '23',
              name: '0_folder set',
              path: '',
              webDavPath: '',
              mdate: '23',
              type: 'folder'
            },
            {
              id: '24',
              name: '00_folder set',
              path: '',
              webDavPath: '',
              mdate: '24',
              type: 'folder'
            },
            {
              id: '25',
              name: '000_folder set',
              path: '',
              webDavPath: '',
              mdate: '25',
              type: 'folder'
            },
            {
              id: '26',
              name: '0000_folder set',
              path: '',
              webDavPath: '',
              mdate: '26',
              type: 'folder'
            },
            {
              id: '27',
              name: '0-folder set',
              path: '',
              webDavPath: '',
              mdate: '27',
              type: 'folder'
            },
            {
              id: '28',
              name: '00-folder set',
              path: '',
              webDavPath: '',
              mdate: '28',
              type: 'folder'
            },
            {
              id: '29',
              name: '000-folder set',
              path: '',
              webDavPath: '',
              mdate: '29',
              type: 'folder'
            },
            {
              id: '30',
              name: '0000-folder set',
              path: '',
              webDavPath: '',
              mdate: '30',
              type: 'folder'
            },
            {
              id: '31',
              name: '0 folder set',
              path: '',
              webDavPath: '',
              mdate: '31',
              type: 'folder'
            },
            {
              id: '32',
              name: '00 folder set',
              path: '',
              webDavPath: '',
              mdate: '32',
              type: 'folder'
            },
            {
              id: '33',
              name: '000 folder set',
              path: '',
              webDavPath: '',
              mdate: '33',
              type: 'folder'
            },
            {
              id: '34',
              name: '0000 folder set',
              path: '',
              webDavPath: '',
              mdate: '34',
              type: 'folder'
            },
            {
              id: '35',
              name: '00..folder set',
              path: '',
              webDavPath: '',
              mdate: '35',
              type: 'folder'
            },
            {
              id: '36',
              name: '00__folder set',
              path: '',
              webDavPath: '',
              mdate: '36',
              type: 'folder'
            },
            {
              id: '37',
              name: '00--folder set',
              path: '',
              webDavPath: '',
              mdate: '37',
              type: 'folder'
            },
            {
              id: '38',
              name: '00a folder set',
              path: '',
              webDavPath: '',
              mdate: '38',
              type: 'folder'
            },
            { id: '39', name: '0.file.txt', path: '', webDavPath: '', mdate: '39' },
            { id: '40', name: '00.file.txt', path: '', webDavPath: '', mdate: '40' },
            { id: '41', name: '000.file.txt', path: '', webDavPath: '', mdate: '41' },
            { id: '42', name: '0000.file.txt', path: '', webDavPath: '', mdate: '42' },
            { id: '43', name: '0_file.txt', path: '', webDavPath: '', mdate: '43' },
            { id: '44', name: '00_file.txt', path: '', webDavPath: '', mdate: '44' },
            { id: '45', name: '000_file.txt', path: '', webDavPath: '', mdate: '45' },
            { id: '46', name: '0000_file.txt', path: '', webDavPath: '', mdate: '46' },
            { id: '47', name: '0-file.txt', path: '', webDavPath: '', mdate: '47' },
            { id: '48', name: '00-file.txt', path: '', webDavPath: '', mdate: '48' },
            { id: '49', name: '000-file.txt', path: '', webDavPath: '', mdate: '49' },
            { id: '50', name: '0000-file.txt', path: '', webDavPath: '', mdate: '50' },
            { id: '51', name: '0 file.txt', path: '', webDavPath: '', mdate: '51' },
            { id: '52', name: '00 file.txt', path: '', webDavPath: '', mdate: '52' },
            { id: '53', name: '000 file.txt', path: '', webDavPath: '', mdate: '53' },
            { id: '54', name: '0000 file.txt', path: '', webDavPath: '', mdate: '54' },
            { id: '55', name: '00..file.txt', path: '', webDavPath: '', mdate: '55' },
            { id: '56', name: '00__file.txt', path: '', webDavPath: '', mdate: '56' },
            { id: '57', name: '00--file.txt', path: '', webDavPath: '', mdate: '57' },
            { id: '58', name: '00a.file.txt', path: '', webDavPath: '', mdate: '58' },
            { id: '59', name: 'a.2.txt', path: '', webDavPath: '', mdate: '59' },
            { id: '60', name: 'a.02.txt', path: '', webDavPath: '', mdate: '60' },
            { id: '61', name: 'a.10.txt', path: '', webDavPath: '', mdate: '61' },
            { id: '62', name: 'A.2.txt', path: '', webDavPath: '', mdate: '62' },
            { id: '63', name: 'Project', path: '', webDavPath: '', mdate: '63', type: 'folder' },
            {
              id: '64',
              name: 'project notes',
              path: '',
              webDavPath: '',
              mdate: '64',
              type: 'folder'
            },
            {
              id: '65',
              name: 'Project Archive',
              path: '',
              webDavPath: '',
              mdate: '65',
              type: 'folder'
            },
            { id: '66', name: 'alpha', path: '', webDavPath: '', mdate: '66', type: 'folder' },
            { id: '67', name: 'Beta', path: '', webDavPath: '', mdate: '67', type: 'folder' },
            { id: '68', name: 'Notes.txt', path: '', webDavPath: '', mdate: '68' },
            { id: '69', name: 'notes 2.txt', path: '', webDavPath: '', mdate: '69' },
            { id: '70', name: 'notes 10.txt', path: '', webDavPath: '', mdate: '70' },
            { id: '71', name: 'Report.docx', path: '', webDavPath: '', mdate: '71' },
            { id: '72', name: 'report final.docx', path: '', webDavPath: '', mdate: '72' },
            { id: '73', name: '01_Ärzte', path: '', webDavPath: '', mdate: '73', type: 'folder' },
            { id: '74', name: '1_Ärzte', path: '', webDavPath: '', mdate: '74', type: 'folder' },
            { id: '75', name: '01_Zebra', path: '', webDavPath: '', mdate: '75', type: 'folder' },
            { id: '76', name: 'Übung', path: '', webDavPath: '', mdate: '76', type: 'folder' },
            { id: '77', name: 'Uebung', path: '', webDavPath: '', mdate: '77', type: 'folder' },
            { id: '78', name: 'Äpfel', path: '', webDavPath: '', mdate: '78', type: 'folder' },
            { id: '79', name: 'Apfel', path: '', webDavPath: '', mdate: '79', type: 'folder' },
            {
              id: '80',
              name: '01_02_folder',
              path: '',
              webDavPath: '',
              mdate: '80',
              type: 'folder'
            },
            { id: '81', name: '1_2_folder', path: '', webDavPath: '', mdate: '81', type: 'folder' },
            {
              id: '82',
              name: '01_2_folder',
              path: '',
              webDavPath: '',
              mdate: '82',
              type: 'folder'
            },
            { id: '83', name: 'Café', path: '', webDavPath: '', mdate: '83', type: 'folder' },
            { id: '84', name: 'Café 2', path: '', webDavPath: '', mdate: '84', type: 'folder' },
            { id: '85', name: 'Straße', path: '', webDavPath: '', mdate: '85', type: 'folder' },
            { id: '86', name: 'Strasse', path: '', webDavPath: '', mdate: '86', type: 'folder' },
            { id: '89', name: 'a.txt', path: '', webDavPath: '', mdate: '89' },
            { id: '90', name: 'report.txt', path: '', webDavPath: '', mdate: '90' },
            { id: '91', name: 'report final.txt', path: '', webDavPath: '', mdate: '91' },
            { id: '92', name: 'report (1).txt', path: '', webDavPath: '', mdate: '92' },
            { id: '93', name: 'report (2).txt', path: '', webDavPath: '', mdate: '93' },
            { id: '94', name: 'report 2.txt', path: '', webDavPath: '', mdate: '94' },
            { id: '95', name: 'report 10.txt', path: '', webDavPath: '', mdate: '95' },
            { id: '96', name: 'report (02).txt', path: '', webDavPath: '', mdate: '96' },
            { id: '97', name: 'img2.png', path: '', webDavPath: '', mdate: '97' },
            { id: '98', name: 'img10.png', path: '', webDavPath: '', mdate: '98' },
            { id: '99', name: 'img02.png', path: '', webDavPath: '', mdate: '99' },
            { id: '100', name: 'img0002.png', path: '', webDavPath: '', mdate: '100' },
            { id: '101', name: 'v1.2.txt', path: '', webDavPath: '', mdate: '101' },
            { id: '102', name: 'v1.10.txt', path: '', webDavPath: '', mdate: '102' },
            { id: '103', name: 'v01.2.txt', path: '', webDavPath: '', mdate: '103' },
            { id: '104', name: 'report-final.txt', path: '', webDavPath: '', mdate: '104' },
            { id: '105', name: 'report_final.txt', path: '', webDavPath: '', mdate: '105' },
            { id: '106', name: '.env', path: '', webDavPath: '', mdate: '106' },
            { id: '107', name: '.env.local', path: '', webDavPath: '', mdate: '107' },
            { id: '108', name: '.env 2', path: '', webDavPath: '', mdate: '108' },
            { id: '109', name: '.env (1)', path: '', webDavPath: '', mdate: '109' },
            { id: '110', name: 'File.txt', path: '', webDavPath: '', mdate: '110' },
            { id: '111', name: 'file.txt', path: '', webDavPath: '', mdate: '111' },
            { id: '112', name: 'FILE.txt', path: '', webDavPath: '', mdate: '112' },
            { id: '113', name: 'a.md', path: '', webDavPath: '', mdate: '113' },
            { id: '114', name: 'a (1).txt', path: '', webDavPath: '', mdate: '114' },
            { id: '115', name: 'a final.txt', path: '', webDavPath: '', mdate: '115' },
            { id: '116', name: 'äpfel.txt', path: '', webDavPath: '', mdate: '116' },
            { id: '117', name: 'Öl.txt', path: '', webDavPath: '', mdate: '117' },
            { id: '118', name: 'Oel.txt', path: '', webDavPath: '', mdate: '118' },
            { id: '119', name: '0a', path: '', webDavPath: '', mdate: '119', type: 'folder' }
          ]),
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

        const ascNames = unref(items).map((i) => i.name)
        expect(ascNames).toEqual([
          '0',
          '0 folder set',
          '00 folder set',
          '000 folder set',
          '0 my folder',
          '0_folder set',
          '0.folder set',
          '00',
          '00 my folder',
          '000',
          '0000 folder set',
          '000 my folder',
          '00__folder set',
          '00_folder set',
          '0000',
          '0000 my folder',
          '000_folder set',
          '0000_folder set',
          '00--folder set',
          '0-folder set',
          '00-folder set',
          '000-folder set',
          '0000-folder set',
          '00..folder set',
          '00.folder set',
          '000.folder set',
          '0000.folder set',
          '0a',
          '00a folder set',
          '00000',
          '000000',
          '1_2_folder',
          '01_2_folder',
          '01_02_folder',
          '1_Ärzte',
          '01_Ärzte',
          '01_Zebra',
          'alpha',
          'Apfel',
          'Äpfel',
          'Beta',
          'Café',
          'Café 2',
          'Dir1',
          'dir2',
          'dir3',
          'Dir4',
          'dir11',
          'dir.with.dot',
          'Project',
          'Project Archive',
          'project notes',
          'Strasse',
          'Straße',
          'Übung',
          'Uebung',
          '.env',
          '.env 2',
          '.env (1)',
          '.env.local',
          '0 file.txt',
          '0_file.txt',
          '0-file.txt',
          '0.file.txt',
          '00 file.txt',
          '00__file.txt',
          '00_file.txt',
          '00--file.txt',
          '00-file.txt',
          '00..file.txt',
          '00.file.txt',
          '00a.file.txt',
          '000 file.txt',
          '000_file.txt',
          '000-file.txt',
          '000.file.txt',
          '0000 file.txt',
          '0000_file.txt',
          '0000-file.txt',
          '0000.file.txt',
          'a.md',
          'a.png',
          'a.txt',
          'a (1).txt',
          'a final.txt',
          'A.png',
          'a.2.txt',
          'A.2.txt',
          'a.02.txt',
          'a.10.txt',
          'äpfel.txt',
          'b.png',
          'c.png',
          'file.txt',
          'File.txt',
          'FILE.txt',
          'img2.png',
          'img02.png',
          'img0002.png',
          'img10.png',
          'notes 2.txt',
          'notes 10.txt',
          'Notes.txt',
          'Oel.txt',
          'Öl.txt',
          'report.txt',
          'report 2.txt',
          'report 10.txt',
          'report (1).txt',
          'report (2).txt',
          'report (02).txt',
          'report final.docx',
          'report final.txt',
          'report_final.txt',
          'report-final.txt',
          'Report.docx',
          'v1.2.txt',
          'v01.2.txt',
          'v1.10.txt'
        ])

        sortDir.value = SortDir.Desc
        const descNames = unref(items).map((i) => i.name)
        expect(descNames).toEqual([
          'v1.10.txt',
          'v01.2.txt',
          'v1.2.txt',
          'Report.docx',
          'report-final.txt',
          'report_final.txt',
          'report final.txt',
          'report final.docx',
          'report (02).txt',
          'report (2).txt',
          'report (1).txt',
          'report 10.txt',
          'report 2.txt',
          'report.txt',
          'Öl.txt',
          'Oel.txt',
          'Notes.txt',
          'notes 10.txt',
          'notes 2.txt',
          'img10.png',
          'img0002.png',
          'img02.png',
          'img2.png',
          'FILE.txt',
          'File.txt',
          'file.txt',
          'c.png',
          'b.png',
          'äpfel.txt',
          'a.10.txt',
          'a.02.txt',
          'A.2.txt',
          'a.2.txt',
          'A.png',
          'a final.txt',
          'a (1).txt',
          'a.txt',
          'a.png',
          'a.md',
          '0000.file.txt',
          '0000-file.txt',
          '0000_file.txt',
          '0000 file.txt',
          '000.file.txt',
          '000-file.txt',
          '000_file.txt',
          '000 file.txt',
          '00a.file.txt',
          '00.file.txt',
          '00..file.txt',
          '00-file.txt',
          '00--file.txt',
          '00_file.txt',
          '00__file.txt',
          '00 file.txt',
          '0.file.txt',
          '0-file.txt',
          '0_file.txt',
          '0 file.txt',
          '.env.local',
          '.env (1)',
          '.env 2',
          '.env',
          'Uebung',
          'Übung',
          'Straße',
          'Strasse',
          'project notes',
          'Project Archive',
          'Project',
          'dir.with.dot',
          'dir11',
          'Dir4',
          'dir3',
          'dir2',
          'Dir1',
          'Café 2',
          'Café',
          'Beta',
          'Äpfel',
          'Apfel',
          'alpha',
          '01_Zebra',
          '01_Ärzte',
          '1_Ärzte',
          '01_02_folder',
          '01_2_folder',
          '1_2_folder',
          '000000',
          '00000',
          '00a folder set',
          '0a',
          '0000.folder set',
          '000.folder set',
          '00.folder set',
          '00..folder set',
          '0000-folder set',
          '000-folder set',
          '00-folder set',
          '0-folder set',
          '00--folder set',
          '0000_folder set',
          '000_folder set',
          '0000 my folder',
          '0000',
          '00_folder set',
          '00__folder set',
          '000 my folder',
          '0000 folder set',
          '000',
          '00 my folder',
          '00',
          '0.folder set',
          '0_folder set',
          '0 my folder',
          '000 folder set',
          '00 folder set',
          '0 folder set',
          '0'
        ])
      })
    })

    it('sorts by nested property paths (e.g., spaceQuota.total)', () => {
      getComposableWrapper(() => {
        interface SpaceItem extends Resource {
          spaceQuota: { total: number; remaining: number }
        }

        const input = {
          items: ref<SpaceItem[]>([
            {
              id: '1',
              name: 'Space C',
              path: '',
              webDavPath: '',
              spaceQuota: { total: 500, remaining: 200 }
            },
            {
              id: '2',
              name: 'Space A',
              path: '',
              webDavPath: '',
              spaceQuota: { total: 1000, remaining: 800 }
            },
            {
              id: '3',
              name: 'Space B',
              path: '',
              webDavPath: '',
              spaceQuota: { total: 100, remaining: 50 }
            }
          ]),
          fields: [
            {
              name: 'totalQuota',
              prop: 'spaceQuota.total',
              sortable: true
            }
          ],
          sortBy: ref('totalQuota'),
          sortDir: ref(SortDir.Desc)
        }

        const { items } = useSort<SpaceItem>(input)

        expect(unref(items).map((i) => i.name)).toEqual(['Space A', 'Space C', 'Space B'])
      })
    })

    it('sorts leading numeric prefixes before suffix text', () => {
      getComposableWrapper(() => {
        const input = {
          items: ref<Resource[]>([
            {
              id: '1',
              name: '0000_folder zeta',
              path: '',
              webDavPath: '',
              mdate: '1',
              type: 'folder'
            },
            {
              id: '2',
              name: '00_folder beta',
              path: '',
              webDavPath: '',
              mdate: '2',
              type: 'folder'
            },
            {
              id: '3',
              name: '00000 folder gamma',
              path: '',
              webDavPath: '',
              mdate: '3',
              type: 'folder'
            },
            {
              id: '4',
              name: '00_folder alpha',
              path: '',
              webDavPath: '',
              mdate: '4',
              type: 'folder'
            },
            {
              id: '5',
              name: '0000_folder alpha',
              path: '',
              webDavPath: '',
              mdate: '5',
              type: 'folder'
            }
          ]),
          fields: [{ name: 'name', sortable: true }],
          sortBy: ref('name'),
          sortDir: ref(SortDir.Asc)
        }

        const { items } = useSort<Resource>(input)

        expect(unref(items).map((i) => i.name)).toEqual([
          '00000 folder gamma',
          '00_folder alpha',
          '0000_folder alpha',
          '00_folder beta',
          '0000_folder zeta'
        ])
      })
    })
  })
})
