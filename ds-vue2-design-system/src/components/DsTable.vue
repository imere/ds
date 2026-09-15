<template>
  <div class="ds-table-wrap">
    <!-- 加载态：交给 el-skeleton -->
    <div v-if="loading" class="ds-table-skeleton">
      <el-skeleton :rows="skeletonRows" animated />
    </div>

    <!-- 桌面 / 平板：el-table -->
    <el-table
      v-else-if="!stacked"
      ref="table"
      class="ds-table"
      :class="[
        `ds-table--${size}`,
        {
          'ds-table--bordered': bordered,
          'ds-table--striped': striped,
          'ds-table--hover': hover,
        },
      ]"
      :data="sortedData"
      :row-key="rowKey"
      :border="bordered"
      :stripe="striped"
      :size="elSize"
      :height="height"
      :max-height="maxHeight"
      :show-header="showHeader"
      :default-sort="{ prop: sortKey, order: elSortOrder }"
      @sort-change="onElSortChange"
      @row-click="onRowClick"
      @select="onSelect"
      @select-all="onSelectAll"
      @selection-change="onSelectionChange"
    >
      <el-table-column
        v-if="selectable"
        type="selection"
        width="44"
        :selectable="selectableFn"
        :reserve-selection="true"
      />

      <el-table-column
        v-for="col in columns"
        :key="col.key"
        :prop="col.key"
        :label="col.title"
        :width="col.width"
        :min-width="col.minWidth"
        :align="col.align"
        :fixed="col.fixed"
        :sortable="col.sortable ? 'custom' : false"
        :show-overflow-tooltip="!!col.ellipsis"
        :class-name="col.className"
        :label-class-name="col.align ? `ds-table__cell--${col.align}` : ''"
      >
        <template slot-scope="scope">
          <slot
            :name="`cell-${col.key}`"
            :row="scope.row"
            :value="scope.row[col.key]"
            :index="scope.$index"
          >
            {{ scope.row[col.key] }}
          </slot>
        </template>
      </el-table-column>

      <template slot="empty">
        <slot name="empty">
          <DsEmpty :title="emptyTitle" :description="emptyDescription" />
        </slot>
      </template>
    </el-table>

    <!-- 移动端 <768px：卡片列表（el-card） -->
    <div v-else class="ds-table-cards">
      <el-card
        v-for="(row, i) in sortedData"
        :key="`card-${rowKeyOf(row, i)}`"
        class="ds-table-card"
        :class="{ 'is-selected': isSelected(row, i) }"
        shadow="never"
        @click.native="$emit('row-click', row, i)"
      >
        <slot name="card" :row="row" :index="i">
          <div v-if="selectable" class="ds-table-card__check" @click.stop>
            <DsCheckbox :model-value="selectedKeys" :value="rowKeyOf(row, i)" @change="onRowCheck" />
          </div>
          <div v-for="col in columns" :key="col.key" class="ds-table-card__row">
            <span class="ds-table-card__label">{{ col.title }}</span>
            <span class="ds-table-card__value">
              <slot
                :name="`cell-${col.key}`"
                :row="row"
                :value="row[col.key]"
                :index="i"
              >
                {{ row[col.key] }}
              </slot>
            </span>
          </div>
        </slot>
      </el-card>

      <div v-if="!sortedData.length" class="ds-table-cards__empty">
        <slot name="empty">
          <DsEmpty :title="emptyTitle" :description="emptyDescription" />
        </slot>
      </div>
    </div>
  </div>
</template>

<script>
import DsCheckbox from './DsCheckbox.vue'
import DsEmpty from './DsEmpty.vue'
import { bpState } from '@/composables/useBreakpoint'

