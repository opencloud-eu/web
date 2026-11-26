import { nextTick } from 'vue'
import { defaultPlugins, mount } from '@opencloud-eu/web-test-helpers'
import PdfDocumentProperties from '../../../src/components/PdfDocumentProperties.vue'

type Props = InstanceType<typeof PdfDocumentProperties>['$props']

function createWrapper(props: Partial<Props> = {}) {
  return mount(PdfDocumentProperties, {
    props: {
      fileName: 'a.pdf',
      properties: { pageCount: 1, isLinearized: false },
      ...props
    },
    global: { plugins: [...defaultPlugins()], stubs: { 'oc-icon': true } }
  })
}

function rows(properties: Partial<NonNullable<Props['properties']>>, fileSize?: number) {
  const wrapper = createWrapper({
    fileName: 'form.pdf',
    fileSize,
    properties: { pageCount: 2, isLinearized: false, ...properties }
  })
  const labels = wrapper.findAll('dt').map((dt) => dt.text())
  const values = wrapper.findAll('dd').map((dd) => dd.text())
  return Object.fromEntries(labels.map((label, i) => [label, values[i]]))
}

describe('PdfDocumentProperties', () => {
  it('shows the fields of the PDF.js viewer, a dash for missing ones', () => {
    const shown = rows(
      {
        title: 'W-9',
        pageSize: { width: 210, height: 297, unit: 'mm', isPortrait: true, name: 'A4' }
      },
      2048
    )
    expect(Object.keys(shown)).toEqual([
      'File name',
      'File size',
      'Title',
      'Author',
      'Subject',
      'Keywords',
      'Creation date',
      'Modification date',
      'Application',
      'PDF producer',
      'PDF version',
      'Page count',
      'Page size',
      'Fast web view'
    ])
    expect(shown['File name']).toBe('form.pdf')
    expect(shown['Title']).toBe('W-9')
    expect(shown['Author']).toBe('–')
    expect(shown['Page count']).toBe('2')
    expect(shown['Page size']).toBe('210 × 297 mm (A4, portrait)')
    expect(shown['Fast web view']).toBe('No')
  })

  it('groups the fields like the PDF.js viewer', () => {
    const wrapper = createWrapper()
    expect(wrapper.findAll('h3').map((title) => title.text())).toEqual([
      'File',
      'Description',
      'PDF'
    ])
  })

  it('shows the numbers of the page size in the language of the UI', async () => {
    const wrapper = createWrapper({
      properties: {
        pageCount: 1,
        isLinearized: false,
        pageSize: { width: 215.9, height: 279.4, unit: 'mm', isPortrait: true }
      }
    })
    wrapper.vm.$language.current = 'de'
    await nextTick()
    expect(wrapper.findAll('dd').at(-2).text()).toBe('215,9 × 279,4 mm (portrait)')
  })

  it('shows a loader until the document is loaded', () => {
    const wrapper = createWrapper({ properties: undefined })
    expect(wrapper.find('dl').exists()).toBe(false)
    expect(wrapper.findComponent({ name: 'OcLoader' }).exists()).toBe(true)
  })

  it('shows sizes without a standard name with the orientation only', () => {
    const shown = rows({ pageSize: { width: 300, height: 200, unit: 'mm', isPortrait: false } })
    expect(shown['Page size']).toBe('300 × 200 mm (landscape)')
    expect(shown['File size']).toBe('–')
  })
})
