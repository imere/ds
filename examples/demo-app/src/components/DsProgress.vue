<template>
  <div class="ds-progress" :class="[`ds-progress--${tone}`, `ds-progress--${size}`, { 'ds-progress--indeterminate': indeterminate }]">
    <el-progress
      :percentage="clamped"
      :status="elStatus"
      :stroke-width="strokeWidth"
      :show-text="showValue"
      :text-inside="textInside"
      :type="type"
      :width="circleWidth"
      :color="color"
      :duration="duration"
    />
    <span v-if="label" class="ds-progress__label">{{ label }}</span>
  </div>
</template>

<script>
/**
 * DsProgress —— 基于 el-progress 的二次封装
 * @displayName 进度条 Progress
 * tone 映射到 el-progress 的 status（success / warning / exception），
 * 其余靠 --ds-color-brand 等令牌驱动主色。
 */
export default {
  name: 'DsProgress',
  inheritAttrs: false,
  props: {
    value: { type: Number, default: 0 },
    tone: { type: String, default: 'brand', validator: (v) => ['brand', 'success', 'warning', 'danger'].includes(v) },
    size: { type: String, default: 'md', validator: (v) => ['sm', 'md', 'lg'].includes(v) },
    label: { type: String, default: '' },
    showValue: { type: Boolean, default: false },
    indeterminate: { type: Boolean, default: false },
    type: { type: String, default: 'line', validator: (v) => ['line', 'circle', 'dashboard'].includes(v) },
    textInside: { type: Boolean, default: false },
    color: { type: [String, Array, Function], default: '' },
  },
  computed: {
    clamped() {
      if (this.indeterminate) return 50
      return Math.min(Math.max(0, this.value), 100)
    },
    elStatus() {
      // el-progress 的 status 校验器只接受 success / warning / exception，
      // 传空串会告警，所以 brand 必须回落到 undefined（走默认主色）。
      return { success: 'success', warning: 'warning', danger: 'exception' }[this.tone] || undefined
    },
    duration() {
      return this.indeterminate ? 3 : undefined
    },
    strokeWidth() {
      return { sm: 6, md: 8, lg: 12 }[this.size] || 8
    },
    circleWidth() {
      return { sm: 80, md: 110, lg: 140 }[this.size] || 110
    },
  },
}
</script>

<style scoped>
.ds-progress {
  display: flex;
  flex-direction: column;
  gap: var(--ds-space-2);
  width: 100%;
}
.ds-progress__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: var(--ds-font-size-xs);
  color: var(--ds-color-fg-muted);
}
.ds-progress__value {
  font-variant-numeric: tabular-nums;
  color: var(--ds-color-fg);
  font-weight: var(--ds-font-weight-medium);
}
.ds-progress__track {
  overflow: hidden;
  background: var(--ds-color-bg-inset);
  border-radius: var(--ds-radius-full);
}
.ds-progress--sm .ds-progress__track {
  height: 4px;
}
.ds-progress--md .ds-progress__track {
  height: 8px;
}
.ds-progress--lg .ds-progress__track {
  height: 12px;
}

.ds-progress__bar {
  height: 100%;
  border-radius: inherit;
  background: var(--ds-color-brand);
  transition: width var(--ds-motion-duration-slow) var(--ds-motion-ease-out);
}
.ds-progress--success .ds-progress__bar {
  background: var(--ds-color-success);
}
.ds-progress--warning .ds-progress__bar {
  background: var(--ds-color-warning);
}
.ds-progress--danger .ds-progress__bar {
  background: var(--ds-color-danger);
}

.ds-progress--indeterminate .ds-progress__bar {
  width: 35%;
  animation: ds-progress-slide 1.2s var(--ds-motion-ease-in-out) infinite;
}
@keyframes ds-progress-slide {
  0% {
    transform: translateX(-100%);
  }
  100% {
    transform: translateX(320%);
  }
}
</style>

<style scoped>
/* ================= Element 适配 ================= */
.ds-progress--brand ::v-deep .el-progress-bar__inner {
  background-color: var(--ds-color-brand);
}
.ds-progress--success ::v-deep .el-progress-bar__inner {
  background-color: var(--ds-color-success);
}
.ds-progress--warning ::v-deep .el-progress-bar__inner {
  background-color: var(--ds-color-warning);
}
.ds-progress--danger ::v-deep .el-progress-bar__inner {
  background-color: var(--ds-color-danger);
}
.ds-progress--success ::v-deep .el-progress-circle__path {
  stroke: var(--ds-color-success);
}
.ds-progress--warning ::v-deep .el-progress-circle__path {
  stroke: var(--ds-color-warning);
}
.ds-progress--danger ::v-deep .el-progress-circle__path {
  stroke: var(--ds-color-danger);
}

/* el-progress 没有 indeterminate，这里补一条流动动画 */
.ds-progress--indeterminate ::v-deep .el-progress-bar__inner {
  width: 35% !important;
  animation: ds-progress-slide 1.2s var(--ds-motion-ease-in-out) infinite;
}
.ds-progress--indeterminate ::v-deep .el-progress__text {
  display: none;
}
@media (prefers-reduced-motion: reduce) {
  .ds-progress--indeterminate ::v-deep .el-progress-bar__inner {
    animation: none;
  }
}
</style>
