<template>
  <el-link
    v-if="href"
    class="ds-btn"
    :class="classes"
    :href="disabled ? null : href"
    :target="target"
    :rel="target === '_blank' ? 'noopener noreferrer' : null"
    :type="linkType"
    :underline="false"
    :disabled="disabled || loading"
    :aria-disabled="disabled ? 'true' : null"
    :aria-label="ariaLabel || null"
    v-bind="$attrs"
    @click="onClick"
  >
    <DsIcon v-if="icon" :name="icon" :size="iconSize" />
    <span v-if="$slots.default" class="ds-btn__label"><slot /></span>
    <DsIcon v-if="iconRight" :name="iconRight" :size="iconSize" />
  </el-link>

  <router-link
    v-else-if="to"
    class="ds-btn"
    :class="classes"
    :to="to"
    :aria-label="ariaLabel || null"
    @click.native="onClick"
  >
    <slot name="icon">
      <DsIcon v-if="icon" :name="icon" :size="iconSize" />
    </slot>
    <span v-if="$slots.default" class="ds-btn__label"><slot /></span>
    <DsIcon v-if="iconRight" :name="iconRight" :size="iconSize" />
  </router-link>

  <el-button
    v-else
    class="ds-btn"
    :class="classes"
    :type="elType"
    :size="elSize"
    :loading="loading"
    :disabled="disabled"
    :round="round"
    :circle="iconOnly"
    :plain="plain"
    :native-type="nativeType"
    :aria-label="ariaLabel || null"
    :aria-busy="loading ? 'true' : null"
    v-bind="$attrs"
    @click="onClick"
  >
    <slot name="icon">
      <DsIcon v-if="icon && !loading" :name="icon" :size="iconSize" />
    </slot>
    <span v-if="$slots.default" class="ds-btn__label"><slot /></span>
    <DsIcon v-if="iconRight && !loading" :name="iconRight" :size="iconSize" />
  </el-button>
</template>

<script>
import DsIcon from './DsIcon.vue'

/**
 * DsButton —— 基于 el-button / el-link 的二次封装
 * @displayName 按钮 Button
 *
 * 为什么包一层：
 *  · 保留 variant / size / block / iconOnly 这套业务语义，el-button 只负责渲染与交互
 *  · href 场景自动切换到 el-link（渲染 <a>），to 场景切换到 router-link
 *  · loading / disabled 统一拦截 click，避免业务到处写 v-if
 *  · 视觉仍由 .ds-btn 系列类 + Design Token 控制，Element 只提供行为与基础外观
 */
export default {
  name: 'DsButton',
  components: { DsIcon },
  inheritAttrs: false,
  props: {
    variant: {
      type: String,
      default: 'secondary',
      validator: (v) =>
        ['primary', 'secondary', 'ghost', 'subtle', 'danger', 'success', 'link'].includes(v),
    },
    size: {
      type: String,
      default: 'md',
      validator: (v) => ['xs', 'sm', 'md', 'lg'].includes(v),
    },
    block: { type: Boolean, default: false },
    loading: { type: Boolean, default: false },
    disabled: { type: Boolean, default: false },
    round: { type: Boolean, default: false },
    icon: { type: String, default: '' },
    iconRight: { type: String, default: '' },
    iconOnly: { type: Boolean, default: false },
    href: { type: String, default: '' },
    target: { type: String, default: '' },
    to: { type: [String, Object], default: null },
    nativeType: { type: String, default: 'button' },
    ariaLabel: { type: String, default: '' },
  },
  computed: {
    classes() {
      return [
        `ds-btn--${this.variant}`,
        `ds-btn--${this.size}`,
        {
          'ds-btn--block': this.block,
          'ds-btn--round': this.round,
          'ds-btn--icon-only': this.iconOnly,
          'ds-btn--loading': this.loading,
        },
      ]
    },
    /** 我们的 4 档尺寸 -> Element 的 medium / small / mini */
    elSize() {
      return { xs: 'mini', sm: 'small', md: 'medium', lg: 'medium' }[this.size] || 'medium'
    },
    /** 业务语义 -> Element type */
    elType() {
      return { primary: 'primary', danger: 'danger', success: 'success', link: 'text' }[this.variant] || ''
    },
    plain() {
      return this.variant === 'ghost'
    },
    linkType() {
      return { primary: 'primary', danger: 'danger', success: 'success' }[this.variant] || 'default'
    },
    iconSize() {
      return { xs: 'xs', sm: 'sm', md: 'sm', lg: 'md' }[this.size] || 'sm'
    },
  },
  methods: {
    focus() {
      const root = this.$el
      if (root && root.focus) root.focus()
    },
    onClick(e) {
      if (this.disabled || this.loading) {
        e.preventDefault()
        e.stopPropagation()
        return
      }
      this.$emit('click', e)
    },
  },
}
</script>

<style scoped>
.ds-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: var(--ds-space-2);
  position: relative;
  border: 1px solid transparent;
  border-radius: var(--ds-radius-md);
  font-weight: var(--ds-font-weight-medium);
  line-height: 1;
  white-space: nowrap;
  text-decoration: none;
  user-select: none;
  transition: background-color var(--ds-motion-duration-fast) var(--ds-motion-ease-standard),
    border-color var(--ds-motion-duration-fast) var(--ds-motion-ease-standard),
    color var(--ds-motion-duration-fast) var(--ds-motion-ease-standard),
    box-shadow var(--ds-motion-duration-fast) var(--ds-motion-ease-standard),
    transform var(--ds-motion-duration-fast) var(--ds-motion-ease-standard);
}

