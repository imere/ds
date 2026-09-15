<template>
  <el-tag
    class="ds-badge"
    :class="[
      `ds-badge--${tone}`,
      `ds-badge--${size}`,
      { 'ds-badge--dot': dot, 'ds-badge--pill': pill, 'ds-badge--soft': soft },
    ]"
    :type="elType"
    :size="elSize"
    :effect="soft ? 'light' : 'dark'"
    :role="role || null"
    :aria-label="ariaLabel || null"
    :disable-transitions="true"
  >
    <span v-if="dot" class="ds-badge__dot" aria-hidden="true" />
    <DsIcon v-if="icon" :name="icon" size="xs" class="ds-badge__icon" />
    <slot />
  </el-tag>
</template>

<script>
import DsIcon from './DsIcon.vue'

/**
 * DsBadge —— 基于 el-tag 的二次封装
 * @displayName 徽标 Badge
 * 状态徽标本质上是一个「没有关闭按钮的标签」，所以复用 el-tag 的渲染与主题，
 * 我们只补充 dot / icon / pill / soft 这些展示形态。
 */
export default {
  name: 'DsBadge',
  components: { DsIcon },
  inheritAttrs: false,
  props: {
    tone: {
      type: String,
      default: 'neutral',
      validator: (v) => ['neutral', 'brand', 'success', 'warning', 'danger', 'info'].includes(v),
    },
    size: { type: String, default: 'md', validator: (v) => ['sm', 'md', 'lg'].includes(v) },
    dot: { type: Boolean, default: false },
    pill: { type: Boolean, default: false },
    soft: { type: Boolean, default: false },
    icon: { type: String, default: '' },
    role: { type: String, default: '' },
    ariaLabel: { type: String, default: '' },
  },
  computed: {
    elType() {
      return { neutral: 'info', brand: 'primary' }[this.tone] || this.tone
    },
    elSize() {
      return { sm: 'small', md: 'small', lg: 'medium' }[this.size] || 'small'
    },
  },
}
</script>

<style scoped>
.ds-badge {
  display: inline-flex;
  align-items: center;
  gap: var(--ds-space-1);
  border: 1px solid transparent;
  border-radius: var(--ds-radius-md);
  font-weight: var(--ds-font-weight-medium);
  line-height: 1.4;
  white-space: nowrap;
}
.ds-badge--sm {
  padding: 1px var(--ds-space-2);
  font-size: var(--ds-font-size-2xs);
}
.ds-badge--md {
  padding: 2px var(--ds-space-2);
  font-size: var(--ds-font-size-xs);
}
.ds-badge--lg {
  padding: 4px var(--ds-space-3);
  font-size: var(--ds-font-size-sm);
}
.ds-badge--pill {
  border-radius: var(--ds-radius-full);
}

.ds-badge--neutral {
  background: var(--ds-color-bg-subtle);
  border-color: var(--ds-color-border);
  color: var(--ds-color-fg-muted);
}
.ds-badge--brand {
  background: var(--ds-color-brand-subtle);
  border-color: var(--ds-color-brand-border);
  color: var(--ds-color-brand-fg);
}
.ds-badge--success {
  background: var(--ds-color-success-subtle);
  border-color: transparent;
  color: var(--ds-color-success-fg);
}
.ds-badge--warning {
  background: var(--ds-color-warning-subtle);
  border-color: transparent;
  color: var(--ds-color-warning-fg);
}
.ds-badge--danger {
  background: var(--ds-color-danger-subtle);
  border-color: transparent;
  color: var(--ds-color-danger-fg);
}
.ds-badge--info {
  background: var(--ds-color-info-subtle);
  border-color: transparent;
  color: var(--ds-color-info-fg);
}

.ds-badge--soft {
  background: transparent;
  border-color: var(--ds-color-border);
}

.ds-badge__dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: currentColor;
  flex: none;
}
</style>
