import { mount, PartialComponentProps } from '@opencloud-eu/web-test-helpers'
import OcInlineSvg from './OcInlineSvg.vue'

function parseSvg(markup: string) {
  return new DOMParser()
    .parseFromString(markup, 'text/xml')
    .getElementsByTagName('svg')[0] as unknown as SVGElement
}

const maliciousSvg =
  '<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 24 24" onload="alert(1)">' +
  '<script>alert(1)</script>' +
  '<image href="data:," onerror="alert(1)" />' +
  '<a xlink:href="javascript:alert(1)"><path d="M0 0h24v24H0z" /></a>' +
  '</svg>'

describe('OcInlineSvg', () => {
  it('passes the source, title and unique ids option to the inline svg', () => {
    const { wrapper } = getWrapper({ src: 'icons/folder.svg', title: 'Folder', uniqueIds: true })
    const inlineSvg = wrapper.findComponent({ name: 'inline-svg' })
    expect(inlineSvg.attributes('src')).toBe('icons/folder.svg')
    expect(inlineSvg.attributes('title')).toBe('Folder')
    expect(inlineSvg.attributes('unique-ids')).toBe('true')
  })

  it('sanitizes the svg before it gets inlined', () => {
    const { wrapper } = getWrapper()

    const svg = transformSource(wrapper)(parseSvg(maliciousSvg))

    expect(svg.hasAttribute('onload')).toBe(false)
    expect(svg.getAttribute('viewBox')).toBe('0 0 24 24')
    expect(svg.getElementsByTagName('script')).toHaveLength(0)
    expect(svg.querySelector('[onerror]')).toBeNull()
    expect(svg.innerHTML).not.toContain('javascript:')
    expect(svg.getElementsByTagName('path')).toHaveLength(1)
  })

  it('applies the transform source of the caller to the sanitized svg', () => {
    const callerTransform = vi.fn((svg: SVGElement) => {
      svg.setAttribute('data-transformed', 'true')
      return svg
    })
    const { wrapper } = getWrapper({ transformSource: callerTransform })

    const svg = transformSource(wrapper)(parseSvg(maliciousSvg))

    expect(callerTransform).toHaveBeenCalledTimes(1)
    const receivedSvg = callerTransform.mock.calls[0][0]
    expect(receivedSvg.hasAttribute('onload')).toBe(false)
    expect(receivedSvg.getElementsByTagName('script')).toHaveLength(0)
    expect(svg.getAttribute('data-transformed')).toBe('true')
  })

  it('passes attributes to the inline svg', () => {
    const { wrapper } = getWrapper({}, { class: 'size-5', 'aria-hidden': 'true' })
    const inlineSvg = wrapper.findComponent({ name: 'inline-svg' })
    expect(inlineSvg.classes()).toContain('size-5')
    expect(inlineSvg.attributes('aria-hidden')).toBe('true')
  })

  it('emits the events of the inline svg', async () => {
    const { wrapper } = getWrapper()
    const inlineSvg = wrapper.findComponent({ name: 'inline-svg' })
    const svg = parseSvg('<svg xmlns="http://www.w3.org/2000/svg" />')
    const error = new Error('not found')

    await inlineSvg.vm.$emit('loaded', svg)
    await inlineSvg.vm.$emit('unloaded')
    await inlineSvg.vm.$emit('error', error)

    expect(wrapper.emitted('loaded')).toEqual([[svg]])
    expect(wrapper.emitted('unloaded')).toHaveLength(1)
    expect(wrapper.emitted('error')).toEqual([[error]])
  })
})

function transformSource(wrapper: ReturnType<typeof getWrapper>['wrapper']) {
  const inlineSvg = wrapper.findComponent({ name: 'inline-svg' })
  return inlineSvg.props('transformSource') as (svg: SVGElement) => SVGElement
}

function getWrapper(
  props: PartialComponentProps<typeof OcInlineSvg> = {},
  attrs: Record<string, string> = {}
) {
  return {
    wrapper: mount(OcInlineSvg, {
      props: { src: 'icons/info.svg', ...props },
      attrs
    })
  }
}