.ds-btn:active:not(:disabled) {
  transform: translateY(0.5px);
}

/* ---------- 尺寸 ---------- */
.ds-btn--xs {
  height: 26px;
  padding: 0 var(--ds-space-2);
  font-size: var(--ds-font-size-2xs);
  border-radius: var(--ds-radius-sm);
}
.ds-btn--sm {
  height: var(--ds-size-control-sm);
  padding: 0 var(--ds-space-3);
  font-size: var(--ds-font-size-xs);
}
.ds-btn--md {
  height: var(--ds-size-control-md);
  padding: 0 var(--ds-space-4);
  font-size: var(--ds-font-size-sm);
}
.ds-btn--lg {
  height: var(--ds-size-control-lg);
  padding: 0 var(--ds-space-5);
  font-size: var(--ds-font-size-md);
}

/* 移动端把触控区域放大到 44px，避免误触 */
@media (max-width: 767px) {
  .ds-btn--sm {
    height: 36px;
    padding: 0 var(--ds-space-4);
  }
  .ds-btn--md {
    height: 42px;
  }
  .ds-btn--lg {
    height: 48px;
  }
}

/* ---------- 变体 ---------- */
.ds-btn--primary {
  background: var(--ds-color-brand);
  color: var(--ds-color-fg-on-brand);
  box-shadow: var(--ds-shadow-sm);
}
.ds-btn--primary:hover:not(:disabled) {
  background: var(--ds-color-brand-hover);
}
.ds-btn--primary:active:not(:disabled) {
  background: var(--ds-color-brand-active);
}

.ds-btn--secondary {
  background: var(--ds-color-bg-elevated);
  border-color: var(--ds-color-border-strong);
  color: var(--ds-color-fg);
  box-shadow: var(--ds-shadow-sm);
}
.ds-btn--secondary:hover:not(:disabled) {
  background: var(--ds-color-bg-hover);
  border-color: var(--ds-color-brand-border);
  color: var(--ds-color-brand-fg);
}

.ds-btn--ghost {
  background: transparent;
  border-color: var(--ds-color-border);
  color: var(--ds-color-fg-muted);
}
.ds-btn--ghost:hover:not(:disabled) {
  background: var(--ds-color-bg-hover);
  color: var(--ds-color-fg);
}

.ds-btn--subtle {
  background: var(--ds-color-bg-subtle);
  color: var(--ds-color-fg-muted);
}
.ds-btn--subtle:hover:not(:disabled) {
  background: var(--ds-color-brand-subtle);
  color: var(--ds-color-brand-fg);
}

.ds-btn--danger {
  background: var(--ds-color-danger);
  color: #fff;
}
.ds-btn--danger:hover:not(:disabled) {
  filter: brightness(1.08);
}

.ds-btn--success {
  background: var(--ds-color-success);
  color: #fff;
}
.ds-btn--success:hover:not(:disabled) {
  filter: brightness(1.08);
}

.ds-btn--link {
  background: transparent;
  color: var(--ds-color-brand-fg);
  height: auto;
  padding: 0;
}
.ds-btn--link:hover {
  text-decoration: underline;
}

/* ---------- 状态 ---------- */
.ds-btn:disabled,
.ds-btn[aria-disabled='true'] {
  background: var(--ds-color-bg-disabled);
  border-color: var(--ds-color-border);
  color: var(--ds-color-fg-disabled);
  box-shadow: none;
  pointer-events: none;
}
.ds-btn--link:disabled {
  background: transparent;
}

.ds-btn--block {
  display: flex;
  width: 100%;
}
.ds-btn--round {
  border-radius: var(--ds-radius-full);
}
.ds-btn--icon-only {
  padding: 0;
  aspect-ratio: 1;
  width: var(--ds-size-control-md);
}
.ds-btn--icon-only.ds-btn--sm {
  width: var(--ds-size-control-sm);
}
.ds-btn--icon-only.ds-btn--lg {
  width: var(--ds-size-control-lg);
}
@media (max-width: 767px) {
  .ds-btn--icon-only.ds-btn--sm {
    width: 36px;
  }
  .ds-btn--icon-only.ds-btn--md {
    width: 42px;
  }
}

.ds-btn--loading {
  color: transparent !important;
  pointer-events: none;
}

.ds-btn__label:empty {
  display: none;
}

.ds-btn__spinner {
  position: absolute;
  inset: 0;
  margin: auto;
  width: 1em;
  height: 1em;
  border: 2px solid currentColor;
  border-right-color: transparent;
  border-radius: 50%;
  color: inherit;
  opacity: 0.85;
  animation: ds-btn-spin 0.6s linear infinite;
}
.ds-btn--primary .ds-btn__spinner,
.ds-btn--danger .ds-btn__spinner,
.ds-btn--success .ds-btn__spinner {
  color: #fff;
}
.ds-btn--secondary .ds-btn__spinner,
.ds-btn--ghost .ds-btn__spinner,
.ds-btn--subtle .ds-btn__spinner {
  color: var(--ds-color-fg-muted);
}

@keyframes ds-btn-spin {
  to {
    transform: rotate(360deg);
  }
}
</style>

<style scoped>
/* ================= Element 适配 =================
   .ds-btn 系列类掌握最终外观（Token 驱动），el-button 只负责行为与基础结构。 */
.ds-btn {
  line-height: 1.2;
}
.ds-btn ::v-deep .el-icon-loading {
  font-size: inherit;
}
@media (max-width: 767px) {
  .ds-btn:not(.ds-btn--sm):not(.ds-btn--xs) {
    min-height: 44px;
  }
}
</style>
