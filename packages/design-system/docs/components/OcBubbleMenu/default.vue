<template>
  <oc-bubble-menu>
    <oc-button appearance="raw" no-hover class="p-2" aria-label="Previous page">
      <oc-icon name="arrow-left-s" fill-type="line" size-class="size-4" />
    </oc-button>
    <oc-button appearance="raw" no-hover class="p-2" aria-label="Next page">
      <oc-icon name="arrow-right-s" fill-type="line" size-class="size-4" />
    </oc-button>
    <span class="mx-1 h-5 w-px bg-role-outline-variant" />
    <oc-button appearance="raw" no-hover class="p-2" aria-label="Decrease font size">
      <oc-icon name="subtract" fill-type="line" size-class="size-4" />
    </oc-button>
    <oc-button
      appearance="raw"
      no-hover
      class="px-2 text-sm font-medium"
      aria-label="Reset font size"
    >
      100%
    </oc-button>
    <oc-button appearance="raw" no-hover class="p-2" aria-label="Increase font size">
      <oc-icon name="add" fill-type="line" size-class="size-4" />
    </oc-button>
    <span class="mx-1 h-5 w-px bg-role-outline-variant" />
    <oc-button appearance="raw" no-hover class="p-2" aria-label="Search">
      <oc-icon name="search" fill-type="line" size-class="size-4" />
    </oc-button>
    <span class="mx-1 h-5 w-px bg-role-outline-variant" />
    <oc-button appearance="raw" no-hover class="p-2" aria-label="Toggle fullscreen">
      <oc-icon name="fullscreen" fill-type="line" size-class="size-4" />
    </oc-button>
  </oc-bubble-menu>
</template>
