<template>
  <div
    class="ds-input"
    :class="[
      `ds-input--${size}`,
      {
        'ds-input--error': !!error,
        'ds-input--disabled': disabled,
        'ds-input--readonly': readonly,
        'ds-input--focused': focused,
        'ds-input--has-prefix': !!prefix || !!$slots.prefix,
        'ds-input--has-suffix': hasSuffix,
      },
    ]"
  >
    <span v-if="prefix || $slots.prefix" class="ds-input__affix ds-input__prefix">
      <slot name="prefix">
        <DsIcon v-if="prefix" :name="prefix" size="sm" />
      </slot>
    </span>

    <!-- 交互能力全部交给 el-input（受控、事件、无障碍属性透传） -->
    <el-input
      ref="elInput"
      class="ds-input__field"
      :id="inputId"
      :value="value"
      :type="currentType"
      :size="elSize"
      :placeholder="placeholder"
      :disabled="disabled"
      :readonly="readonly"
      :maxlength="maxlength || null"
      :min="min"
      :max="max"
      :step="step"
      :autocomplete="autocomplete"
      :inputmode="inputmode"
      :aria-invalid="error ? 'true' : null"
      :aria-describedby="describedBy"
      v-bind="$attrs"
      @input="onInput"
      @change="onChange"
      @focus="onFocus"
      @blur="onBlur"
      @keydown.enter.native="$emit('enter', $event)"
      @keyup.esc.native="onEsc"
      v-on="extraListeners"
    />

    <span v-if="hasSuffix" class="ds-input__affix ds-input__suffix">
      <button
        v-if="visibleClear"
        type="button"
        class="ds-input__clear"
        aria-label="清空"
        @click="clear"
      >
        <DsIcon name="close" size="xs" />
      </button>
      <button
        v-if="type === 'password'"
        type="button"
        class="ds-input__toggle"
        :aria-label="revealed ? '隐藏密码' : '显示密码'"
        @click="revealed = !revealed"
      >
        <DsIcon :name="revealed ? 'eyeOff' : 'eye'" size="sm" />
      </button>
      <slot name="suffix" />
      <span v-if="maxlength && showCount" class="ds-input__count">
        {{ String(value || '').length }}/{{ maxlength }}
      </span>
    </span>
  </div>
</template>

<script>
import DsIcon from './DsIcon.vue'
import uid from '@/utils/uid'

/**
 * DsInput —— 基于 el-input 的二次封装
 * @displayName 输入框 Input
 *
 * 外层 .ds-input 仍是我们自己的盒子（负责 Token 化的边框 / 圆角 / 前后缀布局），
 * 中间的原生 <input> 换成 el-input：受控、事件、readonly / disabled / maxlength、
 * 以及 aria-* 属性透传（el-input 内部 v-bind="$attrs" 会落到真实 input 上）。
 */
export default {
  name: 'DsInput',
  components: { DsIcon },
  inheritAttrs: false,
  props: {
    value: { type: [String, Number], default: '' },
    type: { type: String, default: 'text' },
    size: { type: String, default: 'md', validator: (v) => ['sm', 'md', 'lg'].includes(v) },
    placeholder: { type: String, default: '' },
    disabled: { type: Boolean, default: false },
    readonly: { type: Boolean, default: false },
    clearable: { type: Boolean, default: false },
    error: { type: String, default: '' },
    prefix: { type: String, default: '' },
    maxlength: { type: [String, Number], default: '' },
    showCount: { type: Boolean, default: false },
    min: { type: [String, Number], default: undefined },
    max: { type: [String, Number], default: undefined },
    step: { type: [String, Number], default: undefined },
    autocomplete: { type: String, default: 'off' },
    inputmode: { type: String, default: '' },
    describedBy: { type: String, default: '' },
  },
  data() {
    return { focused: false, revealed: false, inputId: uid('ds-input') }
  },
  computed: {
    currentType() {
      if (this.type === 'password') return this.revealed ? 'text' : 'password'
      return this.type
    },
    visibleClear() {
      return (
        this.clearable && this.value !== '' && this.value !== null && !this.disabled && !this.readonly
      )
    },
    hasSuffix() {
      return !!(
        this.$slots.suffix ||
        this.type === 'password' ||
        (this.maxlength && this.showCount) ||
        this.visibleClear
      )
    },
    elSize() {
      return { sm: 'small', md: 'small', lg: 'medium' }[this.size] || 'small'
    },
    extraListeners() {
      const listeners = { ...this.$listeners }
      delete listeners.input
      delete listeners.change
      return listeners
    },
  },
  methods: {
    /** 透传 el-input 的 focus / blur / select */
    focus() {
      const el = this.$refs.elInput
      if (el && el.focus) el.focus()
    },
    blur() {
      const el = this.$refs.elInput
      if (el && el.blur) el.blur()
    },
    select() {
      const el = this.$refs.elInput
      if (el && el.select) el.select()
    },
    onInput(v) {
      this.$emit('input', v)
    },
    onChange(v) {
      this.$emit('change', v === undefined || v === null ? '' : String(v))
    },
    onFocus(e) {
      this.focused = true
      this.$emit('focus', e)
    },
    onBlur(e) {
      this.focused = false
      this.$emit('blur', e)
    },
    onEsc() {
      if (this.clearable) this.clear()
    },
    clear() {
      this.$emit('input', '')
      this.$emit('clear')
      this.focus()
    },
  },
}
</script>

