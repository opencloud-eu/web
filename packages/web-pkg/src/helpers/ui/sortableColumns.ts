import { unref } from 'vue'
import { FieldType } from '@opencloud-eu/design-system/helpers'
import { SortField } from '../../composables/sort'

/**
 * Makes exactly the table columns sortable that the list can be sorted by, with the sort direction
 * of their sort field, so the columns and the sort fields can't drift apart.
 */
export function withSortableColumns(columns: FieldType[], sortFields: SortField[]): FieldType[] {
  return columns.map((column) => {
    const sortField = sortFields.find(({ name }) => name === column.name)
    if (!sortField) {
      return { ...column, sortable: false }
    }
    return { ...column, sortable: !!unref(sortField.sortable), sortDir: unref(sortField.sortDir) }
  })
}
