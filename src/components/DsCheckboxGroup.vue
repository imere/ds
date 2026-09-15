<template>
  <el-checkbox-group
    class="ds-checkbox-group"
    :class="[
      `ds-checkbox-group--${size}`,
      {
        'ds-checkbox-group--vertical': vertical,
        'ds-checkbox-group--disabled': disabled,
      },
    ]"
    :value="value"
    :disabled="disabled"
    :size="elSize"
    @input="onInput"
  >
    <el-checkbox
      v-for="opt in normalizedOptions"
      :key="String(opt.value)"
      :label="opt.value"
      :disabled="disabled || opt.disabled"
    >
      {{ opt.label }}
    </el-checkbox>
    <slot />
  </el-checkbox-group>
</template>

<script>
/**
 * DsCheckboxGroup —— 基于 el-checkbox-group 的二次封装
 * @displayName 复选框组 CheckboxGroup
 * 对外保持 options / value / input 的简洁用法，内部交给 Element 处理联动。
 */
export default {
  name: 'DsCheckboxGroup',
  inheritAttrs: false,
  props: {
    value: { type: Array, default: () => [] },
    options: { type: Array, default: () => [] },
    size: { type: String, default: 'md' },
    vertical: { type: Boolean, default: false },
    disabled: { type: Boolean, default: false },
  },
  computed: {
    normalizedOptions() {
      return this.options.map((opt) =>
        typeof opt === 'object' && opt !== null
          ? opt
          : { label: String(opt), value: opt }
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
.ds-checkbox-group {
  display: flex;
  flex-wrap: wrap;
  gap: var(--ds-space-3) var(--ds-space-5);
}
.ds-checkbox-group--vertical {
  flex-direction: column;
  gap: var(--ds-space-3);
}
</style>

<style scoped>
/* ================= Element 适配 ================= */
.ds-checkbox-group {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--ds-space-2) var(--ds-space-4);
}
.ds-checkbox-group--vertical {
  flex-direction: column;
  align-items: flex-start;
}
@media (max-width: 767px) {
  .ds-checkbox-group ::v-deep .el-checkbox {
    min-height: 44px;
  }
}
</style>
