<template>
  <portal-target name="app.runtime.bottom.drawer" />

  <oc-button id="toggle-bottom-drawer-portal">Open bottom drawer</oc-button>
  <oc-bottom-drawer
    drawer-id="example-bottom-drawer"
    toggle="#toggle-bottom-drawer-portal"
    title="Example Bottom Drawer"
    use-portal
  >
    Some content in the bottom drawer.
  </oc-bottom-drawer>
</template>
