import { getContainedSize, getRotatedFitScale, useRotatedFit } from '../../../src/composables'

const landscapeStage = { width: 1000, height: 600 }

function sizedElement<T extends HTMLElement>(
  element: T,
  size: { width: number; height: number },
  props = {}
): T {
  Object.defineProperties(element, {
    offsetWidth: { value: size.width },
    offsetHeight: { value: size.height },
    ...Object.fromEntries(Object.entries(props).map(([key, value]) => [key, { value }]))
  })
  return element
}

function stageWith(child: HTMLElement, size = landscapeStage) {
  const stage = document.createElement('div')
  Object.defineProperties(stage, {
    clientWidth: { value: size.width },
    clientHeight: { value: size.height }
  })
  stage.appendChild(child)
  return stage
}

describe('getRotatedFitScale', () => {
  it('fits a stage-bound image into the stage after a quarter turn', () => {
    const content = { width: 800, height: 600 }
    const scale = getRotatedFitScale(content, landscapeStage)

    // turned, its height is the width and the other way around
    expect(content.height * scale).toBeLessThanOrEqual(landscapeStage.width)
    // the side that bound it before still fills the stage
    expect(content.width * scale).toBeCloseTo(landscapeStage.height)
  })

  it('never enlarges an image that fits rotated', () => {
    expect(getRotatedFitScale({ width: 400, height: 300 }, landscapeStage)).toBe(1)
  })

  it('leaves an image without a size or stage as it is', () => {
    expect(getRotatedFitScale({ width: 0, height: 0 }, landscapeStage)).toBe(1)
    expect(getRotatedFitScale({ width: 800, height: 600 }, { width: 0, height: 0 })).toBe(1)
  })
})

describe('getContainedSize', () => {
  it('fits the natural aspect ratio into the box', () => {
    expect(getContainedSize({ width: 200, height: 150 }, { width: 1000, height: 600 })).toEqual({
      width: 800,
      height: 600
    })
  })

  it('falls back to the box without a natural size', () => {
    expect(getContainedSize({ width: 0, height: 0 }, { width: 1000, height: 600 })).toEqual({
      width: 1000,
      height: 600
    })
  })
})

describe('useRotatedFit', () => {
  it.each([90, -90, 270, -270])('fits the image after a quarter turn by %i°', (rotation) => {
    const img = sizedElement(document.createElement('img'), { width: 800, height: 600 })
    stageWith(img)

    const { getFitScale } = useRotatedFit({ element: img, isSvg: false })

    expect(getFitScale(rotation)).toBeCloseTo(600 / 800)
  })

  it.each([0, 180, -180])('leaves the image as it is at %i°', (rotation) => {
    const img = sizedElement(document.createElement('img'), { width: 800, height: 600 })
    stageWith(img)

    const { getFitScale } = useRotatedFit({ element: img, isSvg: false })

    expect(getFitScale(rotation)).toBe(1)
  })

  it('measures a raster image by its element', () => {
    const img = sizedElement(document.createElement('img'), { width: 800, height: 600 })
    stageWith(img)

    const { getFitScale } = useRotatedFit({ element: img, isSvg: false })

    expect(getFitScale(90)).toBeCloseTo(600 / 800)
  })

  it('measures an svg by its drawing contained in the stage-filling element', () => {
    // a viewBox-only svg of 4:3 reports its default natural size
    const img = sizedElement(document.createElement('img'), landscapeStage, {
      naturalWidth: 200,
      naturalHeight: 150
    })
    stageWith(img)

    const { getFitScale } = useRotatedFit({ element: img, isSvg: true })

    // the drawing is 800x600, not the 1000x600 element
    expect(getFitScale(90)).toBeCloseTo(600 / 800)
  })

  it('measures the still inside a wrapper around the center it turns around', () => {
    // a portrait stage on a phone: the wrapper fills it, its top padding of 16px moves the
    // 300x400 still 8px below the wrapper's center
    const portraitStage = { width: 300, height: 600 }
    const wrapper = sizedElement(document.createElement('div'), portraitStage)
    wrapper.appendChild(
      sizedElement(document.createElement('img'), { width: 300, height: 400 }, { offsetTop: 108 })
    )
    stageWith(wrapper, portraitStage)

    const { getFitScale } = useRotatedFit({ element: wrapper, isSvg: false })

    // turned, the still reaches 200 + 8px to one side of the center: 416px have to fit 300px
    expect(getFitScale(-90)).toBeCloseTo(300 / 416)
  })

  it('does not scale an element outside of a stage', () => {
    const img = sizedElement(document.createElement('img'), { width: 800, height: 600 })

    const { getFitScale } = useRotatedFit({ element: img, isSvg: false })

    expect(getFitScale(90)).toBe(1)
  })
})
