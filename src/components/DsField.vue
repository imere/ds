<template>
  <el-form
    class="ds-field__form"
    :model="formModel"
    :rules="formRules"
    label-position="top"
    @submit.native.prevent
  >
    <el-form-item
      class="ds-field"
      :class="[
        `ds-field--${size}`,
        {
          'ds-field--required': required,
          'ds-field--disabled': disabled,
          'ds-field--error': !!error,
        },
      ]"
      :label="label"
      :label-width="label ? undefined : '0px'"
      :prop="prop"
      :required="required"
      :error="error"
      :size="elSize"
    >
      <template v-if="$slots.label" slot="label">
        <slot name="label" />
      </template>

      <slot />

      <p v-if="hint && !error" class="ds-field__hint" :id="hintId">{{ hint }}</p>
    </el-form-item>
  </el-form>
</template>

<script>
import uid from '@/utils/uid'

/**
 * DsField —— 基于 el-form-item 的表单字段容器
 * @displayName 表单字段 Field
 * 校验态、必填标记、错误文案交给 el-form-item；hint 是我们补的说明文案。
 *
 * 注意：el-form-item 的 `form` 计算属性会一路向上找 componentName === 'ElForm'，
 * 找不到就会读到 undefined 而抛错（element-ui 2.15 这里没有兜底）。
 * 所以外层恒包一层 el-form：若业务已在更外层放了 el-form，就把它的 model/rules
 * 透传下来，保证校验语义不被这层壳子截断。
 */
export default {
  name: 'DsField',
  inheritAttrs: false,
  props: {
    label: { type: String, default: '' },
    labelFor: { type: String, default: '' },
    hint: { type: String, default: '' },
    error: { type: String, default: '' },
    required: { type: Boolean, default: false },
    disabled: { type: Boolean, default: false },
    size: { type: String, default: 'md', validator: (v) => ['sm', 'md', 'lg'].includes(v) },
    prop: { type: String, default: '' },
  },
  data() {
    return { hintId: uid('ds-hint'), formModel: {}, formRules: {} }
  },
  created() {
    const outer = this.findElForm()
    if (outer) {
      this.formModel = outer.model || {}
      this.formRules = outer.rules || {}
    }
  },
  computed: {
    elSize() {
      return { sm: 'small', md: 'small', lg: 'medium' }[this.size] || 'small'
    },
  },
  methods: {
    findElForm() {
      let parent = this.$parent
      while (parent) {
        if (parent.$options && parent.$options.componentName === 'ElForm') return parent
        parent = parent.$parent
      }
      return null
    },
  },
}
</script>

<style scoped>
.ds-field {
  display: flex;
  flex-direction: column;
  gap: var(--ds-space-2);
  width: 100%;
  min-width: 0;
}

.ds-field__label {
  display: flex;
  align-items: center;
  gap: 2px;
  font-size: var(--ds-font-size-sm);
  font-weight: var(--ds-font-weight-medium);
  color: var(--ds-color-fg);
}
.ds-field--sm .ds-field__label {
  font-size: var(--ds-font-size-xs);
}
.ds-field__required {
  color: var(--ds-color-danger);
}

.ds-field__control {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.ds-field__footer {
  font-size: var(--ds-font-size-xs);
  line-height: 1.4;
}
.ds-field__hint {
  color: var(--ds-color-fg-muted);
}
.ds-field__error {
  display: flex;
  align-items: center;
  gap: var(--ds-space-1);
  color: var(--ds-color-danger-fg);
}

.ds-field--disabled {
  opacity: 0.6;
}
</style>

<style scoped>
/* ================= Element 适配 ================= */
.ds-field__form {
  /* el-form 默认会带一段 margin，这里只是给 el-form-item 当壳子 */
  margin: 0;
}
.ds-field ::v-deep .el-form-item__label {
  font-size: var(--ds-font-size-sm);
  color: var(--ds-color-fg-muted);
  padding-bottom: var(--ds-space-1);
}
.ds-field ::v-deep .el-form-item__content {
  line-height: var(--ds-line-height-normal);
}
.ds-field__hint {
  margin: var(--ds-space-1) 0 0;
  font-size: var(--ds-font-size-xs);
  color: var(--ds-color-fg-subtle);
}
</style>
