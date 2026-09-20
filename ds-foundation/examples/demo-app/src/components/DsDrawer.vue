<template>
  <el-drawer
    class="ds-drawer"
    :class="[`ds-drawer--${placement}`, `ds-drawer--${size}`]"
    :visible="value"
    :title="title"
    :direction="elDirection"
    :size="elSize"
    :wrapper-closable="maskClosable"
    :close-on-press-escape="escClosable"
    :show-close="true"
    @close="onClose"
    @open="$emit('open')"
    @opened="$emit('opened')"
    @closed="$emit('closed')"
  >
    <div class="ds-drawer__body">
      <slot />
    </div>
    <div v-if="$slots.footer" class="ds-drawer__footer">
      <slot name="footer" />
    </div>
  </el-drawer>
</template>

<script>
/**
 * DsDrawer —— 基于 el-drawer 的二次封装
 * @displayName 抽屉 Drawer
 * placement(left/right/top/bottom) 映射为 el-drawer 的 direction，
 * 关闭统一通过 value(input) 双向绑定，业务不需要手写 :visible.sync。
 */
export default {
  name: 'DsDrawer',
  inheritAttrs: false,
  props: {
    value: { type: Boolean, default: false },
    title: { type: String, default: '' },
    placement: { type: String, default: 'right', validator: (v) => ['left', 'right', 'top', 'bottom'].includes(v) },
    size: { type: String, default: 'md', validator: (v) => ['sm', 'md', 'lg'].includes(v) },
    maskClosable: { type: Boolean, default: true },
    escClosable: { type: Boolean, default: true },
  },
  computed: {
    elDirection() {
      return { left: 'ltr', right: 'rtl', top: 'ttb', bottom: 'btt' }[this.placement] || 'rtl'
    },
    elSize() {
      return { sm: '32%', md: '46%', lg: '68%' }[this.size] || '46%'
    },
  },
  methods: {
    onClose() {
      this.$emit('input', false)
      this.$emit('close')
    },
  },
}
</script>

<style scoped>
.ds-drawer {
  position: fixed;
  inset: 0;
  z-index: var(--ds-z-drawer);
  display: flex;
  background: var(--ds-color-overlay);
}
.ds-drawer--right {
  justify-content: flex-end;
}
.ds-drawer--left {
  justify-content: flex-start;
}
.ds-drawer--top {
  flex-direction: column;
  justify-content: flex-start;
}
.ds-drawer--bottom {
  flex-direction: column;
  justify-content: flex-end;
}

.ds-drawer__panel {
  display: flex;
  flex-direction: column;
  background: var(--ds-color-bg-elevated);
  box-shadow: var(--ds-shadow-xl);
  max-height: 100%;
  max-width: 100%;
  outline: none;
}
.ds-drawer--left .ds-drawer__panel,
.ds-drawer--right .ds-drawer__panel {
  height: 100%;
}
.ds-drawer--top .ds-drawer__panel,
.ds-drawer--bottom .ds-drawer__panel {
  width: 100%;
}
.ds-drawer--bottom .ds-drawer__panel {
  border-radius: var(--ds-radius-xl) var(--ds-radius-xl) 0 0;
}
.ds-drawer--top .ds-drawer__panel {
  border-radius: 0 0 var(--ds-radius-xl) var(--ds-radius-xl);
}
.ds-drawer--left .ds-drawer__panel,
.ds-drawer--right .ds-drawer__panel {
  border: 1px solid var(--ds-color-border);
}

.ds-drawer__panel--sm {
  width: 300px;
}
.ds-drawer__panel--md {
  width: 420px;
}
.ds-drawer__panel--lg {
  width: 600px;
}
.ds-drawer--top .ds-drawer__panel--sm,
.ds-drawer--bottom .ds-drawer__panel--sm {
  height: 240px;
  width: 100%;
}
.ds-drawer--top .ds-drawer__panel--md,
.ds-drawer--bottom .ds-drawer__panel--md {
  height: 360px;
  width: 100%;
}
.ds-drawer--top .ds-drawer__panel--lg,
.ds-drawer--bottom .ds-drawer__panel--lg {
  height: 70vh;
  width: 100%;
}

