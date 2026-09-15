<template>
  <el-radio
    class="ds-radio"
    :class="[`ds-radio--${size}`, { 'ds-radio--disabled': disabled }]"
    :value="modelValue"
    :label="value"
    :disabled="disabled"
    :name="name"
    @change="onChange"
  >
    <slot>{{ label }}</slot>
  </el-radio>
</template>

<script>
/**
 * DsRadio —— 基于 el-radio 的二次封装
 * @displayName 单选框 Radio
 * el-radio 派发的 change 载荷就是自身的 label，正好等于对外的 value 语义。
 */
export default {
  name: 'DsRadio',
  inheritAttrs: false,
  props: {
    value: { type: [String, Number, Boolean], default: '' },
    modelValue: { type: [String, Number, Boolean], default: '' },
    label: { type: String, default: '' },
    disabled: { type: Boolean, default: false },
    size: { type: String, default: 'md', validator: (v) => ['sm', 'md', 'lg'].includes(v) },
    name: { type: String, default: '' },
  },
  methods: {
    onChange(val) {
      if (this.disabled) return
      this.$emit('input', val)
      this.$emit('change', val)
    },
  },
}
</script>

<style scoped>
.ds-radio {
  display: inline-flex;
  align-items: center;
  gap: var(--ds-space-2);
  cursor: pointer;
  user-select: none;
}
.ds-radio--disabled {
  opacity: 0.55;
  cursor: not-allowed;
}

.ds-radio__input {
  position: absolute;
  opacity: 0;
  width: 1px;
  height: 1px;
}

.ds-radio__dot {
  position: relative;
  display: inline-flex;
  flex: none;
  border: 1.5px solid var(--ds-color-border-strong);
  border-radius: 50%;
  background: var(--ds-color-bg-elevated);
  transition: border-color var(--ds-motion-duration-fast) var(--ds-motion-ease-standard),
    background-color var(--ds-motion-duration-fast) var(--ds-motion-ease-standard);
}
.ds-radio--sm .ds-radio__dot {
  width: 15px;
  height: 15px;
}
.ds-radio--md .ds-radio__dot {
  width: 18px;
  height: 18px;
}
.ds-radio--lg .ds-radio__dot {
  width: 22px;
  height: 22px;
}
.ds-radio__dot::after {
  content: '';
  position: absolute;
  inset: 0;
  margin: auto;
  width: 45%;
  height: 45%;
  border-radius: 50%;
  background: var(--ds-color-fg-on-brand);
  transform: scale(0);
  transition: transform var(--ds-motion-duration-fast) var(--ds-motion-ease-spring);
}

.ds-radio:hover:not(.ds-radio--disabled) .ds-radio__dot {
  border-color: var(--ds-color-brand);
}
.ds-radio__input:focus-visible + .ds-radio__dot {
  outline: 2px solid var(--ds-color-focus);
  outline-offset: 2px;
}
.ds-radio--checked .ds-radio__dot {
  background: var(--ds-color-brand);
  border-color: var(--ds-color-brand);
}
.ds-radio--checked .ds-radio__dot::after {
  transform: scale(1);
}

.ds-radio__label {
  font-size: var(--ds-font-size-sm);
  color: var(--ds-color-fg);
  line-height: 1.4;
}
.ds-radio--sm .ds-radio__label {
  font-size: var(--ds-font-size-xs);
}
.ds-radio--lg .ds-radio__label {
  font-size: var(--ds-font-size-md);
}

@media (max-width: 767px) {
  .ds-radio--md .ds-radio__dot {
    width: 20px;
    height: 20px;
  }
}
</style>

<style scoped>
/* ================= Element 适配 ================= */
.ds-radio {
  display: inline-flex;
  align-items: center;
}
.ds-radio ::v-deep .el-radio__label {
  padding-left: var(--ds-space-2);
  color: var(--ds-color-fg);
  font-size: var(--ds-font-size-sm);
}
@media (max-width: 767px) {
  .ds-radio {
    min-height: 44px;
  }
}
</style>
