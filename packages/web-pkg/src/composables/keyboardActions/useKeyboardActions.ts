import { useEventListener } from '@vueuse/core'
import { Ref, ref, unref } from 'vue'
import { v4 as uuidV4 } from 'uuid'

interface KeyboardActionsOptions {
  skipDisabledKeyBindingsCheck?: boolean
}

export enum Key {
  C = 'c',
  V = 'v',
  X = 'x',
  A = 'a',
  S = 's',
  Z = 'z',
  Plus = '+',
  Minus = '-',
  Space = ' ',
  ArrowUp = 'ArrowUp',
  ArrowDown = 'ArrowDown',
  ArrowLeft = 'ArrowLeft',
  ArrowRight = 'ArrowRight',
  Esc = 'Escape',
  Backspace = 'Backspace',
  Delete = 'Delete'
}

export enum Modifier {
  Ctrl = 'Control',
  Shift = 'Shift'
}

export interface KeyboardActions {
  actions: Ref<Array<KeyboardAction>>
  selectionCursor: Ref<number>
  removeKeyAction: (id: string) => void
  resetSelectionCursor: () => void
  bindKeyAction: (
    keys: { primary: Key; modifier?: Modifier },
    callback: (event: KeyboardEvent) => void,
    options?: { preventDefault?: boolean }
  ) => string
}

export interface KeyboardAction {
  id: string
  primary: Key
  modifier: Modifier | null
  preventDefault: boolean
  callback: (event: KeyboardEvent) => void
}

const areCustomKeyBindingsDisabled = () => {
  const activeElementTag = document.activeElement.tagName
  const type = document.activeElement.getAttribute('type')
  if (
    ['textarea', 'input', 'select'].includes(activeElementTag.toLowerCase()) &&
    type !== 'checkbox'
  ) {
    return true
  }
  const closestSelectionEl = document.activeElement
  if (!closestSelectionEl) {
    return false
  }
  let customKeyBindings: Element
  try {
    customKeyBindings = closestSelectionEl?.closest("[data-custom-key-bindings-disabled='true']")
  } catch {
    customKeyBindings = closestSelectionEl?.parentElement.closest(
      "[data-custom-key-bindings-disabled='true']"
    )
  }
  if (customKeyBindings) {
    return true
  }

  const isTextSelected = window.getSelection().type === 'Range'
  return isTextSelected
}

export const useKeyboardActions = (options?: KeyboardActionsOptions): KeyboardActions => {
  const actions = ref<Array<KeyboardAction>>([])
  const selectionCursor = ref(0)

  const listener = (event: KeyboardEvent): void => {
    if (!options?.skipDisabledKeyBindingsCheck && areCustomKeyBindingsDisabled()) {
      return
    }

    type ModifierKey = 'altKey' | 'ctrlKey' | 'metaKey' | 'shiftKey'

    const { key, ctrlKey, metaKey, shiftKey } = event
    let modifier = null
    const disallowedModifierKeys: ModifierKey[] = []

    if (metaKey || ctrlKey) {
      modifier = Modifier.Ctrl
      disallowedModifierKeys.push('altKey', 'shiftKey')
    } else if (shiftKey) {
      modifier = Modifier.Shift
      disallowedModifierKeys.push('altKey', 'ctrlKey', 'metaKey')
    }

    const hasDisallowedModifier = (event: KeyboardEvent, disallowedModifierKeys: ModifierKey[]) =>
      disallowedModifierKeys.some((key) => event[key])

    if (hasDisallowedModifier(event, disallowedModifierKeys)) {
      return
    }

    unref(actions)
      .filter((action) => {
        return action.primary === key && action.modifier === modifier
      })
      .forEach((action) => {
        if (action.preventDefault) {
          event.preventDefault()
        }
        action.callback(event)
      })
  }
  const bindKeyAction = (
    keys: { primary: Key; modifier?: Modifier },
    callback: (event: KeyboardEvent) => void,
    { preventDefault = true }: { preventDefault?: boolean } = {}
  ): string => {
    const id = uuidV4()
    actions.value.push({
      id,
      ...keys,
      modifier: keys.modifier ?? null,
      preventDefault,
      callback
    })
    return id
  }

  const removeKeyAction = (id: string): void => {
    actions.value = actions.value.filter((action) => action.id !== id)
  }

  const resetSelectionCursor = (): void => {
    selectionCursor.value = 0
  }

  useEventListener(document, 'keydown', listener)

  return {
    actions,
    bindKeyAction,
    removeKeyAction,
    selectionCursor,
    resetSelectionCursor
  }
}
