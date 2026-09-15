<template>
  <el-alert
    class="ds-alert"
    :class="[`ds-alert--${tone}`, `ds-alert--${variant}`, { 'ds-alert--banner': banner }]"
    :title="title"
    :type="elType"
    :effect="elEffect"
    :closable="closable"
    :show-icon="showIcon"
    :center="banner"
    @close="$emit('close')"
  >
    <slot />
  </el-alert>
</template>

<script>
/**
 * DsAlert —— 基于 el-alert 的二次封装
 * @displayName 提示条 Alert
 * tone(语义) / variant(soft|solid|outline) 是我们自己的语义，
 * 内部映射到 el-alert 的 type + effect。
 */
export default {
  name: 'DsAlert',
  inheritAttrs: false,
  props: {
    tone: {
      type: String,
      default: 'info',
      validator: (v) => ['info', 'success', 'warning', 'danger', 'brand'].includes(v),
    },
    variant: {
      type: String,
      default: 'soft',
      validator: (v) => ['soft', 'solid', 'outline'].includes(v),
    },
    title: { type: String, default: '' },
    closable: { type: Boolean, default: false },
    banner: { type: Boolean, default: false },
    showIcon: { type: Boolean, default: true },
  },
  computed: {
    elType() {
      return { brand: 'info' }[this.tone] || this.tone
    },
    elEffect() {
      return this.variant === 'solid' ? 'dark' : 'light'
    },
  },
}
</script>

<style scoped>
.ds-alert {
  display: flex;
  align-items: flex-start;
  gap: var(--ds-space-3);
  padding: var(--ds-space-3) var(--ds-space-4);
  border-radius: var(--ds-radius-md);
  border: 1px solid transparent;
  font-size: var(--ds-font-size-sm);
}

.ds-alert--banner {
  border-radius: 0;
  border-left: 0;
  border-right: 0;
}

.ds-alert__icon {
  display: flex;
  flex: none;
  margin-top: 1px;
}
.ds-alert__content {
  flex: 1;
  min-width: 0;
}
.ds-alert__title {
  font-size: var(--ds-font-size-sm);
  font-weight: var(--ds-font-weight-semibold);
  margin-bottom: 2px;
}
.ds-alert__desc {
  color: inherit;
  opacity: 0.92;
}
.ds-alert__actions {
  margin-top: var(--ds-space-2);
}

.ds-alert__close {
  flex: none;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  padding: 0;
  border: 0;
  border-radius: var(--ds-radius-sm);
  background: transparent;
  color: inherit;
  opacity: 0.6;
  transition: opacity var(--ds-motion-duration-fast) var(--ds-motion-ease-standard);
}
.ds-alert__close:hover {
  opacity: 1;
  background: var(--ds-color-bg-active);
}

/* ---------- soft ---------- */
.ds-alert--soft.ds-alert--info {
  background: var(--ds-color-info-subtle);
  color: var(--ds-color-info-fg);
}
.ds-alert--soft.ds-alert--success {
  background: var(--ds-color-success-subtle);
  color: var(--ds-color-success-fg);
}
.ds-alert--soft.ds-alert--warning {
  background: var(--ds-color-warning-subtle);
  color: var(--ds-color-warning-fg);
}
.ds-alert--soft.ds-alert--danger {
  background: var(--ds-color-danger-subtle);
  color: var(--ds-color-danger-fg);
}
.ds-alert--soft.ds-alert--brand {
  background: var(--ds-color-brand-subtle);
  color: var(--ds-color-brand-fg);
}

/* ---------- solid ---------- */
.ds-alert--solid {
  color: #fff;
}
.ds-alert--solid.ds-alert--info {
  background: var(--ds-color-info);
}
.ds-alert--solid.ds-alert--success {
  background: var(--ds-color-success);
}
.ds-alert--solid.ds-alert--warning {
  background: var(--ds-color-warning);
}
.ds-alert--solid.ds-alert--danger {
  background: var(--ds-color-danger);
}
.ds-alert--solid.ds-alert--brand {
  background: var(--ds-color-brand);
}

/* ---------- outline ---------- */
.ds-alert--outline {
  background: transparent;
  border-color: currentColor;
}
.ds-alert--outline.ds-alert--info {
  color: var(--ds-color-info-fg);
}
.ds-alert--outline.ds-alert--success {
  color: var(--ds-color-success-fg);
}
.ds-alert--outline.ds-alert--warning {
  color: var(--ds-color-warning-fg);
}
.ds-alert--outline.ds-alert--danger {
  color: var(--ds-color-danger-fg);
}
.ds-alert--outline.ds-alert--brand {
  color: var(--ds-color-brand-fg);
}

.ds-alert-fade-enter-active,
.ds-alert-fade-leave-active {
  transition: opacity var(--ds-motion-duration-base) var(--ds-motion-ease-standard),
    transform var(--ds-motion-duration-base) var(--ds-motion-ease-standard);
}
.ds-alert-fade-enter,
.ds-alert-fade-leave-to {
  opacity: 0;
  transform: translateY(-4px);
}
</style>
