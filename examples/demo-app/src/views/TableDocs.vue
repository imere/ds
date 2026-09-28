<template>
  <div>
    <PageHeader title="表格与分页" subtitle="表格在小屏（<768px）自动从「横向滚动」切换为「卡片列表」，每行自带字段名，彻底告别手机上左右拖动看数据的糟糕体验。">
      <template #actions>
        <DsButton size="sm" variant="ghost" icon="refresh" @click="reload">重新加载</DsButton>
        <DsButton size="sm" variant="secondary" :icon="loading ? 'loader' : 'zap'" @click="toggleLoading">
          {{ loading ? '加载中' : '模拟加载' }}
        </DsButton>
        <DsButton size="sm" variant="ghost" icon="trash" @click="clearAll">清空数据</DsButton>
      </template>
    </PageHeader>

    <DsAlert tone="info" style="margin-bottom: var(--ds-space-5)">
      当前视口 <strong>{{ bpLabel }}</strong>
      <template v-if="isMobile">——已切换为卡片模式。</template>
      <template v-else>——使用标准表格模式，缩小窗口到 768px 以下查看卡片模式。</template>
    </DsAlert>

    <DemoBlock
      title="完整表格"
      description="支持排序、多选、自定义单元格插槽、加载骨架与空状态。"
      :code="tableCode"
      block
    >
      <div class="table-toolbar">
        <DsInput v-model="keyword" placeholder="搜索姓名 / 邮箱 / 岗位" prefix="search" clearable style="max-width: 280px" />
        <DsSelect v-model="statusFilter" :options="statusOptions" clearable placeholder="全部状态" style="max-width: 160px" />
        <div class="table-toolbar__spacer" />
        <DsBadge v-if="selected.length" tone="brand">已选 {{ selected.length }} 项</DsBadge>
        <DsButton v-if="selected.length" size="sm" variant="danger" icon="trash" @click="removeSelected">
          移除
        </DsButton>
      </div>

      <DsTable
        :columns="columns"
        :data="pagedData"
        :loading="loading"
        selectable
        :selected-keys="selected"
        bordered
        row-key="id"
        empty-title="没有匹配的成员"
        empty-description="换个关键词或清空筛选条件再试一次。"
        @update:selectedKeys="selected = $event"
        @sort-change="onSort"
        @row-click="onRowClick"
      >
        <template #cell-name="{ row }">
          <div class="cell-user">
            <DsAvatar :name="row.name" size="sm" />
            <div class="cell-user__text">
              <strong>{{ row.name }}</strong>
              <small>{{ row.email }}</small>
            </div>
          </div>
        </template>
        <template #cell-status="{ row }">
          <DsBadge :tone="STATUS_TONES[row.status]" dot>{{ STATUS_LABELS[row.status] }}</DsBadge>
        </template>
        <template #cell-progress="{ row }">
          <DsProgress :value="row.progress" size="sm" :tone="row.progress > 70 ? 'success' : 'brand'" />
        </template>
        <template #cell-actions>
          <div class="cell-actions">
            <DsButton size="xs" variant="ghost" icon="edit" icon-only aria-label="编辑" />
            <DsButton size="xs" variant="ghost" icon="trash" icon-only aria-label="删除" />
          </div>
        </template>
      </DsTable>

      <DsPagination
        v-model="page"
        :total="filtered.length"
        :page-size="pageSize"
        show-size-changer
        :page-size-options="pageSizeOptions"
        @update:pageSize="pageSize = $event"
      />
    </DemoBlock>

    <DemoBlock title="紧凑与斑马纹" description="size 控制密度，striped 增加行间可读性。" :code="compactCode" block>
      <DsTable :columns="miniColumns" :data="filtered.slice(0, 4)" size="sm" striped />
      <DsTable :columns="miniColumns" :data="filtered.slice(0, 3)" size="lg" bordered />
    </DemoBlock>

    <DemoBlock title="标签页 + 表格" description="Tabs 在移动端可横向滚动，键盘左右方向键切换。" :code="tabsCode" block>
      <DsTabs v-model="tab" :tabs="tabs" variant="line">
        <template #all>
          <DsTable :columns="miniColumns" :data="filtered.slice(0, 5)" />
        </template>
        <template #active>
          <DsTable :columns="miniColumns" :data="filtered.filter((u) => u.status === 'active').slice(0, 5)" />
        </template>
        <template #pending>
          <DsTable :columns="miniColumns" :data="filtered.filter((u) => u.status !== 'active').slice(0, 5)" />
        </template>
      </DsTabs>
    </DemoBlock>

    <h2 class="section-title">DsTable API</h2>
    <ApiTable :rows="tableProps" />
    <h2 class="section-title">DsPagination API</h2>
    <ApiTable :rows="paginationProps" />
  </div>