/**
 * DsTable —— 基于 el-table 的二次封装
 * @displayName 数据表格 Table
 *
 * 表格渲染、固定列、排序、多选、空态交给 el-table；
 * 我们在其上补了两件事：
 *  1) 响应式：<768px 自动从表格切换成 el-card 卡片列表，手机端不再左右拖动
 *  2) 选择模型：对外仍用 selectedKeys（行 key 数组），内部与 el-table 的
 *     toggleRowSelection 双向同步，业务不需要接触 row 对象
 */
export default {
  name: 'DsTable',
  components: { DsCheckbox, DsEmpty },
  inheritAttrs: false,
  props: {
    columns: { type: Array, default: () => [] },
    data: { type: Array, default: () => [] },
    rowKey: { type: [String, Function], default: 'id' },
    size: { type: String, default: 'md', validator: (v) => ['sm', 'md', 'lg'].includes(v) },
    loading: { type: Boolean, default: false },
    bordered: { type: Boolean, default: false },
    striped: { type: Boolean, default: false },
    hover: { type: Boolean, default: true },
    selectable: { type: Boolean, default: false },
    selectedKeys: { type: Array, default: () => [] },
    emptyTitle: { type: String, default: '暂无数据' },
    emptyDescription: { type: String, default: '' },
    /** true：小屏自动变卡片；false：始终表格（横向滚动） */
    responsive: { type: Boolean, default: true },
    skeletonRows: { type: Number, default: 3 },
    height: { type: [String, Number], default: null },
    maxHeight: { type: [String, Number], default: null },
    showHeader: { type: Boolean, default: true },
    selectableFn: { type: Function, default: null },
  },
  data() {
    return { sortKey: '', sortOrder: '' }
  },
  computed: {
    stacked() {
      return this.responsive && bpState.width < 768
    },
    elSize() {
      return { sm: 'small', md: 'small', lg: 'medium' }[this.size] || 'small'
    },
    elSortOrder() {
      if (!this.sortKey || !this.sortOrder) return null
      return this.sortOrder === 'asc' ? 'ascending' : 'descending'
    },
    sortedData() {
      if (!this.sortKey || !this.sortOrder) return this.data || []
      const key = this.sortKey
      const dir = this.sortOrder === 'asc' ? 1 : -1
      return (this.data || []).slice().sort((a, b) => {
        const av = a[key]
        const bv = b[key]
        if (typeof av === 'number' && typeof bv === 'number') return (av - bv) * dir
        return String(av).localeCompare(String(bv), 'zh-CN') * dir
      })
    },
    allSelected() {
      const rows = this.data || []
      if (!rows.length) return false
      return rows.every((r, i) => this.selectedKeys.indexOf(this.rowKeyOf(r, i)) > -1)
    },
    indeterminate() {
      const rows = this.data || []
      const count = rows.filter((r, i) => this.selectedKeys.indexOf(this.rowKeyOf(r, i)) > -1).length
      return count > 0 && count < rows.length
    },
  },
  watch: {
    selectedKeys: {
      handler() {
        this.$nextTick(this.syncSelection)
      },
      deep: true,
    },
    data() {
      this.$nextTick(this.syncSelection)
    },
    stacked() {
      this.$nextTick(() => {
        const t = this.$refs.table
        if (t && t.doLayout) t.doLayout()
      })
    },
  },
  mounted() {
    this.syncSelection()
  },
  methods: {
    rowKeyOf(row, index) {
      if (typeof this.rowKey === 'function') return this.rowKey(row, index)
      return row[this.rowKey] !== undefined ? row[this.rowKey] : index
    },
    isSelected(row, index) {
      return this.selectedKeys.indexOf(this.rowKeyOf(row, index)) > -1
    },
    /** 把 selectedKeys 反向同步到 el-table 内部选择态 */
    syncSelection() {
      const table = this.$refs.table
      if (!this.selectable || !table || !table.clearSelection) return
      const rows = this.sortedData
      table.clearSelection()
      rows.forEach((row, i) => {
        if (this.isSelected(row, i) && table.toggleRowSelection) {
          table.toggleRowSelection(row, true)
        }
      })
    },
    sort(col) {
      if (this.sortKey !== col.key) {
        this.sortKey = col.key
        this.sortOrder = 'asc'
      } else if (this.sortOrder === 'asc') {
        this.sortOrder = 'desc'
      } else {
        this.sortKey = ''
        this.sortOrder = ''
      }
      this.$emit('sort-change', { key: this.sortKey, order: this.sortOrder })
      this.pushSortToTable()
    },
    /** el-table 表头点击（custom 排序，数据由我们自己排） */
    onElSortChange({ prop, order }) {
      this.sortKey = order ? prop : ''
      this.sortOrder = order === 'ascending' ? 'asc' : order === 'descending' ? 'desc' : ''
      this.$emit('sort-change', { key: this.sortKey, order: this.sortOrder })
    },
    pushSortToTable() {
      const t = this.$refs.table
      if (t && t.sort && this.sortKey) t.sort(this.sortKey, this.elSortOrder)
    },
    onRowClick(row, column, event) {
      this.$emit('row-click', row, this.sortedData.indexOf(row), event)
    },
    onSelect(selection) {
      this.emitKeys(selection)
    },
    onSelectAll(selection) {
      this.emitKeys(selection)
    },
    onSelectionChange(selection) {
      this.emitKeys(selection)
    },
    emitKeys(rows) {
      if (!this.selectable) return
      const keys = (rows || []).map((row) => this.rowKeyOf(row, this.sortedData.indexOf(row)))
      if (keys.length === this.selectedKeys.length && keys.every((k, i) => k === this.selectedKeys[i])) {
        return
      }
      this.$emit('update:selectedKeys', keys)
      this.$emit('selection-change', keys)
    },
    toggleAll(checked) {
      const rows = this.data || []
      const keys = checked ? rows.map((r, i) => this.rowKeyOf(r, i)) : []
      this.$emit('update:selectedKeys', keys)
      this.$emit('selection-change', keys)
    },
    onRowCheck(keys) {
      this.$emit('update:selectedKeys', keys)
      this.$emit('selection-change', keys)
    },
    clearSort() {
      const t = this.$refs.table
      if (t && t.clearSort) t.clearSort()
      this.sortKey = ''
      this.sortOrder = ''
    },
  },
}
</script>

