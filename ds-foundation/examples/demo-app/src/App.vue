<template>
  <div class="shell" :class="{ 'shell--scrolled': scrolled }">
    <a class="shell__skip" href="#ds-main">跳到主要内容</a>

    <!-- ============ 顶栏 ============ -->
    <header class="topbar">
      <div class="topbar__inner">
        <button
          type="button"
          class="topbar__menu ds-hide-desktop"
          aria-label="打开导航"
          @click="$store.dispatch('app/toggleSidebar')"
        >
          <DsIcon name="menu" size="md" />
        </button>

        <router-link to="/" class="brand" @click.native="$store.dispatch('app/closeSidebar')">
          <span class="brand__mark" aria-hidden="true">
            <DsIcon name="layers" size="md" />
          </span>
          <span class="brand__text">
            <strong>Aurora DS</strong>
            <small>Vue 2 设计系统</small>
          </span>
        </router-link>

        <div class="topbar__spacer" />

        <div class="topbar__bp ds-hide-below-desktop">
          <DsIcon :name="bpIcon" size="sm" />
          <span>{{ bpName }} · {{ bpWidth }}px</span>
        </div>

        <DsTooltip :content="isDark ? '切换为浅色' : '切换为深色'" placement="bottom">
          <DsButton
            variant="ghost"
            size="md"
            :icon="isDark ? 'sun' : 'moon'"
            icon-only
            :aria-label="isDark ? '切换为浅色主题' : '切换为深色主题'"
            @click="toggleMode"
          />
        </DsTooltip>

        <DsButton
          class="topbar__palette"
          variant="secondary"
          size="md"
          icon="palette"
          @click="themeDrawer = true"
        >
          <span class="ds-hide-mobile">主题</span>
        </DsButton>
      </div>
      <div v-if="$store.getters['app/isLoading']" class="topbar__progress" />
    </header>

    <!-- ============ 桌面侧边栏 ============ -->
    <aside class="sidebar ds-hide-below-desktop" aria-label="主导航">
      <nav class="sidebar__nav">
        <div v-for="group in navGroups" :key="group.title" class="sidebar__group">
          <p class="sidebar__group-title">{{ group.title }}</p>
          <router-link
            v-for="item in group.items"
            :key="item.to"
            class="sidebar__link"
            active-class="is-active"
            exact
            :to="item.to"
          >
            <DsIcon :name="item.icon" size="sm" />
            <span class="sidebar__link-text">
              <span class="sidebar__link-label">{{ item.label }}</span>
              <span class="sidebar__link-desc">{{ item.desc }}</span>
            </span>
          </router-link>
        </div>
      </nav>
    </aside>

    <!-- ============ 移动端抽屉导航 ============ -->
    <DsDrawer
      :value="$store.state.app.sidebarOpen"
      title="导航"
      placement="left"
      size="sm"
      @input="$store.commit('app/SET_SIDEBAR', $event)"
    >
      <nav class="drawer-nav">
        <div v-for="group in navGroups" :key="group.title" class="drawer-nav__group">
          <p class="drawer-nav__group-title">{{ group.title }}</p>
          <router-link
            v-for="item in group.items"
            :key="item.to"
            class="drawer-nav__link"
            active-class="is-active"
            exact
            :to="item.to"
            @click.native="$store.dispatch('app/closeSidebar')"
          >
            <DsIcon :name="item.icon" size="sm" />
            {{ item.label }}
          </router-link>
        </div>
      </nav>
    </DsDrawer>

    <!-- ============ 主内容 ============ -->
    <main id="ds-main" ref="main" class="content">
      <div class="content__inner">
        <transition name="page" mode="out-in">
          <router-view />
        </transition>
      </div>
      <footer class="footer">
        <span>Aurora DS · Vue 2.7 + Vite + Vitest + Vuex + VueRouter + Axios</span>
        <span class="footer__dot">·</span>
        <span>{{ new Date().getFullYear() }} 内部设计系统</span>
      </footer>
    </main>

    <!-- ============ 主题配置抽屉 ============ -->
    <DsDrawer :value="themeDrawer" title="主题与令牌" placement="right" size="sm" @input="themeDrawer = $event">
      <ThemeSwitcher />
    </DsDrawer>

    <DsToastHost position="top-right" />

    <transition name="fade">
      <button
        v-if="scrolled"
        type="button"
        class="to-top"
        aria-label="回到顶部"
        @click="scrollTop"
      >
        <DsIcon name="arrowUp" size="md" />
      </button>
    </transition>
  </div>
</template>