</template>

<script>
import PageHeader from '@/docs/components/PageHeader.vue'
import DemoBlock from '@/docs/components/DemoBlock.vue'
import ApiTable from '@/docs/components/ApiTable.vue'
import DsTable from '@/components/DsTable.vue'
import DsPagination from '@/components/DsPagination.vue'
import DsButton from '@/components/DsButton.vue'
import DsInput from '@/components/DsInput.vue'
import DsSelect from '@/components/DsSelect.vue'
import DsBadge from '@/components/DsBadge.vue'
import DsAvatar from '@/components/DsAvatar.vue'
import DsProgress from '@/components/DsProgress.vue'
import DsTabs from '@/components/DsTabs.vue'
import DsAlert from '@/components/DsAlert.vue'
import { users, STATUS_LABELS, STATUS_TONES } from '@/api/mock/data'
import { bpState } from '@/composables/useBreakpoint'
import { toast } from '@/components/toast'

export default {
  name: 'TableDocs',
  components: {
    PageHeader,
    DemoBlock,
    ApiTable,
    DsTable,
    DsPagination,
    DsButton,
    DsInput,
    DsSelect,
    DsBadge,
    DsAvatar,
    DsProgress,
    DsTabs,
    DsAlert,
  },
  data() {
    return {
      all: users.slice(),
      keyword: '',
      statusFilter: '',
      selected: [],
      loading: false,
      page: 1,
      pageSize: 10,
      tab: 'all',
      STATUS_LABELS,
      STATUS_TONES,
      columns: [
        { key: 'name', title: '成员', sortable: true },
        { key: 'role', title: '岗位', sortable: true },
        { key: 'dept', title: '部门' },
        { key: 'status', title: '状态', width: '110px' },
        { key: 'progress', title: '完成度', width: '140px' },
        { key: 'updatedAt', title: '更新时间', sortable: true, width: '120px' },
        { key: 'actions', title: '操作', align: 'right', width: '100px' },
      ],
      miniColumns: [
        { key: 'name', title: '姓名' },
        { key: 'role', title: '岗位' },
        { key: 'dept', title: '部门' },
        { key: 'updatedAt', title: '更新时间' },
      ],
      statusOptions: Object.keys(STATUS_LABELS).map((k) => ({
        label: STATUS_LABELS[k],
        value: k,
      })),
      pageSizeOptions: [
        { label: '5 条/页', value: 5 },
        { label: '10 条/页', value: 10 },
        { label: '20 条/页', value: 20 },
      ],
      tabs: [
        { name: 'all', label: '全部' },
        { name: 'active', label: '在职' },
        { name: 'pending', label: '其他' },
      ],
      tableCode: `<DsTable
  :columns="columns"
  :data="data"
  :loading="loading"
  selectable
  :selected-keys="selected"
  row-key="id"
  @sort-change="onSort"
>
  <template #cell-name="{ row }">
    <DsAvatar :name="row.name" size="sm" /> {{ row.name }}
  </template>
  <template #cell-status="{ row }">
    <DsBadge :tone="toneOf(row.status)">{{ row.status }}</DsBadge>
  </template>
</DsTable>`,
      compactCode: `<DsTable :columns="columns" :data="data" size="sm" striped />
<DsTable :columns="columns" :data="data" size="lg" bordered />`,
      tabsCode: `<DsTabs v-model="tab" :tabs="tabs" variant="line">
  <template #all><DsTable :columns="columns" :data="all" /></template>
  <template #active><DsTable :columns="columns" :data="activeOnly" /></template>
</DsTabs>`,
      tableProps: [
        { name: 'columns', type: 'Array<{key,title,width,align,sortable}>', default: '[]', desc: '列定义' },
        { name: 'data', type: 'Array', default: '[]', desc: '行数据' },
        { name: 'rowKey', type: 'String | Function', default: "'id'", desc: '行唯一键' },
        { name: 'loading', type: 'Boolean', default: 'false', desc: '显示骨架屏' },
        { name: 'selectable', type: 'Boolean', default: 'false', desc: '开启多选列' },
        { name: 'selectedKeys', type: 'Array', default: '[]', desc: '选中行 key（.sync）' },
        { name: 'responsive', type: 'Boolean', default: 'true', desc: '<768px 转卡片模式' },
        { name: 'size', type: 'sm | md | lg', default: 'md', desc: '行高密度' },
        { name: 'bordered / striped / hover', type: 'Boolean', default: 'false / false / true', desc: '视觉样式' },
        { name: '插槽 cell-{key}', type: '—', default: '—', desc: '自定义单元格，作用域含 row / value / index' },
        { name: '插槽 empty / card', type: '—', default: '—', desc: '空状态 / 移动端卡片整体自定义' },
      ],
      paginationProps: [
        { name: 'value / v-model', type: 'Number', default: '1', desc: '当前页码' },
        { name: 'total', type: 'Number', default: '0', desc: '数据总条数' },
        { name: 'pageSize', type: 'Number', default: '10', desc: '每页条数（.sync）' },
        { name: 'showTotal', type: 'Boolean', default: 'true', desc: '显示总数与区间' },
        { name: 'showSizeChanger', type: 'Boolean', default: 'false', desc: '显示每页条数选择器' },
        { name: 'siblingCount', type: 'Number', default: '1', desc: '当前页两侧保留的页码数' },
        { name: 'forceCompact', type: 'Boolean', default: 'false', desc: '强制紧凑模式（移动端自动开启）' },
      ],
    }
  },
  computed: {
    isMobile() {
      return bpState.width < 768
    },
    bpLabel() {
      const w = bpState.width
      return `${w}px (${w >= 1280 ? 'xl' : w >= 1024 ? 'lg' : w >= 768 ? 'md' : w >= 640 ? 'sm' : 'xs'})`
    },
    filtered() {
      const kw = this.keyword.trim().toLowerCase()
      return this.all.filter((u) => {
        const matchKw =
          !kw ||
          u.name.toLowerCase().includes(kw) ||
          u.email.toLowerCase().includes(kw) ||
          u.role.toLowerCase().includes(kw)
        const matchStatus = !this.statusFilter || u.status === this.statusFilter
        return matchKw && matchStatus
      })
    },
    pagedData() {
      const start = (this.page - 1) * this.pageSize
      return this.filtered.slice(start, start + this.pageSize)
    },
  },
  watch: {
    keyword() {
      this.page = 1
    },
    statusFilter() {
      this.page = 1
    },
  },
  methods: {
    reload() {
      this.loading = true
      setTimeout(() => {
        this.all = users.slice()
        this.loading = false
        toast.success('数据已刷新')
      }, 700)
    },
    toggleLoading() {
      this.loading = true
      setTimeout(() => {
        this.loading = false
      }, 1500)
    },
    clearAll() {
      this.all = []
      this.selected = []
    },
    removeSelected() {
      this.all = this.all.filter((u) => this.selected.indexOf(u.id) === -1)
      toast.warning(`已移除 ${this.selected.length} 位成员`)
      this.selected = []
    },
    onSort({ key, order }) {
      if (!key || !order) return
      toast.info(`排序：${key} ${order === 'asc' ? '升序' : '降序'}`)
    },
    onRowClick(row) {
      toast.info(`点击了 ${row.name}`)
    },
  },
}
</script>

<style scoped>
.table-toolbar {
  display: flex;
  align-items: center;
  gap: var(--ds-space-3);
  flex-wrap: wrap;
  width: 100%;
  margin-bottom: var(--ds-space-4);
}
.table-toolbar__spacer {
  flex: 1;
}

.cell-user {
  display: flex;
  align-items: center;
  gap: var(--ds-space-2);
  min-width: 0;
}
.cell-user__text {
  display: flex;
  flex-direction: column;
  min-width: 0;
  line-height: 1.3;
}
.cell-user__text small {
  font-size: var(--ds-font-size-2xs);
  color: var(--ds-color-fg-subtle);
}

.cell-actions {
  display: inline-flex;
  gap: var(--ds-space-1);
}
@media (max-width: 767px) {
  .cell-actions {
    justify-content: flex-end;
  }
}

.section-title {
  margin: var(--ds-space-8) 0 var(--ds-space-4);
  font-size: var(--ds-font-size-xl);
  font-weight: var(--ds-font-weight-semibold);
}
</style>
