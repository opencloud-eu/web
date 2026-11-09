import { MaybeRefOrGetter, toValue } from 'vue'

export interface Size {
  width: number
  height: number
}

// the size of an image drawn into a box with object-fit: contain
export function getContainedSize(natural: Size, box: Size): Size {
  if (!natural.width || !natural.height || !box.width || !box.height) {
    return box
  }

  const scale = Math.min(box.width / natural.width, box.height / natural.height)
  return { width: natural.width * scale, height: natural.height * scale }
}

// the extra scale that makes the content fit the stage again after a quarter turn, where its
// width and height swap. It only shrinks, the content fits the stage unrotated.
export function getRotatedFitScale(content: Size, stage: Size): number {
  if (!content.width || !content.height || !stage.width || !stage.height) {
    return 1
  }

  return Math.min(1, stage.width / content.height, stage.height / content.width)
}

/**
 * Fits a rotated image into the stage, which is the parent of the given element.
 * The element can be the image itself or a wrapper around it. An svg image fills
 * its element, its drawing is contained in it.
 */
export const useRotatedFit = ({
  element,
  isSvg
}: {
  element: MaybeRefOrGetter<HTMLElement>
  isSvg: MaybeRefOrGetter<boolean>
}) => {
  function getContentSize(): Size {
    const el = toValue(element)
    const image = el instanceof HTMLImageElement ? el : el.querySelector('img')

    if (image !== el) {
      // the wrapper turns around its center, the still may sit off it (padding): its extent
      // around the center has to fit
      const offsetY = Math.abs(image.offsetTop + image.offsetHeight / 2 - el.offsetHeight / 2)
      return { width: image.offsetWidth, height: image.offsetHeight + 2 * offsetY }
    }

    const box = { width: image.offsetWidth, height: image.offsetHeight }
    if (!toValue(isSvg)) {
      return box
    }

    return getContainedSize({ width: image.naturalWidth, height: image.naturalHeight }, box)
  }

  function getFitScale(rotation: number) {
    if (rotation % 180 === 0) {
      return 1
    }

    const stage = toValue(element)?.parentElement
    if (!stage) {
      return 1
    }

    return getRotatedFitScale(getContentSize(), {
      width: stage.clientWidth,
      height: stage.clientHeight
    })
  }

  return { getFitScale }
}
