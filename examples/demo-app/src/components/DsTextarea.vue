<template>
  <div
    class="ds-textarea"
    :class="[
      `ds-textarea--${size}`,
      {
        'ds-textarea--error': !!error,
        'ds-textarea--disabled': disabled,
        'ds-textarea--readonly': readonly,
        'ds-textarea--focused': focused,
      },
    ]"
  >
    <el-input
      ref="elInput"
      class="ds-textarea__field"
      type="textarea"
      :value="value"
      :rows="Number(rows)"
      :placeholder="placeholder"
      :disabled="disabled"
      :readonly="readonly"
      :maxlength="maxlength || null"
      :show-word-limit="showCount && !!maxlength"
      :resize="resizable ? 'vertical' : 'none'"
      :autosize="false"
      :aria-invalid="error ? 'true' : null"
      v-bind="$attrs"
      @input="onInput"
      @change="onChange"
      @focus="onFocus"
      @blur="onBlur"
      v-on="extraListeners"
    />
    <p v-if="error" class="ds-textarea__error">{{ error }}</p>
  </div>
</template>

<script>
/**
 * DsTextarea —— el-input(type=textarea) 的二次封装
 * @displayName 多行输入 Textarea
 */
export default {
  name: 'DsTextarea',
  inheritAttrs: false,
  props: {
    value: { type: [String, Number], default: '' },
    size: { type: String, default: 'md', validator: (v) => ['sm', 'md', 'lg'].includes(v) },
    rows: { type: [String, Number], default: 3 },
    placeholder: { type: String, default: '' },
    disabled: { type: Boolean, default: false },
    readonly: { type: Boolean, default: false },
    resizable: { type: Boolean, default: true },
    error: { type: String, default: '' },
    maxlength: { type: [String, Number], default: '' },
    showCount: { type: Boolean, default: false },
  },
  data() {
    return { focused: false }
  },
  computed: {
    extraListeners() {
      const listeners = { ...this.$listeners }
      delete listeners.input
      delete listeners.change
      return listeners
    },
  },
  methods: {
    focus() {
      const el = this.$refs.elInput
      if (el && el.focus) el.focus()
    },
    blur() {
      const el = this.$refs.elInput
      if (el && el.blur) el.blur()
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
  },
}
</script>

<style scoped>
.ds-textarea {
  position: relative;
  display: flex;
  flex-direction: column;
  background: var(--ds-color-bg-elevated);
  border: 1px solid var(--ds-color-border-strong);
  border-radius: var(--ds-radius-md);
  transition: border-color var(--ds-motion-duration-fast) var(--ds-motion-ease-standard),
    box-shadow var(--ds-motion-duration-fast) var(--ds-motion-ease-standard);
}
.ds-textarea:hover:not(.ds-textarea--disabled) {
  border-color: var(--ds-color-fg-subtle);
}
.ds-textarea--focused {
  border-color: var(--ds-color-brand);
  box-shadow: 0 0 0 3px var(--ds-color-brand-subtle);
}
.ds-textarea--error {
  border-color: var(--ds-color-danger);
}
.ds-textarea--disabled {
  background: var(--ds-color-bg-disabled);
}

.ds-textarea__el {
  width: 100%;
  min-height: 64px;
  padding: var(--ds-space-2) var(--ds-space-3);
  border: 0;
  outline: none;
  background: transparent;
  color: var(--ds-color-fg);
  font-size: var(--ds-font-size-sm);
  line-height: var(--ds-line-height-normal);
  resize: vertical;
}
.ds-textarea--no-resize .ds-textarea__el {
  resize: none;
}
.ds-textarea--sm .ds-textarea__el {
  font-size: var(--ds-font-size-xs);
}
.ds-textarea--lg .ds-textarea__el {
  font-size: var(--ds-font-size-md);
}
.ds-textarea__el::placeholder {
  color: var(--ds-color-fg-subtle);
}

.ds-textarea__count {
  align-self: flex-end;
  padding: 0 var(--ds-space-3) var(--ds-space-1);
  font-size: var(--ds-font-size-2xs);
  color: var(--ds-color-fg-subtle);
  font-variant-numeric: tabular-nums;
}

@media (max-width: 767px) {
  .ds-textarea--md .ds-textarea__el {
    font-size: 16px;
  }
}
</style>

<style scoped>
/* ================= Element 适配 ================= */
.ds-textarea__field {
  width: 100%;
}
.ds-textarea__field ::v-deep .el-textarea__inner {
  font-family: var(--ds-font-family-sans);
  font-size: var(--ds-font-size-sm);
}
</style>