<style scoped>
.ds-table-wrap {
  width: 100%;
  min-width: 0;
}

.ds-table-scroll {
  width: 100%;
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
}

.ds-table {
  width: 100%;
  border-collapse: separate;
  border-spacing: 0;
  font-size: var(--ds-font-size-sm);
}
.ds-table--sm {
  font-size: var(--ds-font-size-xs);
}
.ds-table--lg {
  font-size: var(--ds-font-size-md);
}

.ds-table__cell {
  padding: var(--ds-space-3) var(--ds-space-4);
  text-align: left;
  border-bottom: 1px solid var(--ds-color-border-subtle);
  color: var(--ds-color-fg-muted);
  vertical-align: middle;
}
.ds-table--sm .ds-table__cell {
  padding: var(--ds-space-2) var(--ds-space-3);
}
.ds-table--lg .ds-table__cell {
  padding: var(--ds-space-4) var(--ds-space-5);
}

.ds-table__cell--center {
  text-align: center;
}
.ds-table__cell--right {
  text-align: right;
}
.ds-table__cell--check {
  width: 44px;
  text-align: center;
}

.ds-table__head {
  position: sticky;
  top: 0;
  z-index: 1;
  background: var(--ds-color-bg-subtle);
  color: var(--ds-color-fg-muted);
  font-weight: var(--ds-font-weight-semibold);
  font-size: var(--ds-font-size-xs);
  white-space: nowrap;
  user-select: none;
}
.ds-table__head--sortable {
  cursor: pointer;
}
.ds-table__head--sortable:hover {
  color: var(--ds-color-fg);
}
.ds-table__head-inner {
  display: inline-flex;
  align-items: center;
  gap: var(--ds-space-1);
}
.ds-table__sort {
  opacity: 0.5;
}

