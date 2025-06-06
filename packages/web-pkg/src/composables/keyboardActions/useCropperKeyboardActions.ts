import { Ref, unref } from 'vue'
import { Key, useKeyboardActions } from './useKeyboardActions'

export const useCropperKeyboardActions = () => {
  const keyboardActions = useKeyboardActions()
  const moveStep = 10
  const zoomStep = 0.1

  const setCropperInstance = (cropper: Ref<Cropper>) => {
    keyboardActions.bindKeyAction({ primary: Key.ArrowRight }, () =>
      unref(cropper)?.move(-moveStep, 0)
    )
    keyboardActions.bindKeyAction({ primary: Key.ArrowLeft }, () =>
      unref(cropper)?.move(moveStep, 0)
    )
    keyboardActions.bindKeyAction({ primary: Key.ArrowDown }, () =>
      unref(cropper)?.move(0, -moveStep)
    )
    keyboardActions.bindKeyAction({ primary: Key.ArrowUp }, () => unref(cropper)?.move(0, moveStep))

    keyboardActions.bindKeyAction({ primary: Key.Plus }, () => unref(cropper)?.zoom(zoomStep))
    keyboardActions.bindKeyAction({ primary: Key.Minus }, () => unref(cropper)?.zoom(-zoomStep))
  }

  return {
    setCropperInstance
  }
}
