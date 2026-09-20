<template>
  <span class="ds-avatar" :class="[`ds-avatar--${size}`, { 'ds-avatar--online': online }]">
    <el-avatar
      :size="pxSize"
      :shape="shape"
      :src="currentSrc"
      :fit="'cover'"
      :style="avatarStyle"
      @error="onError"
    >
      <slot>{{ initials }}</slot>
    </el-avatar>
    <span v-if="online" class="ds-avatar__dot" aria-label="在线" />
  </span>
</template>

<script>
/**
 * DsAvatar —— 基于 el-avatar 的二次封装
 * @displayName 头像 Avatar
 * 图片加载失败时 el-avatar 会派发 error，这里降级为「姓名首字」。
 */
export default {
  name: 'DsAvatar',
  inheritAttrs: false,
  props: {
    src: { type: String, default: '' },
    name: { type: String, default: '' },
    size: { type: String, default: 'md', validator: (v) => ['xs', 'sm', 'md', 'lg', 'xl'].includes(v) },
    shape: { type: String, default: 'circle', validator: (v) => ['circle', 'square'].includes(v) },
    color: { type: String, default: '' },
    online: { type: Boolean, default: false },
  },
  data() {
    return { failed: false }
  },
  computed: {
    pxSize() {
      return { xs: 24, sm: 32, md: 40, lg: 56, xl: 72 }[this.size] || 40
    },
    currentSrc() {
      return this.failed ? '' : this.src
    },
    initials() {
      const name = (this.name || '').trim()
      if (!name) return ''
      // 中文取最后一个字，英文取首字母
      return /[一-龥]/.test(name) ? name.slice(-1) : name.slice(0, 1).toUpperCase()
    },
    avatarStyle() {
      if (!this.color) return null
      return { background: this.color, color: 'var(--ds-color-fg-on-brand)' }
    },
  },
  watch: {
    src() {
      this.failed = false
    },
  },
  methods: {
    onError() {
      this.failed = true
      this.$emit('error')
    },
  },
}
</script>

<style scoped>
.ds-avatar {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex: none;
  overflow: visible;
  background: var(--ds-color-brand-subtle);
  color: var(--ds-color-brand-fg);
  font-weight: var(--ds-font-weight-semibold);
  user-select: none;
}
.ds-avatar--circle {
  border-radius: 50%;
}
.ds-avatar--square {
  border-radius: var(--ds-radius-md);
}

.ds-avatar--xs {
  width: 22px;
  height: 22px;
  font-size: 10px;
}
.ds-avatar--sm {
  width: 28px;
  height: 28px;
  font-size: var(--ds-font-size-2xs);
}
.ds-avatar--md {
  width: 36px;
  height: 36px;
  font-size: var(--ds-font-size-sm);
}
.ds-avatar--lg {
  width: 48px;
  height: 48px;
  font-size: var(--ds-font-size-lg);
}
.ds-avatar--xl {
  width: 72px;
  height: 72px;
  font-size: var(--ds-font-size-2xl);
}

.ds-avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  border-radius: inherit;
}

.ds-avatar__status {
  position: absolute;
  right: 0;
  bottom: 0;
  width: 28%;
  height: 28%;
  min-width: 8px;
  min-height: 8px;
  border-radius: 50%;
  background: var(--ds-color-success);
  border: 2px solid var(--ds-color-bg-elevated);
}
</style>
