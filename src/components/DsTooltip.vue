<template>
  <el-tooltip
    class="ds-tooltip"
    :class="`ds-tooltip--${tone}`"
    :content="content"
    :placement="placement"
    :effect="effect"
    :disabled="disabled || !content"
    :open-delay="delay"
    :offset="offset"
    :visible-arrow="true"
    :popper-class="`ds-tooltip__popper ds-tooltip__popper--${tone}`"
  >
    <span class="ds-tooltip__trigger" :style="{ maxWidth: maxWidth ? `${maxWidth}px` : null }">
      <slot />
    </span>
  </el-tooltip>
</template>

<script>
/**
 * DsTooltip —— 基于 el-tooltip 的二次封装
 * @displayName 文字提示 Tooltip
 * 气泡定位与 Popper 逻辑全部交给 Element，我们只统一默认参数与主题。
 */
export default {
  name: 'DsTooltip',
  inheritAttrs: false,
  props: {
    content: { type: String, default: '' },
    placement: { type: String, default: 'top', validator: (v) => ['top', 'bottom', 'left', 'right'].includes(v) },
    tone: { type: String, default: 'dark', validator: (v) => ['dark', 'light'].includes(v) },
    delay: { type: Number, default: 120 },
    offset: { type: Number, default: 8 },
    disabled: { type: Boolean, default: false },
    maxWidth: { type: Number, default: 260 },
  },
  computed: {
    effect() {
      return this.tone === 'light' ? 'light' : 'dark'
    },
  },
}
</script>

<style scoped>
.ds-tooltip {
  display: inline-flex;
  align-items: center;
}

.ds-tooltip__bubble {
  position: fixed;
  z-index: var(--ds-z-tooltip);
  padding: var(--ds-space-2) var(--ds-space-3);
  border-radius: var(--ds-radius-md);
  font-size: var(--ds-font-size-xs);
  line-height: 1.45;
  pointer-events: none;
  box-shadow: var(--ds-shadow-lg);
  word-break: break-word;
}
.ds-tooltip__bubble--dark {
  background: var(--ds-color-fg);
  color: var(--ds-color-bg);
}
.ds-tooltip__bubble--light {
  background: var(--ds-color-bg-elevated);
  color: var(--ds-color-fg);
  border: 1px solid var(--ds-color-border);
}

.ds-tooltip__arrow {
  position: absolute;
  width: 8px;
  height: 8px;
  background: inherit;
  border: inherit;
  transform: rotate(45deg);
}
.ds-tooltip__bubble--top .ds-tooltip__arrow {
  bottom: -4px;
  left: 50%;
  margin-left: -4px;
  border-top: 0;
  border-left: 0;
}
.ds-tooltip__bubble--bottom .ds-tooltip__arrow {
  top: -4px;
  left: 50%;
  margin-left: -4px;
  border-bottom: 0;
  border-right: 0;
}
.ds-tooltip__bubble--left .ds-tooltip__arrow {
  right: -4px;
  top: 50%;
  margin-top: -4px;
  border-bottom: 0;
  border-left: 0;
}
.ds-tooltip__bubble--right .ds-tooltip__arrow {
  left: -4px;
  top: 50%;
  margin-top: -4px;
  border-top: 0;
  border-right: 0;
}

.ds-tooltip-enter-active,
.ds-tooltip-leave-active {
  transition: opacity var(--ds-motion-duration-fast) var(--ds-motion-ease-standard),
    transform var(--ds-motion-duration-fast) var(--ds-motion-ease-standard);
}
.ds-tooltip-enter,
.ds-tooltip-leave-to {
  opacity: 0;
  transform: scale(0.96);
}
</style>

<style scoped>
/* ================= Element 适配 ================= */
.ds-tooltip__trigger {
  display: inline-flex;
  align-items: center;
}
</style>
