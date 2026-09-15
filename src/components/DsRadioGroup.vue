<template>
  <el-radio-group
    class="ds-radio-group"
    :class="[
      `ds-radio-group--${variant}`,
      `ds-radio-group--${size}`,
      { 'ds-radio-group--vertical': vertical },
    ]"
    :value="value"
    :disabled="disabled"
    :size="elSize"
    @input="onInput"
  >
    <template v-if="variant === 'button'">
      <el-radio-button
        v-for="opt in normalizedOptions"
        :key="String(opt.value)"
        :label="opt.value"
        :disabled="disabled || opt.disabled"
      >
        {{ opt.label }}
      </el-radio-button>
    </template>

    <template v-else>
      <el-radio
        v-for="opt in normalizedOptions"
        :key="String(opt.value)"
        :label="opt.value"
        :disabled="disabled || opt.disabled"
      >
        {{ opt.label }}
      </el-radio>
    </template>

    <slot />
  </el-radio-group>
</template>

<script>
/**
 * DsRadioGroup —— 基于 el-radio-group 的二次封装
 * @displayName 单选组 RadioGroup
 * variant=button 时切换成 el-radio-button，其余保持默认形态。
 */
export default {
  name: 'DsRadioGroup',
  inheritAttrs: false,
  props: {
    value: { type: [String, Number, Boolean], default: '' },
    options: { type: Array, default: () => [] },
    variant: { type: String, default: 'default', validator: (v) => ['default', 'button'].includes(v) },
    size: { type: String, default: 'md', validator: (v) => ['sm', 'md', 'lg'].includes(v) },
    vertical: { type: Boolean, default: false },
    disabled: { type: Boolean, default: false },
  },
  computed: {
    normalizedOptions() {
      return this.options.map((opt) =>
        typeof opt === 'object' && opt !== null ? opt : { label: String(opt), value: opt }
      )
    },
    elSize() {
      return { sm: 'small', md: 'small', lg: 'medium' }[this.size] || 'small'
    },
  },
  methods: {
    onInput(val) {
      this.$emit('input', val)
      this.$emit('change', val)
    },
  },
}
</script>

<style scoped>
.ds-radio-group {
  display: flex;
  flex-wrap: wrap;
  gap: var(--ds-space-3) var(--ds-space-5);
}
.ds-radio-group--vertical {
  flex-direction: column;
  gap: var(--ds-space-3);
}

/* ---------- 分段按钮形态 ---------- */
.ds-radio-group--button {
  display: inline-flex;
  flex-wrap: nowrap;
  gap: 0;
  padding: 3px;
  background: var(--ds-color-bg-subtle);
  border: 1px solid var(--ds-color-border);
  border-radius: var(--ds-radius-md);
  width: auto;
  max-width: 100%;
  overflow: auto;
}

.ds-radio-group__btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: var(--ds-space-1);
  flex: 1 1 auto;
  padding: 0 var(--ds-space-3);
  border: 0;
  border-radius: calc(var(--ds-radius-md) - 3px);
  background: transparent;
  color: var(--ds-color-fg-muted);
  font-size: var(--ds-font-size-xs);
  font-weight: var(--ds-font-weight-medium);
  white-space: nowrap;
  transition: background-color var(--ds-motion-duration-fast) var(--ds-motion-ease-standard),
    color var(--ds-motion-duration-fast) var(--ds-motion-ease-standard);
}
.ds-radio-group--sm .ds-radio-group__btn {
  height: 26px;
}
.ds-radio-group--md .ds-radio-group__btn {
  height: 32px;
}
.ds-radio-group--lg .ds-radio-group__btn {
  height: 40px;
  font-size: var(--ds-font-size-sm);
}

.ds-radio-group__btn:hover:not(.is-active):not(:disabled) {
  color: var(--ds-color-fg);
}
.ds-radio-group__btn.is-active {
  background: var(--ds-color-bg-elevated);
  color: var(--ds-color-brand-fg);
  box-shadow: var(--ds-shadow-sm);
}
.ds-radio-group__btn.is-disabled {
  opacity: 0.5;
}

@media (max-width: 767px) {
  .ds-radio-group--button {
    width: 100%;
  }
  .ds-radio-group--md .ds-radio-group__btn {
    height: 38px;
    font-size: var(--ds-font-size-sm);
  }
}
</style>
