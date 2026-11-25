export abstract class PaginationConstants {
  static readonly perPageDefault: string = '100'
  static readonly options = ['20', '50', '100', '250', '500']
  static readonly infiniteScrollStorageKey: string = 'oc-options_files-infinite-scroll'
  /**
   * Amount of items the list grows by per step in infinite scroll mode.
   * (Equals the default amount of items per page.)
   */
  static readonly infiniteScrollChunk: number = Number(PaginationConstants.perPageDefault)
}
