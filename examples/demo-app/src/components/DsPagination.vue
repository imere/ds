<template>
  <div class="ds-pagination" :class="{ 'ds-pagination--compact': compact }">
    <el-pagination
      class="ds-pagination__el"
      :current-page="value"
      :page-size="pageSize"
      :total="total"
      :pager-count="compact ? 5 : pagerCount"
      :page-sizes="showSizeChanger ? pageSizeValues : undefined"
      :layout="layout"
      :small="compact"
      :background="false"
      :disabled="disabled"
      :hide-on-single-page="false"
      @current-change="onCurrentChange"
      @size-change="onSizeChange"
      @prev-click="$emit('prev-click', $event)"
      @next-click="$emit('next-click', $event)"
    >
      <span v-if="showTotal && compact" class="ds-pagination__total">
        共 {{ total }} 条
      </span>
    </el-pagination>
  </div>
</template>

<script>
import { bpState } from '@/composables/useBreakpoint'

/**
 * DsPagination —— 基于 el-pagination 的二次封装
 * @displayName 分页 Pagination
 *
 * el-pagination 负责页码渲染、翻页与每页条数切换，
 * 我们额外保留一套「页码模型」（pages / pageCount）与 go() 命令式跳转，
 * 便于业务做自定义渲染或受控跳转；小屏自动切紧凑模式。
 */
export default {
  name: 'DsPagination',
  inheritAttrs: false,
  props: {
    value: { type: Number, default: 1 },
    total: { type: Number, default: 0 },
    pageSize: { type: Number, default: 10 },
    siblingCount: { type: Number, default: 1 },
    showTotal: { type: Boolean, default: true },
    showSizeChanger: { type: Boolean, default: false },
    pageSizeOptions: {
      type: Array,
      default: () => [
        { label: '10 条/页', value: 10 },
        { label: '20 条/页', value: 20 },
        { label: '50 条/页', value: 50 },
      ],
    },
    forceCompact: { type: Boolean, default: false },
    disabled: { type: Boolean, default: false },
  },
  computed: {
    compact() {
      return this.forceCompact || bpState.width < 768
    },
    pageCount() {
      return Math.max(1, Math.ceil(this.total / this.pageSize))
    },
    /**
     * 带省略号的页码模型：
     * 1 … 3 [4] 5 … 20
     * el-pagination 内部有自己的折叠算法，这里保留一份供业务自定义渲染使用。
     */
    pages() {
      const total = this.pageCount
      const current = Math.min(Math.max(1, this.value), total)
      const siblings = this.siblingCount
      // 首尾固定 1 个 + 当前页左右各 siblings 个 + 2 个省略号
      const maxSlots = siblings * 2 + 5
      if (total <= maxSlots) {
        return Array.from({ length: total }, (_, i) => i + 1)
      }
      const left = Math.max(current - siblings, 2)
      const right = Math.min(current + siblings, total - 1)
      const pages = [1]
      if (left > 2) pages.push('…')
      for (let i = left; i <= right; i += 1) pages.push(i)
      if (right < total - 1) pages.push('…')
      pages.push(total)
      return pages
    },
    pagerCount() {
      return this.siblingCount * 2 + 5
    },
    pageSizeValues() {
      return this.pageSizeOptions.map((o) => (typeof o === 'object' ? o.value : o))
    },
    layout() {
      const parts = []
      if (this.showTotal && !this.compact) parts.push('total')
      parts.push('prev', 'pager', 'next')
      if (this.showSizeChanger && !this.compact) parts.push('sizes')
      if (!this.compact) parts.push('jumper')
      return parts.join(', ')
    },
  },
  methods: {
    /** 命令式跳转：越界自动夹紧，页码无变化时不派发 */
    go(page) {
      const next = Math.min(Math.max(1, page), this.pageCount)
      if (next === this.value) return
      this.$emit('input', next)
      this.$emit('change', next)
    },
    onCurrentChange(page) {
      if (page === this.value) return
      this.$emit('input', page)
      this.$emit('change', page)
    },
    onSizeChange(size) {
      this.$emit('page-size-change', size)
      this.$emit('update:pageSize', size)
    },
  },
}
</script>

<style scoped>
.ds-pagination {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--ds-space-3);
  flex-wrap: wrap;
}

.ds-pagination__total {
  font-size: var(--ds-font-size-xs);
  color: var(--ds-color-fg-muted);
}

.ds-pagination__controls {
  display: flex;
  align-items: center;
  gap: var(--ds-space-1);
  margin-left: auto;
}

.ds-pagination__item {
  min-width: 30px;
  height: 30px;
  padding: 0 var(--ds-space-2);
  border: 1px solid transparent;
  border-radius: var(--ds-radius-sm);
  background: transparent;
  color: var(--ds-color-fg-muted);
  font-size: var(--ds-font-size-xs);
  font-variant-numeric: tabular-nums;
  transition: background-color var(--ds-motion-duration-fast) var(--ds-motion-ease-standard),
    color var(--ds-motion-duration-fast) var(--ds-motion-ease-standard);
}
.ds-pagination__item:hover:not(.is-active):not(.is-ellipsis) {
  background: var(--ds-color-bg-hover);
  color: var(--ds-color-fg);
}
.ds-pagination__item.is-active {
  background: var(--ds-color-brand);
  border-color: var(--ds-color-brand);
  color: var(--ds-color-fg-on-brand);
  font-weight: var(--ds-font-weight-medium);
}
.ds-pagination__item.is-ellipsis {
  cursor: default;
  color: var(--ds-color-fg-subtle);
}

.ds-pagination__indicator {
  padding: 0 var(--ds-space-3);
  font-size: var(--ds-font-size-sm);
  color: var(--ds-color-fg-muted);
  font-variant-numeric: tabular-nums;
}

.ds-pagination__size {
  width: 112px;
  margin-left: var(--ds-space-2);
}

@media (max-width: 767px) {
  .ds-pagination {
    justify-content: center;
  }
  .ds-pagination__controls {
    margin-left: 0;
    gap: var(--ds-space-2);
  }
  .ds-pagination__item {
    min-width: 38px;
    height: 38px;
    font-size: var(--ds-font-size-sm);
  }
}
</style>

<style scoped>
/* ================= Element 适配 ================= */
.ds-pagination {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
}
.ds-pagination__el {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 4px;
  padding: 0;
  font-weight: var(--ds-font-weight-normal);
}
.ds-pagination__total {
  font-size: var(--ds-font-size-xs);
  color: var(--ds-color-fg-subtle);
  margin-right: var(--ds-space-2);
}
</style>
