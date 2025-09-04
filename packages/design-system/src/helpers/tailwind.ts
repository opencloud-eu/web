import { JustifyContentType, SizeType } from './types'

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

export const getTailwindJustifyContentClass = (value: JustifyContentType) => {
  return {
    'justify-start': value === 'left',
    'justify-center': value === 'center',
    'justify-end': value === 'right',
    'justify-around': value === 'space-around',
    'justify-between': value === 'space-between',
    'justify-evenly': value === 'space-evenly'
  }
}

export const getTailwindPaddingClass = (value: SizeType | 'remove') => {
  return {
    'p-0': value === 'remove',
    'p-1': value === 'xsmall',
    'p-2': value === 'small',
    'p-4': value === 'medium',
    'p-6': value === 'large',
    'p-12': value === 'xlarge',
    'p-24': value === 'xxlarge'
  }
}
