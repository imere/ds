<template>
  <div
    class="ds-switch"
    :class="[
      `ds-switch--${size}`,
      {
        'ds-switch--checked': value,
        'ds-switch--disabled': disabled,
        'ds-switch--loading': loading,
      },
    ]"
  >
    <el-switch
      :value="value"
      :disabled="disabled || loading"
      :active-text="activeText"
      :inactive-text="inactiveText"
      @change="onChange"
    />
    <span v-if="label || $slots.default" class="ds-switch__label">
      <slot>{{ label }}</slot>
    </span>
  </div>
</template>

<script>
/**
 * DsSwitch —— 基于 el-switch 的二次封装
 * @displayName 开关 Switch
 * 保留 disabled / loading 下的点击拦截，以及右侧文字标签。
 */
export default {
  name: 'DsSwitch',
  inheritAttrs: false,
  props: {
    value: { type: Boolean, default: false },
    label: { type: String, default: '' },
    disabled: { type: Boolean, default: false },
    loading: { type: Boolean, default: false },
    size: { type: String, default: 'md', validator: (v) => ['sm', 'md', 'lg'].includes(v) },
    activeText: { type: String, default: '' },
    inactiveText: { type: String, default: '' },
  },
  methods: {
    onChange() {
      if (this.disabled || this.loading) return
      this.$emit('input', !this.value)
      this.$emit('change', !this.value)
    },
  },
}
</script>

<style scoped>
.ds-switch {
  display: inline-flex;
  align-items: center;
  gap: var(--ds-space-2);
  cursor: pointer;
  user-select: none;
}
.ds-switch--disabled {
  opacity: 0.55;
  cursor: not-allowed;
}

.ds-switch__input {
  position: absolute;
  opacity: 0;
  width: 1px;
  height: 1px;
}

.ds-switch__track {
  position: relative;
  display: inline-flex;
  align-items: center;
  flex: none;
  padding: 2px;
  border-radius: var(--ds-radius-full);
  background: var(--ds-color-bg-inset);
  border: 1px solid var(--ds-color-border-strong);
  transition: background-color var(--ds-motion-duration-base) var(--ds-motion-ease-standard),
    border-color var(--ds-motion-duration-base) var(--ds-motion-ease-standard);
}
.ds-switch--sm .ds-switch__track {
  width: 30px;
  height: 18px;
}
.ds-switch--md .ds-switch__track {
  width: 38px;
  height: 22px;
}
.ds-switch--lg .ds-switch__track {
  width: 48px;
  height: 27px;
}

.ds-switch__thumb {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background: var(--ds-color-bg-elevated);
  box-shadow: var(--ds-shadow-sm);
  color: var(--ds-color-fg-muted);
  transition: transform var(--ds-motion-duration-base) var(--ds-motion-ease-spring);
}
.ds-switch--sm .ds-switch__thumb {
  width: 14px;
  height: 14px;
}
.ds-switch--md .ds-switch__thumb {
  width: 18px;
  height: 18px;
}
.ds-switch--lg .ds-switch__thumb {
  width: 23px;
  height: 23px;
}

.ds-switch--on .ds-switch__track {
  background: var(--ds-color-brand);
  border-color: var(--ds-color-brand);
}
.ds-switch--sm.ds-switch--on .ds-switch__thumb {
  transform: translateX(12px);
}
.ds-switch--md.ds-switch--on .ds-switch__thumb {
  transform: translateX(16px);
}
.ds-switch--lg.ds-switch--on .ds-switch__thumb {
  transform: translateX(21px);
}

.ds-switch__input:focus-visible + .ds-switch__track {
  outline: 2px solid var(--ds-color-focus);
  outline-offset: 2px;
}

.ds-switch__label {
  font-size: var(--ds-font-size-sm);
  color: var(--ds-color-fg);
}

@media (max-width: 767px) {
  .ds-switch--md .ds-switch__track {
    width: 44px;
    height: 26px;
  }
  .ds-switch--md .ds-switch__thumb {
    width: 22px;
    height: 22px;
  }
  .ds-switch--md.ds-switch--on .ds-switch__thumb {
    transform: translateX(18px);
  }
}
</style>

<style scoped>
/* ================= Element 适配：尺寸（el-switch 宽度走内联样式，需 !important） ================= */
.ds-switch {
  display: inline-flex;
  align-items: center;
  gap: var(--ds-space-2);
}
.ds-switch__label {
  font-size: var(--ds-font-size-sm);
  color: var(--ds-color-fg-muted);
}
.ds-switch--sm ::v-deep .el-switch__core {
  width: 32px !important;
  height: 16px !important;
}
.ds-switch--lg ::v-deep .el-switch__core {
  width: 52px !important;
  height: 24px !important;
}
</style>