<style scoped>
.ds-input {
  display: flex;
  align-items: center;
  gap: var(--ds-space-2);
  width: 100%;
  padding: 0 var(--ds-space-3);
  background: var(--ds-color-bg-elevated);
  border: 1px solid var(--ds-color-border-strong);
  border-radius: var(--ds-radius-md);
  transition: border-color var(--ds-motion-duration-fast) var(--ds-motion-ease-standard),
    box-shadow var(--ds-motion-duration-fast) var(--ds-motion-ease-standard),
    background-color var(--ds-motion-duration-fast) var(--ds-motion-ease-standard);
}
.ds-input:hover:not(.ds-input--disabled) {
  border-color: var(--ds-color-fg-subtle);
}
.ds-input--focused {
  border-color: var(--ds-color-brand);
  box-shadow: 0 0 0 3px var(--ds-color-brand-subtle);
}
.ds-input--error {
  border-color: var(--ds-color-danger);
}
.ds-input--error.ds-input--focused {
  box-shadow: 0 0 0 3px var(--ds-color-danger-subtle);
}
.ds-input--disabled {
  background: var(--ds-color-bg-disabled);
  color: var(--ds-color-fg-disabled);
}
.ds-input--readonly {
  background: var(--ds-color-bg-subtle);
}

.ds-input--sm {
  height: var(--ds-size-control-sm);
  font-size: var(--ds-font-size-xs);
}
.ds-input--md {
  height: var(--ds-size-control-md);
  font-size: var(--ds-font-size-sm);
}
.ds-input--lg {
  height: var(--ds-size-control-lg);
  font-size: var(--ds-font-size-md);
}

.ds-input__el {
  flex: 1;
  min-width: 0;
  width: 100%;
  height: 100%;
  padding: 0;
  border: 0;
  outline: none;
  background: transparent;
  color: var(--ds-color-fg);
  font-size: inherit;
}
.ds-input__el::placeholder {
  color: var(--ds-color-fg-subtle);
}
.ds-input__el:disabled {
  color: var(--ds-color-fg-disabled);
}

.ds-input__affix {
  display: inline-flex;
  align-items: center;
  gap: var(--ds-space-1);
  color: var(--ds-color-fg-subtle);
  flex: none;
}

.ds-input__clear,
.ds-input__toggle {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  padding: 0;
  border: 0;
  border-radius: 50%;
  background: var(--ds-color-bg-inset);
  color: var(--ds-color-fg-muted);
  transition: background-color var(--ds-motion-duration-fast) var(--ds-motion-ease-standard),
    color var(--ds-motion-duration-fast) var(--ds-motion-ease-standard);
}
.ds-input__clear:hover,
.ds-input__toggle:hover {
  background: var(--ds-color-bg-active);
  color: var(--ds-color-fg);
}

.ds-input__count {
  font-size: var(--ds-font-size-2xs);
  color: var(--ds-color-fg-subtle);
  font-variant-numeric: tabular-nums;
}

/* 移动端：放大触控区 + 16px 字号防 iOS 自动缩放 */
@media (max-width: 767px) {
  .ds-input--sm {
    height: 36px;
  }
  .ds-input--md {
    height: 42px;
    font-size: 16px;
  }
  .ds-input--lg {
    height: 48px;
    font-size: 16px;
  }
  .ds-input__clear,
  .ds-input__toggle {
    width: 28px;
    height: 28px;
  }
}
</style>

<style scoped>
/* ================= Element 适配 =================
   外层 .ds-input 保留我们自己的盒子（Token 化边框 / 圆角 / 前后缀），
   内层 el-input 只提供输入能力，所以要把 Element 自带的那层盒子去掉。 */
.ds-input__field {
  flex: 1 1 auto;
  min-width: 0;
}
.ds-input__field ::v-deep .el-input__inner {
  padding: 0;
  height: auto;
  line-height: inherit;
  font-size: inherit;
  color: inherit;
  background: transparent;
  border: 0;
  border-radius: 0;
  box-shadow: none;
}
.ds-input__field ::v-deep .el-input__inner:hover,
.ds-input__field ::v-deep .el-input__inner:focus {
  border-color: transparent;
  box-shadow: none;
}
.ds-input__field ::v-deep .el-input__prefix,
.ds-input__field ::v-deep .el-input__suffix,
.ds-input__field ::v-deep .el-input__icon {
  display: none;
}
</style>
