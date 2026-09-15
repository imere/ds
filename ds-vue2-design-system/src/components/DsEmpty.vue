<template>
  <el-empty class="ds-empty" :class="[`ds-empty--${size}`]" :image-size="imageSize" :description="''">
    <template slot="image">
      <slot name="icon">
        <DsIcon :name="icon" :size="iconSize" class="ds-empty__icon" />
      </slot>
    </template>

    <template slot="description">
      <p v-if="title" class="ds-empty__title">{{ title }}</p>
      <p v-if="description" class="ds-empty__description">{{ description }}</p>
    </template>

    <template slot="bottom">
      <div v-if="$slots.default" class="ds-empty__actions">
        <slot />
      </div>
    </template>
  </el-empty>
</template>

<script>
import DsIcon from './DsIcon.vue'

/**
 * DsEmpty —— 基于 el-empty 的二次封装
 * @displayName 空状态 Empty
 * 图标位换成我们自己的 DsIcon，文案拆成 title + description。
 */
export default {
  name: 'DsEmpty',
  components: { DsIcon },
  inheritAttrs: false,
  props: {
    icon: { type: String, default: 'inbox' },
    title: { type: String, default: '暂无数据' },
    description: { type: String, default: '' },
    size: { type: String, default: 'md', validator: (v) => ['sm', 'md', 'lg'].includes(v) },
  },
  computed: {
    imageSize() {
      return { sm: 48, md: 72, lg: 96 }[this.size] || 72
    },
    iconSize() {
      return { sm: 'lg', md: 'xl', lg: '2xl' }[this.size] || 'xl'
    },
  },
}
</script>

<style scoped>
.ds-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  gap: var(--ds-space-3);
  width: 100%;
  color: var(--ds-color-fg-subtle);
}
.ds-empty--sm {
  padding: var(--ds-space-4);
}
.ds-empty--md {
  padding: var(--ds-space-7) var(--ds-space-4);
}
.ds-empty--lg {
  padding: var(--ds-space-10) var(--ds-space-4);
}

.ds-empty__glyph {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 56px;
  height: 56px;
  border-radius: var(--ds-radius-full);
  background: var(--ds-color-bg-subtle);
  border: 1px solid var(--ds-color-border-subtle);
  color: var(--ds-color-fg-subtle);
}
.ds-empty--sm .ds-empty__glyph {
  width: 44px;
  height: 44px;
}
.ds-empty--lg .ds-empty__glyph {
  width: 72px;
  height: 72px;
}

.ds-empty__title {
  font-size: var(--ds-font-size-lg);
  font-weight: var(--ds-font-weight-semibold);
  color: var(--ds-color-fg);
}
.ds-empty__desc {
  max-width: 42ch;
  font-size: var(--ds-font-size-sm);
  color: var(--ds-color-fg-muted);
}
.ds-empty__action {
  margin-top: var(--ds-space-2);
}
</style>
