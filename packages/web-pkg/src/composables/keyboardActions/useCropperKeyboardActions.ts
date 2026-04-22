import { Ref, unref } from 'vue'
import { Key, useKeyboardActions } from './useKeyboardActions'
import type { CropperSelection, CropperImage } from 'cropperjs'

export const useCropperKeyboardActions = () => {
  const keyboardActions = useKeyboardActions({ skipDisabledKeyBindingsCheck: true })
  const moveStep = 10
  const zoomStep = 0.1

  const moveWithEdgeSnap = (cropper: CropperSelection, deltaX: number, deltaY: number) => {
    const canvas = cropper.parentElement
    if (!canvas) {
      return
    }

    const canvasRect = canvas.getBoundingClientRect()
    let newX = cropper.x + deltaX
    let newY = cropper.y + deltaY

    const minX = 0
    const minY = 0
    const maxX = canvasRect.width - cropper.width
    const maxY = canvasRect.height - cropper.height

    const snapThreshold = moveStep
    if (Math.abs(newX - minX) < snapThreshold && deltaX < 0) {
      newX = minX
    }
    if (Math.abs(newX - maxX) < snapThreshold && deltaX > 0) {
      newX = maxX
    }
    if (Math.abs(newY - minY) < snapThreshold && deltaY < 0) {
      newY = minY
    }
    if (Math.abs(newY - maxY) < snapThreshold && deltaY > 0) {
      newY = maxY
    }

    cropper.$moveTo(newX, newY)
  }

  const setCropperInstance = (cropper: Ref<CropperSelection>, image?: Ref<CropperImage | null>) => {
    const isCropperFocused = (instance: CropperSelection) => {
      return document.activeElement === instance
    }

    keyboardActions.bindKeyAction({ primary: Key.ArrowRight }, () => {
      const instance = unref(cropper)
      if (instance && isCropperFocused(instance)) {
        moveWithEdgeSnap(instance, moveStep, 0)
      }
    })
    keyboardActions.bindKeyAction({ primary: Key.ArrowLeft }, () => {
      const instance = unref(cropper)
      if (instance && isCropperFocused(instance)) {
        moveWithEdgeSnap(instance, -moveStep, 0)
      }
    })
    keyboardActions.bindKeyAction({ primary: Key.ArrowDown }, () => {
      const instance = unref(cropper)
      if (instance && isCropperFocused(instance)) {
        moveWithEdgeSnap(instance, 0, moveStep)
      }
    })
    keyboardActions.bindKeyAction({ primary: Key.ArrowUp }, () => {
      const instance = unref(cropper)
      if (instance && isCropperFocused(instance)) {
        moveWithEdgeSnap(instance, 0, -moveStep)
      }
    })

    keyboardActions.bindKeyAction({ primary: Key.Plus }, () => {
      const instance = unref(cropper)
      if (instance && isCropperFocused(instance)) {
        const imageInstance = image ? unref(image) : null
        if (imageInstance) {
          imageInstance.$scale(1 + zoomStep)
        }
      }
    })
    keyboardActions.bindKeyAction({ primary: Key.Minus }, () => {
      const instance = unref(cropper)
      if (instance && isCropperFocused(instance)) {
        const imageInstance = image ? unref(image) : null
        if (imageInstance) {
          imageInstance.$scale(1 - zoomStep)
        }
      }
    })
  }

  return {
    setCropperInstance
  }
}
