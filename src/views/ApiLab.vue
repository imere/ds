<template>
  <div>
    <PageHeader title="API 实验室" subtitle="请求层封装演示：mock 与真实接口一键切换、统一错误归一化、加载/空/错误三态齐全，业务代码全程零改动。">
      <template #actions>
        <DsBadge :tone="apiState.mode === 'mock' ? 'warning' : 'success'" dot>
          {{ apiState.mode === 'mock' ? 'Mock 模式' : '真实接口' }}
        </DsBadge>
      </template>
    </PageHeader>

    <div class="lab-layout">
      <!-- ============ 控制面板 ============ -->
      <aside class="lab-aside">
        <DsCard padding="md">
          <template #header><h3 class="panel-title">请求配置</h3></template>

          <div class="ds-stack ds-stack-4">
            <DsField label="数据源">
              <DsRadioGroup v-model="mode" :options="modeOptions" variant="button" @input="onModeChange" />
            </DsField>

            <DsField label="接口地址" hint="真实模式下生效">
              <DsInput v-model="baseURL" placeholder="/api" :disabled="mode === 'mock'" />
            </DsField>

            <DsField :label="`模拟延迟 ${apiState.latency}ms`" hint="仅 mock 模式">
              <input v-model.number="apiState.latency" type="range" min="0" max="2000" step="100" class="lab-range" />
            </DsField>

            <DsField :label="`故障注入率 ${Math.round(apiState.failureRate * 100)}%`" hint="用于验证错误态 UI">
              <input v-model.number="apiState.failureRate" type="range" min="0" max="1" step="0.1" class="lab-range" />
            </DsField>

            <div class="ds-flex ds-gap-2">
              <DsButton variant="primary" block icon="refresh" :loading="loading" @click="load">
                发起请求
              </DsButton>
              <DsButton variant="ghost" block icon="trash" @click="clearLog">清空日志</DsButton>
            </div>
          </div>
        </DsCard>

        <DsCard padding="md">
          <template #header><h3 class="panel-title">请求日志</h3></template>
          <DsEmpty v-if="!logs.length" size="sm" title="暂无请求" icon="inbox" />
          <ul v-else class="ds-stack ds-stack-2 log-list">
            <li v-for="log in logs" :key="log.id" class="log-item" :class="`log-item--${log.tone}`">
              <DsIcon :name="log.tone === 'error' ? 'error' : 'success'" size="xs" />
              <div class="log-item__body">
                <code>{{ log.label }}</code>
                <span>{{ log.detail }}</span>
              </div>
              <time>{{ log.at }}</time>
            </li>
          </ul>
        </DsCard>
      </aside>

      <!-- ============ 结果区 ============ -->
      <div class="lab-main">
        <DsCard padding="md">
          <template #header>
            <div class="panel-head">
              <h3 class="panel-title">成员列表</h3>
              <div class="ds-flex ds-gap-2">
                <DsInput v-model="keyword" size="sm" placeholder="搜索…" prefix="search" clearable style="width: 200px" />
                <DsButton size="sm" variant="secondary" icon="search" :loading="loading" @click="search">查询</DsButton>
              </div>
            </div>
          </template>

          <DsAlert v-if="error" tone="danger" :title="error.code" closable @close="error = null">
            {{ error.message }}
            <template #actions>
              <DsButton size="xs" variant="secondary" @click="load">重试</DsButton>
            </template>
          </DsAlert>

          <DsAlert v-else-if="hasLoaded && !users.length" tone="info" title="没有数据">
            当前筛选条件下没有成员，试试清空搜索关键词。
          </DsAlert>

          <DsTable
            v-show="!error"
            :columns="columns"
            :data="users"
            :loading="loading"
            empty-title="暂无成员"
            empty-description="点击「发起请求」加载数据。"
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
              <DsProgress :value="row.progress" size="sm" />
            </template>
          </DsTable>

          <DsPagination
            v-if="!error"
            v-model="page"
            :total="total"
            :page-size="pageSize"
            show-size-changer
            @update:pageSize="pageSize = $event"
          />
        </DsCard>

        <DsCard padding="md">
          <template #header>
            <div class="panel-head">
              <h3 class="panel-title">新建成员（演示提交态）</h3>
              <DsBadge v-if="newUser.id" tone="success">已创建 #{{ newUser.id }}</DsBadge>
            </div>
          </template>

          <div class="form-grid">
            <DsField label="姓名"><DsInput v-model="newUser.name" placeholder="请输入姓名" /></DsField>
            <DsField label="邮箱"><DsInput v-model="newUser.email" placeholder="name@company.com" /></DsField>
            <DsField label="岗位">
              <DsSelect v-model="newUser.role" :options="roleOptions" />
            </DsField>
            <DsField label="部门">
              <DsSelect v-model="newUser.dept" :options="deptOptions" />
            </DsField>
          </div>

          <template #footer>
            <DsButton variant="ghost" @click="resetNewUser">重置</DsButton>
            <DsButton variant="primary" :loading="submitting" @click="submit">提交</DsButton>
          </template>
        </DsCard>

        <DsCard padding="md">
          <template #header><h3 class="panel-title">接入方式</h3></template>
          <pre class="code"><code>{{ codeSnippet }}</code></pre>
        </DsCard>
      </div>
    </div>
  </div>