<script>
import DsIcon from '@/components/DsIcon.vue'
import DsButton from '@/components/DsButton.vue'
import DsDrawer from '@/components/DsDrawer.vue'
import DsTooltip from '@/components/DsTooltip.vue'
import DsToastHost from '@/components/DsToastHost.vue'
import ThemeSwitcher from '@/docs/components/ThemeSwitcher.vue'
import { navGroups } from '@/docs/nav'
import { bpState } from '@/composables/useBreakpoint'

export default {
  name: 'App',
  components: { DsIcon, DsButton, DsDrawer, DsTooltip, DsToastHost, ThemeSwitcher },
  data() {
    return { navGroups, themeDrawer: false, scrolled: false }
  },
  computed: {
    bpWidth() {
      return bpState.width
    },
    bpName() {
      return bpState.width >= 1280 ? 'xl' : bpState.width >= 1024 ? 'lg' : bpState.width >= 768 ? 'md' : bpState.width >= 640 ? 'sm' : 'xs'
    },
    bpIcon() {
      return bpState.width >= 1024 ? 'monitor' : bpState.width >= 768 ? 'tablet' : 'smartphone'
    },
    isDark() {
      // $ds.state 是响应式的（Vue.observable），主题一换这里就重算
      return this.$ds.state.mode === 'dark'
    },
  },
  mounted() {
    window.addEventListener('scroll', this.onScroll, { passive: true })
    this.onScroll()
  },
  beforeDestroy() {
    window.removeEventListener('scroll', this.onScroll)
  },
  methods: {
    onScroll() {
      this.scrolled = window.scrollY > 200
    },
    scrollTop() {
      window.scrollTo({ top: 0, behavior: 'smooth' })
    },
    toggleMode() {
      this.$ds.toggle()
    },
  },
}
</script>

<style scoped>
.shell {
  min-height: 100vh;
  background: var(--ds-color-bg);
}

.shell__skip {
  position: absolute;
  left: -9999px;
  top: 0;
  z-index: 100;
  padding: 8px 16px;
  background: var(--ds-color-brand);
  color: #fff;
  border-radius: 0 0 8px 0;
}
.shell__skip:focus {
  left: 0;
}

/* ---------------- 顶栏 ---------------- */
.topbar {
  position: sticky;
  top: 0;
  z-index: var(--ds-z-sticky);
  background: var(--ds-color-bg);
  background: color-mix(in srgb, var(--ds-color-bg) 82%, transparent);
  backdrop-filter: saturate(180%) blur(12px);
  border-bottom: 1px solid var(--ds-color-border);
}
.topbar__inner {
  display: flex;
  align-items: center;
  gap: var(--ds-space-2);
  height: var(--ds-size-topbar);
  max-width: 1560px;
  margin: 0 auto;
  padding: 0 var(--ds-space-4);
}
.topbar__spacer {
  flex: 1;
}

.topbar__menu {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  margin-left: -8px;
  border: 0;
  border-radius: var(--ds-radius-md);
  background: transparent;
  color: var(--ds-color-fg);
}
.topbar__menu:hover {
  background: var(--ds-color-bg-hover);
}

.brand {
  display: inline-flex;
  align-items: center;
  gap: var(--ds-space-2);
  text-decoration: none;
  color: var(--ds-color-fg);
}
.brand:hover {
  text-decoration: none;
}
.brand__mark {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border-radius: var(--ds-radius-md);
  background: linear-gradient(135deg, var(--ds-color-brand), var(--ds-color-brand-hover));
  color: #fff;
  flex: none;
}
.brand__text {
  display: flex;
  flex-direction: column;
  line-height: 1.15;
}
.brand__text strong {
  font-size: var(--ds-font-size-md);
  letter-spacing: -0.01em;
}
.brand__text small {
  font-size: 10px;
  color: var(--ds-color-fg-subtle);
}

.topbar__bp {
  display: inline-flex;
  align-items: center;
  gap: var(--ds-space-2);
  padding: 4px 10px;
  border: 1px solid var(--ds-color-border);
  border-radius: var(--ds-radius-full);
  font-size: var(--ds-font-size-2xs);
  color: var(--ds-color-fg-muted);
  font-variant-numeric: tabular-nums;
}

.topbar__progress {
  height: 2px;
  background: linear-gradient(90deg, transparent, var(--ds-color-brand), transparent);
  background-size: 40% 100%;
  animation: shell-progress 1.1s linear infinite;
}
@keyframes shell-progress {
  0% {
    background-position: -40% 0;
  }
  100% {
    background-position: 140% 0;
  }
}

