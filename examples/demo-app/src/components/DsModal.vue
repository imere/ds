<template>
  <el-dialog
    class="ds-modal"
    :class="[`ds-modal--${size}`, { 'ds-modal--flush': flush, 'ds-modal--fullscreen': fullscreen }]"
    :visible="value"
    :title="title"
    :width="elWidth"
    :fullscreen="fullscreen"
    :close-on-click-modal="maskClosable"
    :close-on-press-escape="escClosable"
    :show-close="closable"
    :center="centered"
    :modal-append-to-body="true"
    :append-to-body="true"
    :aria-label="ariaLabel || null"
    @close="onClose"
    @open="$emit('open')"
    @opened="$emit('opened')"
    @closed="$emit('closed')"
  >
    <div class="ds-modal__body">
      <slot />
    </div>

    <div v-if="$slots.footer" class="ds-modal__footer" slot="footer">
      <slot name="footer" />
    </div>
  </el-dialog>
</template>

<script>
import { bpState } from '@/composables/useBreakpoint'

/**
 * DsModal —— 基于 el-dialog 的二次封装
 * @displayName 模态框 Modal
 * 我们额外做了两件 Element 默认没有的事：
 *  · 小屏（<768px）自动全屏，避免弹窗在手机上被挤压
 *  · value/input 双向绑定收口，业务不用写 :visible.sync
 */
export default {
  name: 'DsModal',
  inheritAttrs: false,
  props: {
    value: { type: Boolean, default: false },
    title: { type: String, default: '' },
    ariaLabel: { type: String, default: '' },
    size: { type: String, default: 'md', validator: (v) => ['sm', 'md', 'lg', 'xl'].includes(v) },
    closable: { type: Boolean, default: true },
    maskClosable: { type: Boolean, default: true },
    escClosable: { type: Boolean, default: true },
    centered: { type: Boolean, default: true },
    flush: { type: Boolean, default: false },
    fullscreenOnMobile: { type: Boolean, default: true },
  },
  computed: {
    fullscreen() {
      return this.fullscreenOnMobile && bpState.width < 768
    },
    elWidth() {
      return { sm: '420px', md: '560px', lg: '760px', xl: '960px' }[this.size] || '560px'
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
.ds-modal {
  position: fixed;
  inset: 0;
  z-index: var(--ds-z-modal);
  display: flex;
  align-items: flex-end;
  justify-content: center;
  padding: 0;
  background: var(--ds-color-overlay);
  backdrop-filter: blur(2px);
}
.ds-modal--centered {
  align-items: center;
  padding: var(--ds-space-4);
}

.ds-modal__panel {
  display: flex;
  flex-direction: column;
  width: 100%;
  max-height: 92vh;
  background: var(--ds-color-bg-elevated);
  border: 1px solid var(--ds-color-border);
  border-radius: var(--ds-radius-xl) var(--ds-radius-xl) 0 0;
  box-shadow: var(--ds-shadow-xl);
  outline: none;
}
.ds-modal__panel--sm {
  max-width: 380px;
}
.ds-modal__panel--md {
  max-width: 520px;
}
.ds-modal__panel--lg {
  max-width: 720px;
}
.ds-modal__panel--xl {
  max-width: 960px;
}

.ds-modal__header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--ds-space-3);
  padding: var(--ds-space-5) var(--ds-space-5) var(--ds-space-3);
}
.ds-modal__title {
  font-size: var(--ds-font-size-xl);
  font-weight: var(--ds-font-weight-semibold);
}
.ds-modal__close {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex: none;
  width: 30px;
  height: 30px;
  border: 0;
  border-radius: var(--ds-radius-sm);
  background: transparent;
  color: var(--ds-color-fg-muted);
  transition: background-color var(--ds-motion-duration-fast) var(--ds-motion-ease-standard);
}
.ds-modal__close:hover {
  background: var(--ds-color-bg-hover);
  color: var(--ds-color-fg);
}

.ds-modal__body {
  flex: 1;
  overflow: auto;
  padding: 0 var(--ds-space-5) var(--ds-space-5);
  color: var(--ds-color-fg-muted);
  font-size: var(--ds-font-size-sm);
}
.ds-modal__body--flush {
  padding: 0;
}

.ds-modal__footer {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: var(--ds-space-2);
  padding: var(--ds-space-3) var(--ds-space-5) var(--ds-space-5);
}

/* 桌面端圆角完整 */
@media (min-width: 640px) {
  .ds-modal__panel {
    border-radius: var(--ds-radius-xl);
    max-height: 86vh;
  }
}

/* 移动端：贴底全屏抽屉式弹窗，footer 按钮竖排铺满 */
@media (max-width: 639px) {
  .ds-modal--fullscreen {
    padding: 0;
  }
  .ds-modal--fullscreen .ds-modal__panel {
    max-width: 100%;
    max-height: 94vh;
    border-radius: var(--ds-radius-xl) var(--ds-radius-xl) 0 0;
    border-bottom: 0;
  }
  .ds-modal--fullscreen .ds-modal__footer {
    flex-direction: column-reverse;
    align-items: stretch;
    padding: var(--ds-space-4) var(--ds-space-4) calc(var(--ds-space-4) + env(safe-area-inset-bottom));
    border-top: 1px solid var(--ds-color-border-subtle);
  }
  .ds-modal--fullscreen .ds-modal__header {
    padding: var(--ds-space-4);
  }
  .ds-modal--fullscreen .ds-modal__body {
    padding: 0 var(--ds-space-4) var(--ds-space-4);
  }
}

.ds-modal-enter-active,
.ds-modal-leave-active {
  transition: opacity var(--ds-motion-duration-base) var(--ds-motion-ease-standard);
}
.ds-modal-enter-active .ds-modal__panel,
.ds-modal-leave-active .ds-modal__panel {
  transition: transform var(--ds-motion-duration-base) var(--ds-motion-ease-out),
    opacity var(--ds-motion-duration-base) var(--ds-motion-ease-standard);
}
.ds-modal-enter,
.ds-modal-leave-to {
  opacity: 0;
}
.ds-modal-enter .ds-modal__panel,
.ds-modal-leave-to .ds-modal__panel {
  opacity: 0;
  transform: translateY(16px) scale(0.98);
}
</style>

<style scoped>
/* ================= Element 适配 ================= */
.ds-modal ::v-deep .el-dialog__header {
  padding: var(--ds-space-4) var(--ds-space-5);
  border-bottom: 1px solid var(--ds-color-border-subtle);
}
.ds-modal ::v-deep .el-dialog__body {
  padding: var(--ds-space-5);
}
.ds-modal ::v-deep .el-dialog__footer {
  padding: var(--ds-space-3) var(--ds-space-5) var(--ds-space-4);
  border-top: 1px solid var(--ds-color-border-subtle);
}
.ds-modal--flush ::v-deep .el-dialog__body {
  padding: 0;
}
</style>