</template>

<script>
import PageHeader from '@/docs/components/PageHeader.vue'
import DsCard from '@/components/DsCard.vue'
import DsField from '@/components/DsField.vue'
import DsInput from '@/components/DsInput.vue'
import DsSelect from '@/components/DsSelect.vue'
import DsButton from '@/components/DsButton.vue'
import DsRadioGroup from '@/components/DsRadioGroup.vue'
import DsBadge from '@/components/DsBadge.vue'
import DsAlert from '@/components/DsAlert.vue'
import DsTable from '@/components/DsTable.vue'
import DsPagination from '@/components/DsPagination.vue'
import DsProgress from '@/components/DsProgress.vue'
import DsAvatar from '@/components/DsAvatar.vue'
import DsIcon from '@/components/DsIcon.vue'
import DsEmpty from '@/components/DsEmpty.vue'
import { apiState, setApiMode, setApiConfig, applyAdapter } from '@/api'
import { fetchUsers, createUser } from '@/api/modules/users'
import { STATUS_LABELS, STATUS_TONES } from '@/api/mock/data'
import { toast } from '@/components/toast'

const emptyUser = () => ({ id: '', name: '', email: '', role: '前端工程师', dept: '基础平台' })

export default {
  name: 'ApiLab',
  components: {
    PageHeader,
    DsCard,
    DsField,
    DsInput,
    DsSelect,
    DsButton,
    DsRadioGroup,
    DsBadge,
    DsAlert,
    DsTable,
    DsPagination,
    DsProgress,
    DsAvatar,
    DsIcon,
    DsEmpty,
  },
  data() {
    return {
      mode: apiState.mode,
      baseURL: apiState.baseURL,
      keyword: '',
      users: [],
      total: 0,
      page: 1,
      pageSize: 10,
      loading: false,
      submitting: false,
      hasLoaded: false,
      error: null,
      logs: [],
      newUser: emptyUser(),
      STATUS_LABELS,
      STATUS_TONES,
      modeOptions: [
        { label: 'Mock', value: 'mock' },
        { label: '真实接口', value: 'real' },
      ],
      roleOptions: ['前端工程师', '后端工程师', '产品经理', '交互设计师'].map((v) => ({
        label: v,
        value: v,
      })),
      deptOptions: ['基础平台', '增长中台', '交易前台', '数据智能'].map((v) => ({ label: v, value: v })),
      columns: [
        { key: 'name', title: '成员' },
        { key: 'role', title: '岗位' },
        { key: 'dept', title: '部门' },
        { key: 'status', title: '状态', width: '110px' },
        { key: 'progress', title: '完成度', width: '130px' },
        { key: 'updatedAt', title: '更新时间', width: '120px' },
      ],
      codeSnippet: `// 1) 定义业务模块 —— 只依赖 client，不关心数据源
import client from '@/api/client'

export function fetchUsers(params) {
  return client.get('/users', { params })
}

// 2) 组件里调用 —— 错误已被归一化成 { code, message, status }
async load() {
  this.loading = true
  this.error = null
  try {
    const res = await fetchUsers({ page: this.page, pageSize: this.pageSize })
    this.users = res.list
    this.total = res.total
  } catch (err) {
    this.error = err            // 直接把 err.message 渲染到界面
  } finally {
    this.loading = false
  }
}

// 3) 切换数据源（也可以放 .env：VITE_API_MODE=real）
import { setApiMode, applyAdapter } from '@/api'

setApiMode('real')   // 或 'mock'
applyAdapter()       // 让 axios 实例切换到对应 adapter`,
    }
  },
  computed: {
    apiState() {
      return apiState
    },
  },
  watch: {
    page() {
      this.load()
    },
    pageSize() {
      this.page = 1
      this.load()
    },
  },
  mounted() {
    this.load()
  },
  methods: {
    async load() {
      this.loading = true
      this.error = null
      const started = Date.now()
      try {
        const res = await fetchUsers({
          page: this.page,
          pageSize: this.pageSize,
          keyword: this.keyword,
        })
        this.users = res.list
        this.total = res.total
        this.hasLoaded = true
        this.pushLog('GET /users', `返回 ${res.list.length} 条 / 共 ${res.total} 条 · ${Date.now() - started}ms`, 'success')
      } catch (err) {
        this.error = err
        this.users = []
        this.total = 0
        this.pushLog('GET /users', `${err.code} · ${err.message}`, 'error')
      } finally {
        this.loading = false
      }
    },
    search() {
      this.page = 1
      this.load()
    },
    async submit() {
      if (!this.newUser.name) {
        this.error = { code: 'VALIDATION', message: '请填写姓名' }
        toast.error('请填写姓名')
        return
      }
      this.submitting = true
      try {
        const created = await createUser(this.newUser)
        this.newUser = Object.assign(emptyUser(), { id: created.id })
        this.pushLog('POST /users', `已创建 #${created.id}`, 'success')
        toast.success('成员创建成功')
        this.page = 1
        await this.load()
      } catch (err) {
        this.pushLog('POST /users', `${err.code} · ${err.message}`, 'error')
        toast.error(err.message)
      } finally {
        this.submitting = false
      }
    },
    resetNewUser() {
      this.newUser = emptyUser()
    },
    onModeChange(mode) {
      setApiMode(mode)
      if (mode === 'real') setApiConfig({ baseURL: this.baseURL })
      applyAdapter()
      this.$store.commit('app/SET_API_MODE', mode)
      this.pushLog('config', `数据源切换为 ${mode}`, 'success')
      toast.info(`已切换为 ${mode === 'mock' ? 'Mock' : '真实接口'}`)
    },
    pushLog(label, detail, tone) {
      this.logs.unshift({
        id: `${Date.now()}-${this.logs.length}`,
        label,
        detail,
        tone,
        at: new Date().toLocaleTimeString('zh-CN', { hour12: false }),
      })
      if (this.logs.length > 12) this.logs.pop()
    },
    clearLog() {
      this.logs = []
    },
    onRowClick(row) {
      toast.info(`选中 ${row.name}`)
    },
  },
}
</script>

