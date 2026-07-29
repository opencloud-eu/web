import { defaultPlugins, mount, PartialComponentProps } from '@opencloud-eu/web-test-helpers'
import ResourceListItem from '../../../../src/components/FilesList/ResourceListItem.vue'
import { Resource } from '@opencloud-eu/web-client'
import { nextTick, reactive } from 'vue'

const fileResource = {
  name: 'forest.jpg',
  path: 'nature/forest.jpg',
  thumbnail: 'https://cdn.pixabay.com/photo/2015/09/09/16/05/forest-931706_960_720.jpg',
  type: 'file',
  isFolder: false,
  extension: 'jpg'
} as Resource
const folderResource = {
  name: 'Documents',
  path: '',
  type: 'folder',
  isFolder: true
} as Resource
const fileResourceWithoutParentFoldername = {
  name: 'example.pdf',
  path: 'example.pdf',
  type: 'file',
  isFolder: false,
  extension: 'pdf'
} as Resource

describe('OcResource', () => {
  it("doesn't emit a click if the resource is not clickable", () => {
    const wrapper = getWrapper({ resource: fileResource, isResourceClickable: false })

    wrapper.find('.oc-resource-name').trigger('click')
    expect(wrapper.emitted('click')).toBeFalsy()
  })

  it('emits a click for a file', async () => {
    const wrapper = getWrapper({ resource: fileResource })

    await wrapper.find('.oc-resource-name').trigger('click')
    expect(wrapper.emitted('click')).toHaveLength(1)
  })

  it('emits a click for a folder', () => {
    const wrapper = getWrapper({ resource: folderResource })

    wrapper.find('.oc-resource-name').trigger('click')
    expect(wrapper.emitted('click')).toBeTruthy()
  })

  it('parent folder component type is link if parent folder given', () => {
    const wrapper = getWrapper({
      resource: fileResource,
      isPathDisplayed: true,
      parentFolderLink: {}
    })

    expect(wrapper.find('.parent-folder').exists()).toBeTruthy()
    expect(wrapper.find('.parent-folder').attributes('class')).toContain('cursor-pointer')
  })

  it('parent folder component type is span if parent folder not given', () => {
    const wrapper = getWrapper({ resource: fileResource, isPathDisplayed: true })

    expect(wrapper.find('.parent-folder').find('a').exists()).toBeFalsy()
    expect(wrapper.find('.parent-folder').attributes('class')).toContain('cursor-default')
  })

  it('displays parent folder name default if calculated name is empty', () => {
    const wrapper = getWrapper({
      resource: fileResourceWithoutParentFoldername,
      isPathDisplayed: true,
      parentFolderName: 'Example parent folder name'
    })

    expect(wrapper.html()).toMatchSnapshot()
  })

  it('displays the thumbnail as soon as it gets added to the resource', async () => {
    const resource = reactive({ ...fileResourceWithoutParentFoldername }) as Resource
    const wrapper = getWrapper({ resource })

    expect(wrapper.find('[data-test-thumbnail-resource-name]').exists()).toBeFalsy()

    resource.thumbnail = 'blob:thumbnail'
    await nextTick()

    expect(wrapper.find('[data-test-thumbnail-resource-name]').attributes('src')).toBe(
      'blob:thumbnail'
    )
  })

  it('can be used without icon/thumbnail', () => {
    const wrapper = getWrapper({
      resource: fileResourceWithoutParentFoldername,
      isIconDisplayed: false,
      parentFolderName: 'Example parent folder name'
    })

    expect(wrapper.find('oc-resource-thumbnail').exists()).toBeFalsy()
    expect(wrapper.find('oc-resource-icon').exists()).toBeFalsy()
  })

  function getWrapper(
    props: PartialComponentProps<typeof ResourceListItem> & { resource: Resource }
  ) {
    return mount(ResourceListItem, {
      props,
      global: {
        stubs: { RouterLink: true },
        renderStubDefaultSlot: true,
        plugins: [...defaultPlugins()]
      }
    })
  }
})
