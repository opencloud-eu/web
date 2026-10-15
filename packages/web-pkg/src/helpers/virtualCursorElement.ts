export const createVirtualCursorElement = (event: MouseEvent) => {
  return {
    getBoundingClientRect() {
      return {
        width: 0,
        height: 0,
        x: event.clientX,
        y: event.clientY,
        top: event.clientY,
        left: event.clientX,
        right: event.clientX,
        bottom: event.clientY
      }
    }
  } as HTMLButtonElement
}
