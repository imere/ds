<template>
  <div
    class="ds-select"
    :class="[
      `ds-select--${size}`,
      {
        'ds-select--error': !!error,
        'ds-select--disabled': disabled,
        'ds-select--open': open,
        'ds-select--sheet': sheetOnMobile && isMobile,
      },
    ]"
  >
    <el-select
      ref="elSelect"
      class="ds-select__field"
      :value="value"
      :size="elSize"
      :placeholder="placeholder"
      :disabled="disabled"
      :clearable="clearable"
      :filterable="searchable"
      :multiple="multiple"
      :multiple-limit="multipleLimit"
      :collapse-tags="collapseTags"
      :loading="loading"
      :loading-text="loadingText"
      :no-match-text="noMatchText"
      :no-data-text="noDataText"
      :allow-create="allowCreate"
      :default-first-option="defaultFirstOption"
      :reserve-keyword="reserveKeyword"
      :popper-class="popperClass"
      :aria-invalid="error ? 'true' : null"
      v-bind="$attrs"
      @input="onInput"
      @change="onChange"
      @clear="onClear"
      @visible-change="onVisibleChange"
      @focus="$emit('focus', $event)"
      @blur="$emit('blur', $event)"
      v-on="extraListeners"
    >
      <template v-if="prefix" slot="prefix">
        <DsIcon :name="prefix" size="sm" />
      </template>
      <el-option
        v-for="opt in normalizedOptions"
        :key="String(opt.value)"
        :label="opt.label"
        :value="opt.value"
        :disabled="opt.disabled"
      >
        <slot name="option" :option="opt">{{ opt.label }}</slot>
      </el-option>
      <slot />
    </el-select>

    <p v-if="error" class="ds-select__error">{{ error }}</p>
  </div>
</template>

<script>
import DsIcon from './DsIcon.vue'

/**
 * DsSelect —— 基于 el-select 的二次封装
 * @displayName 下拉选择 Select
 *
 * 下拉面板、键盘导航、过滤、多选折叠等交互全部由 el-select 提供，
 * 我们只负责：options 简写、错误态、移动端标记，以及对外保持 value/input 语义。
 */
export default {
  name: 'DsSelect',
  components: { DsIcon },
  inheritAttrs: false,
  props: {
    value: { type: [String, Number, Boolean, Object, Array], default: '' },
    options: { type: Array, default: () => [] },
    size: { type: String, default: 'md', validator: (v) => ['sm', 'md', 'lg'].includes(v) },
    placeholder: { type: String, default: '请选择' },
    disabled: { type: Boolean, default: false },
    clearable: { type: Boolean, default: false },
    searchable: { type: Boolean, default: false },
    error: { type: String, default: '' },
    prefix: { type: String, default: '' },
    /** 移动端（<768px）是否使用底部弹层样式 */
    sheetOnMobile: { type: Boolean, default: true },
    multiple: { type: Boolean, default: false },
    multipleLimit: { type: Number, default: 0 },
    collapseTags: { type: Boolean, default: false },
    loading: { type: Boolean, default: false },
    loadingText: { type: String, default: '加载中' },
    noMatchText: { type: String, default: '无匹配数据' },
    noDataText: { type: String, default: '暂无数据' },
    allowCreate: { type: Boolean, default: false },
    defaultFirstOption: { type: Boolean, default: false },
    reserveKeyword: { type: Boolean, default: false },
    popperClass: { type: String, default: '' },
  },
  data() {
    return { open: false }
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
    isMobile() {
      return typeof window !== 'undefined' && window.innerWidth < 768
    },
    extraListeners() {
      const listeners = { ...this.$listeners }
      delete listeners.input
      delete listeners.change
      return listeners
    },
  },
  mounted() {
    this.syncAria()
  },
  updated() {
    this.syncAria()
  },
  methods: {
    /**
     * el-select 不像 el-input 那样把 $attrs 透传到内部 input，
     * 所以校验态的属性在这里补写。
     */
    syncAria() {
      const el = this.$el && this.$el.querySelector('input')
      if (!el) return
      if (this.error) el.setAttribute('aria-invalid', 'true')
      else el.removeAttribute('aria-invalid')
    },
    /** 当前展开状态（由 el-select 的 visible-change 同步） */
    onVisibleChange(v) {
      this.open = v
      this.$emit('visible-change', v)
    },
    onInput(v) {
      this.$emit('input', v)
    },
    onChange(v) {
      this.$emit('change', v)
    },
    onClear() {
      this.$emit('clear')
    },
    focus() {
      const el = this.$refs.elSelect
      if (el && el.focus) el.focus()
    },
    blur() {
      const el = this.$refs.elSelect
      if (el && el.blur) el.blur()
    },
  },
}
</script>

<style scoped>
.ds-select {
  position: relative;
  width: 100%;
}

