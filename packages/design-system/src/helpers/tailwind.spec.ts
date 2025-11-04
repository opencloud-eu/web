import { getTailwindPaddingClass } from './tailwind'
import { SizeType } from './types'

it.each<{ size: SizeType | 'remove'; class: string }>([
  { size: 'xsmall', class: 'p-1' },
  { size: 'small', class: 'p-2' },
  { size: 'medium', class: 'p-4' },
  { size: 'large', class: 'p-6' },
  { size: 'xlarge', class: 'p-12' },
  { size: 'xxlarge', class: 'p-24' },
  { size: 'remove', class: 'p-0' }
])('gets the correct tailwind padding class for a given size', ({ size, class: tailwindClass }) => {
  const tailwindClassObj = getTailwindPaddingClass(size) as Record<string, boolean>
  expect(tailwindClassObj[tailwindClass]).toBeTruthy()
})
