/**
 * 响应式断点（Vue 2.7 Composition API）
 * -------------------------------------------------------------
 * 全局只挂一个 resize 监听，所有调用方共享同一份响应式状态，
 * 避免每个组件各监听一次导致的性能问题。
 *
 * 用法（setup 中）：
 *   const bp = useBreakpoint()
 *   bp.isMobile.value  // Ref<boolean>
 *   bp.up('lg').value  // Ref<boolean>
 *
 * 用法（选项式 API）：
 *   mixins: [breakpointMixin]  // 之后可用 this.bp.name / this.bp.isMobile
 */
import Vue from 'vue'
import { computed, onMounted, onUnmounted } from 'vue'
import { breakpoints, breakpointOrder, currentBreakpoint } from '@/design/breakpoints'

export const bpState = Vue.observable({
  width: typeof window === 'undefined' ? 1280 : window.innerWidth,
  height: typeof window === 'undefined' ? 800 : window.innerHeight,
})

let refCount = 0
let onResize = null

function ensureListener() {
  if (typeof window === 'undefined') return () => {}
  refCount += 1
  if (!onResize) {
    onResize = () => {
      bpState.width = window.innerWidth
      bpState.height = window.innerHeight
    }
    window.addEventListener('resize', onResize, { passive: true })
    window.addEventListener('orientationchange', onResize)
  }
  return () => {
    refCount -= 1
    if (refCount <= 0 && onResize) {
      window.removeEventListener('resize', onResize)
      window.removeEventListener('orientationchange', onResize)
      onResize = null
      refCount = 0
    }
  }
}

export function useBreakpoint() {
  const dispose = ensureListener()

  onMounted(() => {
    if (typeof window !== 'undefined') {
      bpState.width = window.innerWidth
      bpState.height = window.innerHeight
    }
  })
  onUnmounted(dispose)

  const width = computed(() => bpState.width)
  const height = computed(() => bpState.height)
  const name = computed(() => currentBreakpoint(bpState.width))
  const index = computed(() => breakpointOrder.indexOf(name.value))

  const up = (key) => computed(() => bpState.width >= breakpoints[key])
  const down = (key) => computed(() => bpState.width < breakpoints[key])
  const between = (from, to) =>
    computed(() => bpState.width >= breakpoints[from] && bpState.width < breakpoints[to])

  const isXs = computed(() => name.value === 'xs')
  const isMobile = computed(() => bpState.width < breakpoints.md)
  const isTablet = computed(
    () => bpState.width >= breakpoints.md && bpState.width < breakpoints.lg,
  )
  const isDesktop = computed(() => bpState.width >= breakpoints.lg)
  const isTouch = computed(() => {
    if (typeof window === 'undefined') return false
    return (
      ('ontouchstart' in window || (window.navigator && window.navigator.maxTouchPoints > 0)) &&
      bpState.width < breakpoints.lg
    )
  })

  return {
    width,
    height,
    name,
    index,
    up,
    down,
    between,
    isXs,
    isMobile,
    isTablet,
    isDesktop,
    isTouch,
    breakpoints,
  }
}

/** 选项式 API 友好版：注入 this.bp */
export const breakpointMixin = {
  computed: {
    bp() {
      return {
        width: bpState.width,
        height: bpState.height,
        name: currentBreakpoint(bpState.width),
        isXs: bpState.width < breakpoints.sm,
        isMobile: bpState.width < breakpoints.md,
        isTablet: bpState.width >= breakpoints.md && bpState.width < breakpoints.lg,
        isDesktop: bpState.width >= breakpoints.lg,
      }
    },
  },
  mounted() {
    this.__bpDispose = ensureListener()
  },
  beforeDestroy() {
    if (this.__bpDispose) this.__bpDispose()
  },
}

export default useBreakpoint
