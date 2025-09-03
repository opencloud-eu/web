import { SizeType } from './types'

export const getTailwindGapClass = (gapSize: SizeType | 'none') => {
  return {
    'gap-0': gapSize === 'none',
    'gap-0.5': gapSize === 'xsmall',
    'gap-1': gapSize === 'small',
    'gap-2': gapSize === 'medium',
    'gap-4': gapSize === 'large',
    'gap-5': gapSize === 'xlarge',
    'gap-6': gapSize === 'xxlarge',
    'gap-7': gapSize === 'xxxlarge'
  }
}
