<template>
  <el-tag
    class="ds-tag"
    :class="[`ds-tag--${tone}`, `ds-tag--${size}`]"
    :type="elType"
    :size="elSize"
    :effect="effect"
    :closable="closable"
    :disable-transitions="false"
    @close="$emit('close')"
    @click="$emit('click', $event)"
  >
    <DsIcon v-if="icon" :name="icon" size="xs" class="ds-tag__icon" />
    <slot />
  </el-tag>
</template>

<script>
import DsIcon from './DsIcon.vue'

/**
 * DsTag —— 基于 el-tag 的二次封装
 * @displayName 标签 Tag
 */
export default {
  name: 'DsTag',
  components: { DsIcon },
  inheritAttrs: false,
  props: {
    tone: {
      type: String,
      default: 'neutral',
      validator: (v) => ['neutral', 'brand', 'success', 'warning', 'danger', 'info'].includes(v),
    },
    size: { type: String, default: 'md', validator: (v) => ['sm', 'md'].includes(v) },
    closable: { type: Boolean, default: false },
    icon: { type: String, default: '' },
    closeLabel: { type: String, default: '' },
    effect: { type: String, default: 'light' },
  },
  computed: {
    elType() {
      return { neutral: 'info', brand: 'primary' }[this.tone] || this.tone
    },
    elSize() {
      return this.size === 'sm' ? 'small' : 'small'
    },
  },
}
</script>

<style scoped>
.ds-tag {
  display: inline-flex;
  align-items: center;
  gap: var(--ds-space-1);
  border: 1px solid var(--ds-color-border);
  border-radius: var(--ds-radius-full);
  background: var(--ds-color-bg-subtle);
  color: var(--ds-color-fg-muted);
  max-width: 100%;
}
.ds-tag--sm {
  padding: 1px var(--ds-space-2);
  font-size: var(--ds-font-size-2xs);
}
.ds-tag--md {
  padding: 3px var(--ds-space-3);
  font-size: var(--ds-font-size-xs);
}

.ds-tag--brand {
  background: var(--ds-color-brand-subtle);
  border-color: var(--ds-color-brand-border);
  color: var(--ds-color-brand-fg);
}
.ds-tag--success {
  background: var(--ds-color-success-subtle);
  border-color: transparent;
  color: var(--ds-color-success-fg);
}
.ds-tag--warning {
  background: var(--ds-color-warning-subtle);
  border-color: transparent;
  color: var(--ds-color-warning-fg);
}
.ds-tag--danger {
  background: var(--ds-color-danger-subtle);
  border-color: transparent;
  color: var(--ds-color-danger-fg);
}
.ds-tag--info {
  background: var(--ds-color-info-subtle);
  border-color: transparent;
  color: var(--ds-color-info-fg);
}

.ds-tag__text {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.ds-tag__close {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 16px;
  height: 16px;
  margin-right: -4px;
  padding: 0;
  border: 0;
  border-radius: 50%;
  background: transparent;
  color: inherit;
  opacity: 0.6;
  transition: opacity var(--ds-motion-duration-fast) var(--ds-motion-ease-standard),
    background-color var(--ds-motion-duration-fast) var(--ds-motion-ease-standard);
}
.ds-tag__close:hover {
  opacity: 1;
  background: var(--ds-color-bg-active);
}
</style>
