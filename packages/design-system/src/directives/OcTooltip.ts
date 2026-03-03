import { computePosition, offset, flip, shift, arrow } from '@floating-ui/dom'
import { DirectiveBinding } from 'vue'

interface TooltipData {
  tooltipEl: HTMLElement | null
  showHandler: () => void
  hideHandler: () => void
  clickHandler: () => void
  escapeHandler: (e: KeyboardEvent) => void
}

const tooltipMap = new WeakMap<HTMLElement, TooltipData>()

const showTooltip = async (el: HTMLElement, content: string) => {
  const data = tooltipMap.get(el)
  if (!data || data.tooltipEl) {
    return
  }

  const tooltipEl = document.createElement('div')
  tooltipEl.setAttribute('role', 'tooltip')
  tooltipEl.textContent = content

  const arrowEl = document.createElement('div')
  arrowEl.classList.add('arrow')
  tooltipEl.appendChild(arrowEl)

  document.body.appendChild(tooltipEl)
  data.tooltipEl = tooltipEl

  const { x, y, placement, middlewareData } = await computePosition(el, tooltipEl, {
    placement: 'top',
    middleware: [offset(8), flip(), shift({ padding: 5 }), arrow({ element: arrowEl })]
  })

  // set tooltip position
  Object.assign(tooltipEl.style, {
    left: `${x}px`,
    top: `${y}px`
  })

  if (middlewareData.arrow) {
    // set arrow position
    const { x: arrowX, y: arrowY } = middlewareData.arrow
    const side = placement.split('-')[0]

    const staticSide: Record<string, string> = {
      top: 'bottom',
      right: 'left',
      bottom: 'top',
      left: 'right'
    }

    Object.assign(arrowEl.style, {
      left: arrowX != null ? `${arrowX}px` : '',
      top: arrowY != null ? `${arrowY}px` : '',
      [staticSide[side]]: '-4px'
    })
  }
}

const hideTooltip = (el: HTMLElement) => {
  const data = tooltipMap.get(el)
  if (!data || !data.tooltipEl) {
    return
  }

  data.tooltipEl.remove()
  data.tooltipEl = null
}

const destroy = (el: HTMLElement) => {
  const data = tooltipMap.get(el)
  if (!data) {
    return
  }

  hideTooltip(el)

  el.removeEventListener('mouseenter', data.showHandler)
  el.removeEventListener('focus', data.showHandler)
  el.removeEventListener('mouseleave', data.hideHandler)
  el.removeEventListener('blur', data.hideHandler)
  el.removeEventListener('click', data.clickHandler)
  document.removeEventListener('keydown', data.escapeHandler)

  tooltipMap.delete(el)
}

const initOrUpdate = (el: HTMLElement, { value }: DirectiveBinding) => {
  if (!value || value === '') {
    destroy(el)
    return
  }

  const existingTooltip = tooltipMap.get(el)
  if (existingTooltip && existingTooltip.tooltipEl) {
    const contentEl = existingTooltip.tooltipEl
    if (contentEl) {
      contentEl.textContent = value
    }
    return
  }

  const showHandler = () => showTooltip(el, value)
  const hideHandler = () => hideTooltip(el)
  const clickHandler = () => hideTooltip(el)
  const escapeHandler = (e: KeyboardEvent) => {
    if (e.code === 'Escape') {
      hideTooltip(el)
    }
  }

  tooltipMap.set(el, {
    tooltipEl: null,
    showHandler,
    hideHandler,
    clickHandler,
    escapeHandler
  })

  el.addEventListener('mouseenter', showHandler)
  el.addEventListener('mouseleave', hideHandler)
  el.addEventListener('focus', showHandler)
  el.addEventListener('blur', hideHandler)
  el.addEventListener('click', clickHandler)
  document.addEventListener('keydown', escapeHandler)
}

export default {
  name: 'OcTooltip',
  beforeMount: initOrUpdate,
  updated: initOrUpdate,
  unmounted: destroy
}
