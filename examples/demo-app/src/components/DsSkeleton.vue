<template>
  <div
    class="ds-skeleton"
    :class="[`ds-skeleton--${variant}`, { 'ds-skeleton--animated': animated }]"
    :style="rootStyle"
    aria-hidden="true"
  >
    <template v-if="variant === 'text' && lines > 1">
      <el-skeleton :animated="animated" :rows="lines" :loading="true" class="ds-skeleton__el" />
    </template>

    <template v-else-if="variant === 'card'">
      <el-skeleton :animated="animated" :loading="true" class="ds-skeleton__el">
        <template slot="template">
          <el-skeleton-item variant="image" :style="{ width: '100%', height: '120px' }" />
          <div class="ds-skeleton__lines">
            <el-skeleton-item variant="p" :style="{ width: '60%' }" />
            <el-skeleton-item variant="text" />
          </div>
        </template>
      </el-skeleton>
    </template>

    <template v-else>
      <el-skeleton-item
        v-for="n in repeat"
        :key="n"
        :variant="elVariant"
        :style="itemStyle"
        class="ds-skeleton__item"
      />
    </template>
  </div>
</template>

<script>
/**
 * DsSkeleton —— 基于 el-skeleton / el-skeleton-item 的二次封装
 * @displayName 骨架屏 Skeleton
 */
export default {
  name: 'DsSkeleton',
  inheritAttrs: false,
  props: {
    active: { type: Boolean, default: true },
    variant: { type: String, default: 'text', validator: (v) => ['text', 'rect', 'circle', 'card'].includes(v) },
    width: { type: [String, Number], default: '' },
    height: { type: [String, Number], default: '' },
    lines: { type: Number, default: 1 },
    animated: { type: Boolean, default: true },
  },
  computed: {
    elVariant() {
      return { text: 'text', rect: 'rect', circle: 'circle', card: 'image' }[this.variant] || 'text'
    },
    repeat() {
      return Math.max(1, this.lines || 1)
    },
    rootStyle() {
      const style = {}
      if (this.width) style.width = this.normalize(this.width)
      if (this.variant === 'circle') {
        style.width = style.width || '40px'
        style.height = style.width
      }
      return style
    },
    itemStyle() {
      const style = {}
      if (this.width) style.width = this.normalize(this.width)
      if (this.height) style.height = this.normalize(this.height)
      if (this.variant === 'circle' && !this.height) style.height = style.width || '40px'
      return style
    },
  },
  methods: {
    normalize(v) {
      return typeof v === 'number' ? `${v}px` : v
    },
  },
}
</script>

<style scoped>
.ds-skeleton {
  display: block;
  background: var(--ds-color-skeleton);
  border-radius: var(--ds-radius-sm);
}

.ds-skeleton--text {
  height: 1em;
  width: 100%;
  margin-bottom: 0.5em;
  border-radius: var(--ds-radius-sm);
}
.ds-skeleton--rect {
  width: 100%;
  height: 80px;
  border-radius: var(--ds-radius-md);
}
.ds-skeleton--circle {
  width: 40px;
  height: 40px;
  border-radius: 50%;
}
.ds-skeleton--card {
  width: 100%;
  height: 160px;
  border-radius: var(--ds-radius-lg);
}

.ds-skeleton--animated {
  position: relative;
  overflow: hidden;
}
.ds-skeleton--animated::after {
  content: '';
  position: absolute;
  inset: 0;
  transform: translateX(-100%);
  background: linear-gradient(
    90deg,
    transparent,
    color-mix(in srgb, var(--ds-color-bg-elevated) 65%, transparent),
    transparent
  );
  animation: ds-skeleton-shimmer 1.4s infinite;
}
@keyframes ds-skeleton-shimmer {
  100% {
    transform: translateX(100%);
  }
}
@media (prefers-reduced-motion: reduce) {
  .ds-skeleton--animated::after {
    animation: none;
  }
}
</style>
