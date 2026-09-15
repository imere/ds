<template>
  <el-card
    class="ds-card"
    :class="[
      `ds-card--${variant}`,
      `ds-card--padding-${padding}`,
      {
        'ds-card--hoverable': hoverable,
        'ds-card--clickable': clickable,
        'ds-card--selected': selected,
        'ds-card--horizontal': horizontal,
      },
    ]"
    :shadow="elShadow"
    :body-style="bodyStyle"
  >
    <img v-if="media" :src="media" :alt="mediaAlt" class="ds-card__media" />

    <div v-if="title || subtitle || $slots.header" class="ds-card__header" slot="header">
      <slot name="header">
        <div class="ds-card__titles">
          <h3 v-if="title" class="ds-card__title">{{ title }}</h3>
          <p v-if="subtitle" class="ds-card__subtitle">{{ subtitle }}</p>
        </div>
      </slot>
    </div>

    <div class="ds-card__body">
      <slot />
    </div>

    <div v-if="$slots.footer" class="ds-card__footer">
      <slot name="footer" />
    </div>
  </el-card>
</template>

<script>
/**
 * DsCard —— 基于 el-card 的二次封装
 * @displayName 卡片 Card
 * 卡片容器与阴影交给 el-card，标题/媒体/页脚是我们补的结构化插槽。
 */
export default {
  name: 'DsCard',
  inheritAttrs: false,
  props: {
    title: { type: String, default: '' },
    subtitle: { type: String, default: '' },
    variant: { type: String, default: 'elevated', validator: (v) => ['elevated', 'outlined', 'subtle', 'ghost'].includes(v) },
    padding: { type: String, default: 'md', validator: (v) => ['none', 'sm', 'md', 'lg'].includes(v) },
    media: { type: String, default: '' },
    mediaAlt: { type: String, default: '' },
    hoverable: { type: Boolean, default: false },
    clickable: { type: Boolean, default: false },
    selected: { type: Boolean, default: false },
    horizontal: { type: Boolean, default: false },
  },
  computed: {
    elShadow() {
      return this.variant === 'elevated' ? 'always' : 'never'
    },
    bodyStyle() {
      const map = { none: '0px', sm: 'var(--ds-space-3)', md: 'var(--ds-space-4)', lg: 'var(--ds-space-6)' }
      return { padding: map[this.padding] || map.md }
    },
  },
}
</script>

<style scoped>
.ds-card {
  display: flex;
  flex-direction: column;
  border-radius: var(--ds-radius-lg);
  background: var(--ds-color-bg-elevated);
  transition: box-shadow var(--ds-motion-duration-base) var(--ds-motion-ease-standard),
    border-color var(--ds-motion-duration-base) var(--ds-motion-ease-standard),
    transform var(--ds-motion-duration-base) var(--ds-motion-ease-standard);
}

.ds-card--elevated {
  border: 1px solid var(--ds-color-border);
  box-shadow: var(--ds-shadow-md);
}
.ds-card--outlined {
  border: 1px solid var(--ds-color-border-strong);
  background: transparent;
}
.ds-card--subtle {
  border: 1px solid var(--ds-color-border-subtle);
  background: var(--ds-color-bg-subtle);
}
.ds-card--ghost {
  border: 1px solid transparent;
  background: transparent;
}

.ds-card--pad-none {
  padding: 0;
}
.ds-card--pad-sm > * {
  padding-left: var(--ds-space-3);
  padding-right: var(--ds-space-3);
}
.ds-card--pad-md > * {
  padding-left: var(--ds-space-5);
  padding-right: var(--ds-space-5);
}
.ds-card--pad-lg > * {
  padding-left: var(--ds-space-6);
  padding-right: var(--ds-space-6);
}
.ds-card--pad-sm > .ds-card__media {
  padding: 0;
}
.ds-card--pad-md > .ds-card__media,
.ds-card--pad-lg > .ds-card__media {
  padding: 0;
}

.ds-card--hoverable:hover {
  box-shadow: var(--ds-shadow-lg);
  transform: translateY(-2px);
}
.ds-card--clickable {
  cursor: pointer;
}
.ds-card--clickable:focus-visible {
  outline: 2px solid var(--ds-color-focus);
  outline-offset: 2px;
}
.ds-card--selected {
  border-color: var(--ds-color-brand);
  box-shadow: 0 0 0 1px var(--ds-color-brand);
}

.ds-card__media {
  overflow: hidden;
  border-radius: var(--ds-radius-lg) var(--ds-radius-lg) 0 0;
  background: var(--ds-color-bg-subtle);
}
.ds-card__media img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.ds-card__header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--ds-space-3);
  padding-top: var(--ds-space-5);
  padding-bottom: var(--ds-space-3);
}
.ds-card--pad-sm > .ds-card__header {
  padding-top: var(--ds-space-3);
}

.ds-card__heading {
  min-width: 0;
}
.ds-card__title {
  font-size: var(--ds-font-size-lg);
  font-weight: var(--ds-font-weight-semibold);
}
.ds-card__subtitle {
  margin-top: 2px;
  font-size: var(--ds-font-size-sm);
  color: var(--ds-color-fg-muted);
}

.ds-card__actions {
  display: flex;
  align-items: center;
  gap: var(--ds-space-2);
  flex: none;
}

.ds-card__body {
  flex: 1;
  padding-bottom: var(--ds-space-5);
  color: var(--ds-color-fg-muted);
  min-width: 0;
}
.ds-card--pad-sm > .ds-card__body {
  padding-bottom: var(--ds-space-3);
}

.ds-card__footer {
  display: flex;
  align-items: center;
  gap: var(--ds-space-2);
  padding-top: var(--ds-space-3);
  padding-bottom: var(--ds-space-4);
  border-top: 1px solid var(--ds-color-border-subtle);
}

/* 响应式：≥768px 横向排列，小屏自动上下堆叠 */
@media (min-width: 768px) {
  .ds-card--horizontal {
    flex-direction: row;
    align-items: stretch;
  }
  .ds-card--horizontal > .ds-card__media {
    flex: 0 0 200px;
    border-radius: var(--ds-radius-lg) 0 0 var(--ds-radius-lg);
  }
  .ds-card--horizontal > .ds-card__header,
  .ds-card--horizontal > .ds-card__body,
  .ds-card--horizontal > .ds-card__footer {
    border-radius: 0;
  }
  .ds-card--horizontal > .ds-card__footer {
    border-top: 0;
    border-left: 1px solid var(--ds-color-border-subtle);
    align-items: center;
  }
}
</style>
