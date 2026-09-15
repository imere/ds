<template>
  <svg
    class="ds-icon"
    :class="[`ds-icon--${size}`, { 'ds-icon--spin': spin }]"
    viewBox="0 0 24 24"
    :width="pixel"
    :height="pixel"
    fill="none"
    stroke="currentColor"
    :stroke-width="strokeWidth"
    stroke-linecap="round"
    stroke-linejoin="round"
    aria-hidden="true"
    focusable="false"
  >
    <path v-for="(d, i) in paths" :key="i" :d="d" />
    <circle
      v-for="(c, i) in circles"
      :key="`c${i}`"
      :cx="c[0]"
      :cy="c[1]"
      :r="c[2]"
    />
  </svg>
</template>

<script>
/**
 * DsIcon —— 内置线性图标，零第三方依赖
 * 图标以 path 描述，统一 24×24 网格，跟随 currentColor 自动适配主题。
 */
const ICONS = {
  check: { d: ['M20 6 9 17l-5-5'] },
  close: { d: ['M18 6 6 18M6 6l12 12'] },
  chevronDown: { d: ['m6 9 6 6 6-6'] },
  chevronUp: { d: ['m18 15-6-6-6 6'] },
  chevronLeft: { d: ['m15 18-6-6 6-6'] },
  chevronRight: { d: ['m9 18 6-6-6-6'] },
  chevrons: { d: ['m7 15 5 5 5-5', 'm7 9 5-5 5 5'] },
  search: { d: ['M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16Z', 'M21 21l-4.35-4.35'] },
  plus: { d: ['M12 5v14M5 12h14'] },
  minus: { d: ['M5 12h14'] },
  info: { d: ['M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20Z', 'M12 16v-4', 'M12 8h.01'] },
  warning: {
    d: [
      'M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z',
      'M12 9v4',
      'M12 17h.01',
    ],
  },
  error: { d: ['M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20Z', 'M15 9l-6 6M9 9l6 6'] },
  success: { d: ['M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20Z', 'm9 12 2 2 4-4'] },
  user: { d: ['M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2', 'M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z'] },
  sliders: { d: ['M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3', 'M1 14h6M9 8h6M17 16h6'] },
  menu: { d: ['M3 12h18M3 6h18M3 18h18'] },
  sun: {
    d: [
      'M12 17a5 5 0 1 0 0-10 5 5 0 0 0 0 10Z',
      'M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42',
    ],
  },
  moon: { d: ['M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79Z'] },
  palette: {
    d: [
      'M12 2a10 10 0 1 0 0 20c1.1 0 2-.9 2-2v-1a2 2 0 0 1 2-2h2a4 4 0 0 0 4-4A10 10 0 0 0 12 2Z',
      'M7.5 11a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3Z',
      'M12.5 7a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3Z',
      'M17.5 9a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3Z',
    ],
  },
  external: { d: ['M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6', 'M15 3h6v6', 'M10 14 21 3'] },
  trash: {
    d: [
      'M3 6h18M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6',
      'M10 11v6M14 11v6',
      'M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2',
    ],
  },
  edit: {
    d: ['M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7', 'M18.5 2.5a2.12 2.12 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5Z'],
  },
  star: { d: ['m12 2 3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2Z'] },
  download: { d: ['M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4', 'M7 10l5 5 5-5', 'M12 15V3'] },
  filter: { d: ['M22 3H2l8 9.46V19l4 2v-8.54L22 3Z'] },
  arrowUp: { d: ['M12 19V5', 'M5 12l7-7 7 7'] },
  arrowDown: { d: ['M12 5v14', 'M19 12l-7 7-7-7'] },
  copy: { d: ['M20 9h-9a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h9a2 2 0 0 0 2-2v-9a2 2 0 0 0-2-2Z', 'M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1'] },
  refresh: { d: ['M23 4v6h-6', 'M1 20v-6h6', 'M3.51 9a9 9 0 0 1 14.85-3.36L23 10', 'M1 14l4.64 4.36A9 9 0 0 0 20.49 15'] },
  bell: { d: ['M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9', 'M13.73 21a2 2 0 0 1-3.46 0'] },
  home: { d: ['m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V9Z', 'M9 22V12h6v10'] },
  grid: { d: ['M3 3h7v7H3zM14 3h7v7h-7zM14 14h7v7h-7zM3 14h7v7H3z'] },
  layers: { d: ['m12 2 9 5-9 5-9-5 9-5Z', 'M3 12l9 5 9-5', 'M3 17l9 5 9-5'] },
  code: { d: ['m16 18 6-6-6-6', 'M8 6l-6 6 6 6'] },
  zap: { d: ['M13 2 3 14h9l-1 8 10-12h-9l1-8Z'] },
  eye: { d: ['M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8Z', 'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z'] },
  eyeOff: { d: ['M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94', 'M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19', 'm6.6 6.6 10.8 10.8', 'M9.88 9.88a3 3 0 1 0 4.24 4.24'] },
  calendar: { d: ['M8 2v4M16 2v4', 'M3 10h18', 'M5 4h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Z'] },
  mail: { d: ['M4 4h16a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Z', 'm22 4-10 7L2 4'] },
  loader: { d: ['M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83'] },
  monitor: { d: ['M3 3h18a1 1 0 0 1 1 1v11a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1Z', 'M8 21h8M12 17v4'] },
  smartphone: { d: ['M7 2h10a2 2 0 0 1 2 2v16a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2Z', 'M12 18h.01'] },
  tablet: { d: ['M5 2h14a2 2 0 0 1 2 2v16a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2Z', 'M12 18h.01'] },
  database: { d: ['M12 2c4.42 0 8 1.34 8 3s-3.58 3-8 3-8-1.34-8-3 3.58-3 8-3Z', 'M4 5v14c0 1.66 3.58 3 8 3s8-1.34 8-3V5', 'M4 12c0 1.66 3.58 3 8 3s8-1.34 8-3'] },
  inbox: { d: ['M22 12h-6l-2 3h-4l-2-3H2', 'M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11Z'] },
  lock: { d: ['M5 11h14a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2Z', 'M8 11V7a4 4 0 0 1 8 0v4'] },
  send: { d: ['m22 2-7 20-4-9-9-4 20-7Z'] },
}