/* ---------------- 侧边栏 ---------------- */
.sidebar {
  position: fixed;
  top: var(--ds-size-topbar);
  bottom: 0;
  left: 0;
  width: var(--ds-size-sidebar);
  padding: var(--ds-space-5) var(--ds-space-4);
  overflow-y: auto;
  border-right: 1px solid var(--ds-color-border);
  background: var(--ds-color-bg);
}
.sidebar__nav {
  display: flex;
  flex-direction: column;
  gap: var(--ds-space-6);
}
.sidebar__group-title {
  padding: 0 var(--ds-space-3);
  margin-bottom: var(--ds-space-2);
  font-size: 11px;
  font-weight: var(--ds-font-weight-semibold);
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--ds-color-fg-subtle);
}
.sidebar__link {
  display: flex;
  align-items: center;
  gap: var(--ds-space-3);
  padding: var(--ds-space-2) var(--ds-space-3);
  border-radius: var(--ds-radius-md);
  color: var(--ds-color-fg-muted);
  text-decoration: none;
  transition: background-color var(--ds-motion-duration-fast) var(--ds-motion-ease-standard),
    color var(--ds-motion-duration-fast) var(--ds-motion-ease-standard);
}
.sidebar__link:hover {
  background: var(--ds-color-bg-hover);
  color: var(--ds-color-fg);
  text-decoration: none;
}
.sidebar__link.is-active {
  background: var(--ds-color-brand-subtle);
  color: var(--ds-color-brand-fg);
}
.sidebar__link-text {
  display: flex;
  flex-direction: column;
  min-width: 0;
}
.sidebar__link-label {
  font-size: var(--ds-font-size-sm);
  font-weight: var(--ds-font-weight-medium);
}
.sidebar__link-desc {
  font-size: 11px;
  color: var(--ds-color-fg-subtle);
}

/* ---------------- 抽屉内导航 ---------------- */
.drawer-nav {
  display: flex;
  flex-direction: column;
  gap: var(--ds-space-5);
}
.drawer-nav__group-title {
  padding: 0 var(--ds-space-2);
  margin-bottom: var(--ds-space-2);
  font-size: 11px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--ds-color-fg-subtle);
}
.drawer-nav__link {
  display: flex;
  align-items: center;
  gap: var(--ds-space-3);
  padding: var(--ds-space-3);
  border-radius: var(--ds-radius-md);
  color: var(--ds-color-fg-muted);
  font-size: var(--ds-font-size-md);
  text-decoration: none;
}
.drawer-nav__link.is-active {
  background: var(--ds-color-brand-subtle);
  color: var(--ds-color-brand-fg);
}

/* ---------------- 内容区 ---------------- */
.content {
  padding: var(--ds-space-7) var(--ds-space-4) var(--ds-space-10);
}
.content__inner {
  max-width: var(--ds-size-content-max);
  margin: 0 auto;
}

.footer {
  display: flex;
  justify-content: center;
  gap: var(--ds-space-2);
  flex-wrap: wrap;
  max-width: var(--ds-size-content-max);
  margin: var(--ds-space-10) auto 0;
  padding-top: var(--ds-space-5);
  border-top: 1px solid var(--ds-color-border-subtle);
  font-size: var(--ds-font-size-xs);
  color: var(--ds-color-fg-subtle);
}

.to-top {
  position: fixed;
  right: var(--ds-space-5);
  bottom: var(--ds-space-5);
  z-index: var(--ds-z-sticky);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 42px;
  height: 42px;
  border: 1px solid var(--ds-color-border);
  border-radius: var(--ds-radius-full);
  background: var(--ds-color-bg-elevated);
  color: var(--ds-color-fg-muted);
  box-shadow: var(--ds-shadow-lg);
}
.to-top:hover {
  color: var(--ds-color-brand-fg);
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity var(--ds-motion-duration-base) var(--ds-motion-ease-standard);
}
.fade-enter,
.fade-leave-to {
  opacity: 0;
}

.page-enter-active,
.page-leave-active {
  transition: opacity var(--ds-motion-duration-base) var(--ds-motion-ease-standard),
    transform var(--ds-motion-duration-base) var(--ds-motion-ease-out);
}
.page-enter {
  opacity: 0;
  transform: translateY(8px);
}
.page-leave-to {
  opacity: 0;
  transform: translateY(-4px);
}

/* ---------------- 响应式 ---------------- */
@media (min-width: 1024px) {
  .content {
    margin-left: var(--ds-size-sidebar);
    padding: var(--ds-space-8) var(--ds-space-8) var(--ds-space-10);
  }
}
@media (max-width: 1023px) {
  .content {
    padding-top: var(--ds-space-6);
  }
}
@media (max-width: 639px) {
  .topbar__inner {
    padding: 0 var(--ds-space-3);
    gap: var(--ds-space-1);
  }
  .content {
    padding: var(--ds-space-5) var(--ds-space-4) var(--ds-space-9);
  }
  .to-top {
    right: var(--ds-space-4);
    bottom: calc(var(--ds-space-4) + env(safe-area-inset-bottom));
  }
}
</style>
