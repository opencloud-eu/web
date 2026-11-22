import { textUtils } from '../../../src/helpers/textUtils'

describe('textUtils', () => {
  // textUtils compares two strings to provide a natural sort
  describe('naturalSortCompare', () => {
    it('sorts a list naturally', () => {
      const actual = ['Brian Murphy', 'Alice Hansen', 'grp1', 'grp11']

      actual.sort(textUtils.naturalSortCompare)

      expect(actual.join(',')).toBe('Alice Hansen,Brian Murphy,grp1,grp11')
    })
  })
})
