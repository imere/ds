<template>
  <el-checkbox
    class="ds-checkbox"
    :class="[
      `ds-checkbox--${size}`,
      {
        'ds-checkbox--indeterminate': indeterminate,
        'ds-checkbox--disabled': disabled,
        'ds-checkbox--checked': checked,
      },
    ]"
    :value="checked"
    :indeterminate="indeterminate"
    :disabled="disabled"
    :name="name"
    @change="onChange"
  >
    <slot>{{ label }}</slot>
  </el-checkbox>
</template>

<script>
/**
 * DsCheckbox —— 基于 el-checkbox 的二次封装
 * @displayName 复选框 Checkbox
 *
 * el-checkbox 只认「布尔 + label」，而业务里更常见的是
 * 「数组 + 选项值」（多选组）与「trueValue / falseValue」两种写法，
 * 这里统一收口：对外只暴露 modelValue / value，内部换算成 el 的受控状态。
 *
 * 注意：el-checkbox 派发的 change 载荷是它自己的布尔值，
 * 这里刻意忽略该载荷，一律以当前 modelValue 推算下一个值，
 * 这样 bool / array / 自定义真假值三种模式行为一致。
 */
export default {
  name: 'DsCheckbox',
  inheritAttrs: false,
  props: {
    modelValue: { type: [Boolean, Array, String, Number], default: false },
    label: { type: String, default: '' },
    value: { type: [String, Number, Boolean], default: undefined },
    trueValue: { type: null, default: true },
    falseValue: { type: null, default: false },
    indeterminate: { type: Boolean, default: false },
    disabled: { type: Boolean, default: false },
    size: { type: String, default: 'md', validator: (v) => ['sm', 'md', 'lg'].includes(v) },
    name: { type: String, default: '' },
  },
  computed: {
    checked() {
      if (Array.isArray(this.modelValue)) return this.modelValue.indexOf(this.value) > -1
      return this.modelValue === this.trueValue
    },
  },
  methods: {
    onChange() {
      if (this.disabled) return
      if (Array.isArray(this.modelValue)) {
        const next = this.checked
          ? this.modelValue.filter((v) => v !== this.value)
          : this.modelValue.concat([this.value])
        this.$emit('change', next)
      } else {
        this.$emit('change', this.checked ? this.falseValue : this.trueValue)
      }
    },
    focus() {
      const input = this.$el && this.$el.querySelector('input')
      if (input) input.focus()
    },
  },
}
</script>

<style scoped>
.ds-checkbox {
  display: inline-flex;
  align-items: center;
  gap: var(--ds-space-2);
  cursor: pointer;
  user-select: none;
}
.ds-checkbox--disabled {
  opacity: 0.55;
  cursor: not-allowed;
}

.ds-checkbox__input {
  position: absolute;
  opacity: 0;
  width: 1px;
  height: 1px;
  margin: 0;
}

.ds-checkbox__box {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex: none;
  border: 1.5px solid var(--ds-color-border-strong);
  border-radius: var(--ds-radius-sm);
  background: var(--ds-color-bg-elevated);
  color: var(--ds-color-fg-on-brand);
  transition: background-color var(--ds-motion-duration-fast) var(--ds-motion-ease-standard),
    border-color var(--ds-motion-duration-fast) var(--ds-motion-ease-standard);
}
.ds-checkbox--sm .ds-checkbox__box {
  width: 15px;
  height: 15px;
}
.ds-checkbox--md .ds-checkbox__box {
  width: 18px;
  height: 18px;
}
.ds-checkbox--lg .ds-checkbox__box {
  width: 22px;
  height: 22px;
}

.ds-checkbox:hover:not(.ds-checkbox--disabled) .ds-checkbox__box {
  border-color: var(--ds-color-brand);
}
.ds-checkbox__input:focus-visible + .ds-checkbox__box {
  outline: 2px solid var(--ds-color-focus);
  outline-offset: 2px;
}
.ds-checkbox--checked .ds-checkbox__box,
.ds-checkbox--indeterminate .ds-checkbox__box {
  background: var(--ds-color-brand);
  border-color: var(--ds-color-brand);
}

.ds-checkbox__label {
  font-size: var(--ds-font-size-sm);
  color: var(--ds-color-fg);
  line-height: 1.4;
}
.ds-checkbox--sm .ds-checkbox__label {
  font-size: var(--ds-font-size-xs);
}
.ds-checkbox--lg .ds-checkbox__label {
  font-size: var(--ds-font-size-md);
}

/* 移动端加大勾选框，方便点按 */
@media (max-width: 767px) {
  .ds-checkbox--md .ds-checkbox__box {
    width: 20px;
    height: 20px;
  }
  .ds-checkbox--sm .ds-checkbox__box {
    width: 18px;
    height: 18px;
  }
}
</style>

<style scoped>
/* ================= Element 适配：尺寸 ================= */
.ds-checkbox {
  display: inline-flex;
  align-items: center;
}
.ds-checkbox--sm ::v-deep .el-checkbox__inner {
  width: 14px;
  height: 14px;
}
.ds-checkbox--sm ::v-deep .el-checkbox__label {
  font-size: var(--ds-font-size-xs);
}
.ds-checkbox--lg ::v-deep .el-checkbox__inner {
  width: 18px;
  height: 18px;
}
.ds-checkbox--lg ::v-deep .el-checkbox__label {
  font-size: var(--ds-font-size-md);
}
.ds-checkbox ::v-deep .el-checkbox__label {
  padding-left: var(--ds-space-2);
  color: var(--ds-color-fg);
}
@media (max-width: 767px) {
  .ds-checkbox {
    min-height: 44px;
    padding-right: var(--ds-space-2);
  }
}
</style>
