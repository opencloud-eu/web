import { ref } from 'vue'
import { SortDir } from '@opencloud-eu/design-system/helpers'
import { withSortableColumns } from '../../../../src/helpers/ui/sortableColumns'

describe('withSortableColumns', () => {
  it('makes exactly the columns of the sort fields sortable, with their direction', () => {
    const columns = withSortableColumns(
      [
        { name: 'name', title: 'Name', sortable: false },
        { name: 'size', title: 'Size' },
        { name: 'mdate', title: 'Modified', sortDir: SortDir.Asc },
        { name: 'ddate', title: 'Deleted' },
        { name: 'actions', title: 'Actions', sortable: true }
      ],
      [
        { name: 'name', sortable: true, sortDir: SortDir.Asc },
        { name: 'name', sortable: true, sortDir: SortDir.Desc },
        { name: 'mdate', sortable: () => 1, sortDir: ref(SortDir.Desc) },
        { name: 'ddate', sortable: false, sortDir: SortDir.Desc }
      ]
    )
    expect(columns).toEqual([
      { name: 'name', title: 'Name', sortable: true, sortDir: SortDir.Asc },
      { name: 'size', title: 'Size', sortable: false },
      { name: 'mdate', title: 'Modified', sortable: true, sortDir: SortDir.Desc },
      { name: 'ddate', title: 'Deleted', sortable: false, sortDir: SortDir.Desc },
      { name: 'actions', title: 'Actions', sortable: false }
    ])
  })
})
