export default {
  name: 'InlineSvg',
  // declared as prop, otherwise the source code of the function gets rendered as attribute
  props: ['transformSource'],
  template: '<svg data-testid="inline-svg-stub" />'
}