<style scoped>
.lab-layout {
  display: grid;
  grid-template-columns: 320px 1fr;
  gap: var(--ds-space-5);
  align-items: start;
}

.lab-aside {
  display: flex;
  flex-direction: column;
  gap: var(--ds-space-4);
  position: sticky;
  top: calc(var(--ds-size-topbar) + var(--ds-space-5));
}

.lab-main {
  display: flex;
  flex-direction: column;
  gap: var(--ds-space-5);
  min-width: 0;
}

.panel-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--ds-space-3);
  flex-wrap: wrap;
  width: 100%;
}
.panel-title {
  font-size: var(--ds-font-size-md);
  font-weight: var(--ds-font-weight-semibold);
}

.lab-range {
  width: 100%;
  accent-color: var(--ds-color-brand);
}

.log-list {
  max-height: 260px;
  overflow: auto;
}
.log-item {
  display: flex;
  align-items: flex-start;
  gap: var(--ds-space-2);
  padding: var(--ds-space-2);
  border-radius: var(--ds-radius-sm);
  background: var(--ds-color-bg-subtle);
  font-size: var(--ds-font-size-2xs);
}
.log-item--error {
  color: var(--ds-color-danger-fg);
}
.log-item--success {
  color: var(--ds-color-fg-muted);
}
.log-item__body {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
}
.log-item__body code {
  color: var(--ds-color-fg);
}
.log-item__body span {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.log-item time {
  color: var(--ds-color-fg-subtle);
  font-variant-numeric: tabular-nums;
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
  line-height: 1.3;
  min-width: 0;
}
.cell-user__text small {
  font-size: var(--ds-font-size-2xs);
  color: var(--ds-color-fg-subtle);
}

.form-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: var(--ds-space-4);
}
@media (min-width: 768px) {
  .form-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

.code {
  margin: 0;
  padding: var(--ds-space-4);
  overflow-x: auto;
  background: var(--ds-color-bg-inset);
  border-radius: var(--ds-radius-md);
  font-size: var(--ds-font-size-xs);
  line-height: 1.75;
  color: var(--ds-color-fg);
}

@media (max-width: 1023px) {
  .lab-layout {
    grid-template-columns: 1fr;
  }
  .lab-aside {
    position: static;
  }
}
</style>
