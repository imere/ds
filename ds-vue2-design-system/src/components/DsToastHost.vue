<template>
  <div class="ds-toast-host" :class="`ds-toast-host--${position}`" role="region" aria-live="polite">
    <transition-group name="ds-toast" tag="div" class="ds-toast-host__list">
      <el-alert
        v-for="item in items"
        :key="item.id"
        class="ds-toast"
        :class="`ds-toast--${item.tone}`"
        :title="item.title || item.message"
        :type="elType(item.tone)"
        effect="light"
        :closable="item.closable"
        :show-icon="true"
        @close="dismiss(item.id)"
      >
        <p v-if="item.title && item.message" class="ds-toast__message">{{ item.message }}</p>
      </el-alert>
    </transition-group>
  </div>
</template>

<script>
import { toastState, dismiss } from './toast'

/**
 * DsToastHost —— 轻提示容器
 * @displayName 轻提示 Toast
 * toast.js 负责状态（纯 JS 调用），这里只负责渲染；
 * 每条提示用 el-alert 呈现，主题与 Element 保持一致。
 */
export default {
  name: 'DsToastHost',
  inheritAttrs: false,
  props: {
    position: {
      type: String,
      default: 'top-right',
      validator: (v) =>
        ['top-right', 'top-left', 'top-center', 'bottom-right', 'bottom-left', 'bottom-center'].includes(v),
    },
  },
  computed: {
    items() {
      return toastState.items
    },
  },
  methods: {
    dismiss,
    elType(tone) {
      return { danger: 'error' }[tone] || tone
    },
  },
}
</script>

<style scoped>
.ds-toast-host {
  position: fixed;
  z-index: var(--ds-z-toast);
  pointer-events: none;
  padding: var(--ds-space-4);
}
.ds-toast-host__list {
  display: flex;
  flex-direction: column;
  gap: var(--ds-space-2);
}

.ds-toast-host--top-right {
  top: 0;
  right: 0;
  align-items: flex-end;
}
.ds-toast-host--top-left {
  top: 0;
  left: 0;
  align-items: flex-start;
}
.ds-toast-host--top-center {
  top: 0;
  left: 50%;
  transform: translateX(-50%);
  align-items: center;
}
.ds-toast-host--bottom-right {
  bottom: 0;
  right: 0;
  align-items: flex-end;
}
.ds-toast-host--bottom-left {
  bottom: 0;
  left: 0;
  align-items: flex-start;
}
.ds-toast-host--bottom-center {
  bottom: 0;
  left: 50%;
  transform: translateX(-50%);
  align-items: center;
}

.ds-toast {
  display: flex;
  align-items: flex-start;
  gap: var(--ds-space-3);
  width: min(360px, 100%);
  padding: var(--ds-space-3) var(--ds-space-4);
  border: 1px solid var(--ds-color-border);
  border-radius: var(--ds-radius-lg);
  background: var(--ds-color-bg-elevated);
  box-shadow: var(--ds-shadow-lg);
  pointer-events: auto;
}

.ds-toast__icon {
  display: flex;
  flex: none;
  margin-top: 1px;
}
.ds-toast--info .ds-toast__icon {
  color: var(--ds-color-info-fg);
}
.ds-toast--success .ds-toast__icon {
  color: var(--ds-color-success-fg);
}
.ds-toast--warning .ds-toast__icon {
  color: var(--ds-color-warning-fg);
}
.ds-toast--danger .ds-toast__icon {
  color: var(--ds-color-danger-fg);
}

.ds-toast__content {
  flex: 1;
  min-width: 0;
}
.ds-toast__title {
  font-size: var(--ds-font-size-sm);
  font-weight: var(--ds-font-weight-semibold);
  color: var(--ds-color-fg);
}
.ds-toast__message {
  font-size: var(--ds-font-size-sm);
  color: var(--ds-color-fg-muted);
  word-break: break-word;
}

.ds-toast__close {
  flex: none;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 22px;
  border: 0;
  border-radius: var(--ds-radius-sm);
  background: transparent;
  color: var(--ds-color-fg-subtle);
}
.ds-toast__close:hover {
  background: var(--ds-color-bg-hover);
  color: var(--ds-color-fg);
}

.ds-toast-enter-active,
.ds-toast-leave-active {
  transition: opacity var(--ds-motion-duration-base) var(--ds-motion-ease-standard),
    transform var(--ds-motion-duration-base) var(--ds-motion-ease-out);
}
.ds-toast-enter {
  opacity: 0;
  transform: translateY(-8px) scale(0.98);
}
.ds-toast-leave-to {
  opacity: 0;
  transform: translateX(16px) scale(0.98);
}
.ds-toast-move {
  transition: transform var(--ds-motion-duration-base) var(--ds-motion-ease-standard);
}

@media (max-width: 639px) {
  .ds-toast-host {
    left: 0;
    right: 0;
    transform: none;
    padding: var(--ds-space-3);
  }
  .ds-toast-host--bottom-right,
  .ds-toast-host--bottom-left,
  .ds-toast-host--bottom-center {
    padding-bottom: calc(var(--ds-space-3) + env(safe-area-inset-bottom));
  }
  .ds-toast {
    width: 100%;
  }
}
</style>