const SIZES = { xs: 12, sm: 14, md: 16, lg: 20, xl: 24, '2xl': 32 }

export default {
  name: 'DsIcon',
  props: {
    name: { type: String, required: true },
    size: { type: String, default: 'md' },
    strokeWidth: { type: [Number, String], default: 2 },
    spin: { type: Boolean, default: false },
  },
  computed: {
    def() {
      return ICONS[this.name] || ICONS.info
    },
    paths() {
      return this.def.d || []
    },
    circles() {
      return this.def.circles || []
    },
    pixel() {
      return SIZES[this.size] || SIZES.md
    },
  },
}
</script>

<style scoped>
.ds-icon {
  display: inline-block;
  flex: none;
  vertical-align: middle;
}
.ds-icon--spin {
  animation: ds-icon-spin 1s linear infinite;
}
@keyframes ds-icon-spin {
  to {
    transform: rotate(360deg);
  }
}
@media (prefers-reduced-motion: reduce) {
  .ds-icon--spin {
    animation-duration: 2s;
  }
}
</style>

<style scoped>
.ds-icon {
  display: inline-block;
  flex: none;
  vertical-align: middle;
}
.ds-icon--spin {
  animation: ds-icon-spin 1s linear infinite;
}
@keyframes ds-icon-spin {
  to {
    transform: rotate(360deg);
  }
}
@media (prefers-reduced-motion: reduce) {
  .ds-icon--spin {
    animation-duration: 2s;
  }
}
</style>
