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
    },
    // lets the drop know which element it was opened for, e.g. to return focus there
    contextElement: event.target instanceof Element ? event.target : undefined
  } as unknown as HTMLButtonElement
}