.ds-table--bordered .ds-table__cell {
  border: 1px solid var(--ds-color-border);
}
.ds-table--bordered .ds-table__head {
  border: 1px solid var(--ds-color-border);
}
.ds-table--striped .ds-table__row:nth-child(even) .ds-table__cell {
  background: var(--ds-color-bg-subtle);
}
.ds-table--hover .ds-table__row:hover .ds-table__cell {
  background: var(--ds-color-bg-hover);
}
.ds-table__row.is-selected .ds-table__cell {
  background: var(--ds-color-brand-subtle);
}
.ds-table__row.is-clickable {
  cursor: pointer;
}

.ds-table__empty {
  padding: var(--ds-space-6);
  border-bottom: 1px solid var(--ds-color-border-subtle);
}

/* ---------- 移动端卡片模式 ---------- */
.ds-table-cards {
  display: flex;
  flex-direction: column;
  gap: var(--ds-space-3);
}

.ds-table-card {
  display: flex;
  flex-direction: column;
  gap: var(--ds-space-2);
  padding: var(--ds-space-3) var(--ds-space-4);
  border: 1px solid var(--ds-color-border);
  border-radius: var(--ds-radius-lg);
  background: var(--ds-color-bg-elevated);
  font-size: var(--ds-font-size-sm);
}
.ds-table-card.is-selected {
  border-color: var(--ds-color-brand);
  background: var(--ds-color-brand-subtle);
}

.ds-table-card__check {
  align-self: flex-end;
}

.ds-table-card__row {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: var(--ds-space-3);
  min-width: 0;
}
.ds-table-card__label {
  flex: none;
  color: var(--ds-color-fg-subtle);
  font-size: var(--ds-font-size-xs);
}
.ds-table-card__value {
  flex: 1;
  min-width: 0;
  text-align: right;
  color: var(--ds-color-fg);
  overflow-wrap: anywhere;
}

.ds-table-cards__empty {
  padding: var(--ds-space-6) 0;
}
</style>

<style scoped>
/* ================= Element 适配 ================= */
.ds-table-wrap {
  width: 100%;
  min-width: 0;
}
.ds-table ::v-deep .el-table__cell {
  padding: var(--ds-space-3) var(--ds-space-4);
  border-bottom-color: var(--ds-color-border-subtle);
}
.ds-table--sm ::v-deep .el-table__cell {
  padding: var(--ds-space-2) var(--ds-space-3);
}
.ds-table--lg ::v-deep .el-table__cell {
  padding: var(--ds-space-4) var(--ds-space-5);
}
.ds-table ::v-deep .el-table th.el-table__cell {
  background: var(--ds-color-bg-subtle);
  color: var(--ds-color-fg-muted);
}
.ds-table-skeleton {
  padding: var(--ds-space-2) 0;
}

/* 移动端卡片：用 el-card 承载，去掉 Element 默认内边距带来的双层留白 */
.ds-table-cards {
  display: flex;
  flex-direction: column;
  gap: var(--ds-space-3);
}
.ds-table-card ::v-deep .el-card__body {
  padding: var(--ds-space-3) var(--ds-space-4);
}
.ds-table-card.is-selected {
  border-color: var(--ds-color-brand);
  background: var(--ds-color-brand-subtle);
}
.ds-table-card__check {
  display: flex;
  justify-content: flex-end;
}
.ds-table-card__row {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: var(--ds-space-3);
  min-width: 0;
}
.ds-table-card__label {
  flex: none;
  color: var(--ds-color-fg-subtle);
  font-size: var(--ds-font-size-xs);
}
.ds-table-card__value {
  flex: 1;
  min-width: 0;
  text-align: right;
  color: var(--ds-color-fg);
  overflow-wrap: anywhere;
}
.ds-table-cards__empty {
  padding: var(--ds-space-6) 0;
}
</style>
