<template>
  <el-tabs
    class="ds-tabs"
    :class="[`ds-tabs--${variant}`, { 'ds-tabs--vertical': vertical }]"
    :value="value"
    :type="elType"
    :tab-position="vertical ? 'left' : 'top'"
    @input="onInput"
    @tab-click="onTabClick"
  >
    <el-tab-pane
      v-for="tab in normalizedTabs"
      :key="String(tab.value)"
      :label="tab.label"
      :name="tab.value"
      :disabled="tab.disabled"
      :lazy="!!tab.lazy"
    >
      <template slot="label">
        <slot name="label" :tab="tab">
          <DsIcon v-if="tab.icon" :name="tab.icon" size="sm" class="ds-tabs__icon" />
          <span>{{ tab.label }}</span>
          <el-badge v-if="tab.badge" :value="tab.badge" class="ds-tabs__badge" />
        </slot>
      </template>

      <!-- 面板内容优先取 `tab-<value>`，其次直接按 value 命名（文档站的写法） -->
      <slot :name="`tab-${tab.value}`" :tab="tab">
        <slot :name="String(tab.value)" :tab="tab" />
      </slot>
    </el-tab-pane>

    <slot name="extra" />
  </el-tabs>
</template>

<script>
import DsIcon from './DsIcon.vue'

/**
 * DsTabs —— 基于 el-tabs 的二次封装
 * @displayName 标签页 Tabs
 * 用 tabs 数组声明式生成 el-tab-pane，并支持按 value 命名的具名插槽。
 */
export default {
  name: 'DsTabs',
  components: { DsIcon },
  inheritAttrs: false,
  props: {
    value: { type: [String, Number], default: '' },
    tabs: { type: Array, default: () => [] },
    variant: { type: String, default: 'line', validator: (v) => ['line', 'pill', 'card'].includes(v) },
    vertical: { type: Boolean, default: false },
  },
  computed: {
    elType() {
      return { line: '', pill: 'card', card: 'border-card' }[this.variant] || ''
    },
    /**
     * tabs 允许三种写法：字符串数组、{ value }、{ name }。
     * 这里统一成 [{ value, label, ...}]，避免 value 缺失导致 :key 全是 'undefined'。
     */
    normalizedTabs() {
      return (this.tabs || []).map((tab, i) => {
        if (typeof tab === 'string') return { value: tab, label: tab }
        const raw = tab.value !== undefined && tab.value !== null ? tab.value : tab.name
        const value = raw !== undefined && raw !== null ? raw : `tab-${i}`
        return Object.assign({}, tab, { value, label: tab.label || String(value) })
      })
    },
  },
  methods: {
    onInput(v) {
      this.$emit('input', v)
      this.$emit('change', v)
    },
    onTabClick(tab) {
      this.$emit('tab-click', tab)
    },
  },
}
</script>

<style scoped>
.ds-tabs {
  display: flex;
  flex-direction: column;
  min-width: 0;
}
.ds-tabs--vertical {
  flex-direction: row;
  gap: var(--ds-space-5);
}

.ds-tabs__nav {
  position: relative;
  display: flex;
  gap: var(--ds-space-1);
  border-bottom: 1px solid var(--ds-color-border);
  overflow-x: auto;
  scrollbar-width: none;
  flex: none;
}
.ds-tabs__nav::-webkit-scrollbar {
  display: none;
}
.ds-tabs--vertical .ds-tabs__nav {
  flex-direction: column;
  border-bottom: 0;
  border-right: 1px solid var(--ds-color-border);
  overflow: visible;
}
.ds-tabs--pill .ds-tabs__nav,
.ds-tabs--card .ds-tabs__nav {
  border-bottom: 0;
  gap: var(--ds-space-2);
}

.ds-tabs__tab {
  position: relative;
  display: inline-flex;
  align-items: center;
  gap: var(--ds-space-2);
  padding: var(--ds-space-3) var(--ds-space-4);
  border: 0;
  background: transparent;
  color: var(--ds-color-fg-muted);
  font-size: var(--ds-font-size-sm);
  font-weight: var(--ds-font-weight-medium);
  white-space: nowrap;
  transition: color var(--ds-motion-duration-fast) var(--ds-motion-ease-standard),
    background-color var(--ds-motion-duration-fast) var(--ds-motion-ease-standard);
}
.ds-tabs__tab:hover:not(.is-disabled) {
  color: var(--ds-color-fg);
}
.ds-tabs__tab.is-active {
  color: var(--ds-color-brand-fg);
}
.ds-tabs__tab.is-disabled {
  opacity: 0.45;
  pointer-events: none;
}

.ds-tabs--pill .ds-tabs__tab {
  border-radius: var(--ds-radius-full);
  padding: var(--ds-space-2) var(--ds-space-4);
}
.ds-tabs--pill .ds-tabs__tab.is-active {
  background: var(--ds-color-brand-subtle);
}
.ds-tabs--card .ds-tabs__tab {
  border: 1px solid transparent;
  border-radius: var(--ds-radius-md) var(--ds-radius-md) 0 0;
}
.ds-tabs--card .ds-tabs__tab.is-active {
  background: var(--ds-color-bg-elevated);
  border-color: var(--ds-color-border);
  border-bottom-color: var(--ds-color-bg-elevated);
  margin-bottom: -1px;
}

.ds-tabs__badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 18px;
  height: 18px;
  padding: 0 5px;
  border-radius: var(--ds-radius-full);
  background: var(--ds-color-bg-inset);
  color: var(--ds-color-fg-muted);
  font-size: var(--ds-font-size-2xs);
}
.is-active .ds-tabs__badge {
  background: var(--ds-color-brand);
  color: var(--ds-color-fg-on-brand);
}

.ds-tabs__ink {
  position: absolute;
  bottom: -1px;
  left: 0;
  height: 2px;
  background: var(--ds-color-brand);
  border-radius: 2px;
  transition: transform var(--ds-motion-duration-base) var(--ds-motion-ease-out),
    width var(--ds-motion-duration-base) var(--ds-motion-ease-out);
}

.ds-tabs__panels {
  flex: 1;
  min-width: 0;
  padding-top: var(--ds-space-4);
}
.ds-tabs--card .ds-tabs__panels {
  background: var(--ds-color-bg-elevated);
  border: 1px solid var(--ds-color-border);
  border-radius: 0 var(--ds-radius-lg) var(--ds-radius-lg) var(--ds-radius-lg);
  padding: var(--ds-space-5);
  margin-top: -1px;
}
.ds-tabs--vertical .ds-tabs__panels {
  padding-top: 0;
}

@media (max-width: 767px) {
  .ds-tabs__tab {
    padding: var(--ds-space-3);
    font-size: var(--ds-font-size-md);
  }
  .ds-tabs--vertical {
    flex-direction: column;
    gap: var(--ds-space-3);
  }
  .ds-tabs--vertical .ds-tabs__nav {
    flex-direction: row;
    border-right: 0;
    border-bottom: 1px solid var(--ds-color-border);
    overflow-x: auto;
  }
}
</style>

<style scoped>
/* ================= Element 适配 ================= */
.ds-tabs ::v-deep .el-tabs__header {
  margin: 0 0 var(--ds-space-4);
}
.ds-tabs ::v-deep .el-tabs__item {
  font-size: var(--ds-font-size-sm);
}
.ds-tabs__icon {
  margin-right: var(--ds-space-1);
  vertical-align: -2px;
}
.ds-tabs--pill ::v-deep .el-tabs__item {
  border-radius: var(--ds-radius-full);
}
</style>