.ds-select__trigger {
  display: flex;
  align-items: center;
  gap: var(--ds-space-2);
  width: 100%;
  padding: 0 var(--ds-space-3);
  text-align: left;
  background: var(--ds-color-bg-elevated);
  border: 1px solid var(--ds-color-border-strong);
  border-radius: var(--ds-radius-md);
  color: var(--ds-color-fg);
  transition: border-color var(--ds-motion-duration-fast) var(--ds-motion-ease-standard),
    box-shadow var(--ds-motion-duration-fast) var(--ds-motion-ease-standard);
}
.ds-select__trigger:hover:not(:disabled) {
  border-color: var(--ds-color-fg-subtle);
}
.ds-select--open .ds-select__trigger {
  border-color: var(--ds-color-brand);
  box-shadow: 0 0 0 3px var(--ds-color-brand-subtle);
}
.ds-select--error .ds-select__trigger {
  border-color: var(--ds-color-danger);
}
.ds-select--disabled .ds-select__trigger {
  background: var(--ds-color-bg-disabled);
  color: var(--ds-color-fg-disabled);
}

.ds-select--sm .ds-select__trigger {
  height: var(--ds-size-control-sm);
  font-size: var(--ds-font-size-xs);
}
.ds-select--md .ds-select__trigger {
  height: var(--ds-size-control-md);
  font-size: var(--ds-font-size-sm);
}
.ds-select--lg .ds-select__trigger {
  height: var(--ds-size-control-lg);
  font-size: var(--ds-font-size-md);
}

.ds-select__prefix {
  display: inline-flex;
  color: var(--ds-color-fg-subtle);
  flex: none;
}
.ds-select__value {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.ds-select__value--placeholder {
  color: var(--ds-color-fg-subtle);
}
.ds-select__arrow {
  flex: none;
  color: var(--ds-color-fg-subtle);
  transition: transform var(--ds-motion-duration-fast) var(--ds-motion-ease-standard);
}
.ds-select--open .ds-select__arrow {
  transform: rotate(180deg);
}
.ds-select__clear {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: var(--ds-color-bg-inset);
  color: var(--ds-color-fg-muted);
  flex: none;
}
.ds-select__clear:hover {
  background: var(--ds-color-bg-active);
}

.ds-select__panel {
  position: absolute;
  z-index: var(--ds-z-dropdown);
  top: calc(100% + 4px);
  left: 0;
  right: 0;
  max-height: 300px;
  overflow: auto;
  padding: var(--ds-space-1);
  background: var(--ds-color-bg-elevated);
  border: 1px solid var(--ds-color-border);
  border-radius: var(--ds-radius-lg);
  box-shadow: var(--ds-shadow-lg);
}
.ds-select__search {
  padding: var(--ds-space-1);
  border-bottom: 1px solid var(--ds-color-border-subtle);
  margin-bottom: var(--ds-space-1);
}

.ds-select__option {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--ds-space-2);
  padding: var(--ds-space-2) var(--ds-space-3);
  border-radius: var(--ds-radius-sm);
  font-size: var(--ds-font-size-sm);
  color: var(--ds-color-fg-muted);
  cursor: pointer;
  transition: background-color var(--ds-motion-duration-fast) var(--ds-motion-ease-standard);
}
.ds-select__option--active {
  background: var(--ds-color-bg-hover);
  color: var(--ds-color-fg);
}
.ds-select__option--selected {
  color: var(--ds-color-brand-fg);
  font-weight: var(--ds-font-weight-medium);
}
.ds-select__option--disabled {
  opacity: 0.45;
  pointer-events: none;
}
.ds-select__option-label {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.ds-select__empty {
  padding: var(--ds-space-2);
}

.ds-select-pop-enter-active,
.ds-select-pop-leave-active {
  transition: opacity var(--ds-motion-duration-fast) var(--ds-motion-ease-standard),
    transform var(--ds-motion-duration-fast) var(--ds-motion-ease-standard);
}
.ds-select-pop-enter,
.ds-select-pop-leave-to {
  opacity: 0;
  transform: translateY(-4px);
}

/* 移动端：下拉变成贴近底部的弹层，选项加大便于点按 */
@media (max-width: 767px) {
  .ds-select--md .ds-select__trigger {
    height: 42px;
    font-size: 16px;
  }
  .ds-select--lg .ds-select__trigger {
    height: 48px;
  }
  .ds-select__panel--sheet {
    position: fixed;
    top: auto;
    left: 8px;
    right: 8px;
    bottom: 8px;
    max-height: 60vh;
    border-radius: var(--ds-radius-xl);
    box-shadow: var(--ds-shadow-xl);
  }
  .ds-select__panel--sheet .ds-select__option {
    padding: var(--ds-space-3);
    font-size: var(--ds-font-size-md);
  }
}
</style>

<style scoped>
/* ================= Element 适配 =================
   选择器没有自定义前后缀，整个盒子交给 el-select / el-input 呈现，
   这里把 .ds-select 还原成纯容器。 */
.ds-select {
  display: block;
  width: 100%;
  padding: 0;
  background: transparent;
  border: 0;
  box-shadow: none;
}
.ds-select__field {
  width: 100%;
}
.ds-select__error {
  margin: var(--ds-space-1) 0 0;
  color: var(--ds-color-danger-fg);
  font-size: var(--ds-font-size-xs);
}
.ds-select--error ::v-deep .el-input__inner {
  border-color: var(--ds-color-danger);
}
</style>