.ds-drawer__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--ds-space-3);
  padding: var(--ds-space-4) var(--ds-space-5);
  border-bottom: 1px solid var(--ds-color-border-subtle);
  flex: none;
}
.ds-drawer__title {
  font-size: var(--ds-font-size-lg);
  font-weight: var(--ds-font-weight-semibold);
}
.ds-drawer__close {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border: 0;
  border-radius: var(--ds-radius-sm);
  background: transparent;
  color: var(--ds-color-fg-muted);
}
.ds-drawer__close:hover {
  background: var(--ds-color-bg-hover);
  color: var(--ds-color-fg);
}

.ds-drawer__body {
  flex: 1;
  overflow: auto;
  padding: var(--ds-space-5);
  font-size: var(--ds-font-size-sm);
  color: var(--ds-color-fg-muted);
  -webkit-overflow-scrolling: touch;
}
.ds-drawer__footer {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: var(--ds-space-2);
  padding: var(--ds-space-4) var(--ds-space-5);
  border-top: 1px solid var(--ds-color-border-subtle);
  flex: none;
}

@media (max-width: 767px) {
  .ds-drawer--left .ds-drawer__panel,
  .ds-drawer--right .ds-drawer__panel {
    width: min(88vw, 420px);
  }
  .ds-drawer__footer {
    flex-direction: column-reverse;
    align-items: stretch;
    padding-bottom: calc(var(--ds-space-4) + env(safe-area-inset-bottom));
  }
}

.ds-drawer-right-enter-active,
.ds-drawer-right-leave-active,
.ds-drawer-left-enter-active,
.ds-drawer-left-leave-active,
.ds-drawer-top-enter-active,
.ds-drawer-top-leave-active,
.ds-drawer-bottom-enter-active,
.ds-drawer-bottom-leave-active {
  transition: opacity var(--ds-motion-duration-base) var(--ds-motion-ease-standard);
}
.ds-drawer-right-enter-active .ds-drawer__panel,
.ds-drawer-right-leave-active .ds-drawer__panel,
.ds-drawer-left-enter-active .ds-drawer__panel,
.ds-drawer-left-leave-active .ds-drawer__panel,
.ds-drawer-top-enter-active .ds-drawer__panel,
.ds-drawer-top-leave-active .ds-drawer__panel,
.ds-drawer-bottom-enter-active .ds-drawer__panel,
.ds-drawer-bottom-leave-active .ds-drawer__panel {
  transition: transform var(--ds-motion-duration-base) var(--ds-motion-ease-out);
}

.ds-drawer-right-enter,
.ds-drawer-right-leave-to,
.ds-drawer-left-enter,
.ds-drawer-left-leave-to,
.ds-drawer-top-enter,
.ds-drawer-top-leave-to,
.ds-drawer-bottom-enter,
.ds-drawer-bottom-leave-to {
  opacity: 0;
}
.ds-drawer-right-enter .ds-drawer__panel,
.ds-drawer-right-leave-to .ds-drawer__panel {
  transform: translateX(100%);
}
.ds-drawer-left-enter .ds-drawer__panel,
.ds-drawer-left-leave-to .ds-drawer__panel {
  transform: translateX(-100%);
}
.ds-drawer-top-enter .ds-drawer__panel,
.ds-drawer-top-leave-to .ds-drawer__panel {
  transform: translateY(-100%);
}
.ds-drawer-bottom-enter .ds-drawer__panel,
.ds-drawer-bottom-leave-to .ds-drawer__panel {
  transform: translateY(100%);
}
</style>

<style scoped>
/* ================= Element 适配 ================= */
.ds-drawer ::v-deep .el-drawer__header {
  padding: var(--ds-space-4) var(--ds-space-5);
  margin-bottom: 0;
  border-bottom: 1px solid var(--ds-color-border-subtle);
}
.ds-drawer ::v-deep .el-drawer__body {
  padding: var(--ds-space-5);
  overflow: auto;
}
.ds-drawer__footer {
  padding: var(--ds-space-3) var(--ds-space-5) var(--ds-space-4);
  border-top: 1px solid var(--ds-color-border-subtle);
}
</style>
