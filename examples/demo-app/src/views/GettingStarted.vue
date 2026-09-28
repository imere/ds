<template>
  <div>
    <PageHeader title="快速开始" subtitle="Aurora DS 是一套面向中后台的 Vue 2 设计系统与组件库：Design Token 驱动多主题、移动优先的响应式布局、完整的键盘与读屏支持，并内置可一键切换的 API 层。">
      <template #actions>
        <DsButton variant="primary" icon="zap" to="/tokens">浏览设计令牌</DsButton>
        <DsButton variant="secondary" icon="grid" to="/components/button">查看组件</DsButton>
      </template>
    </PageHeader>

    <section class="hero">
      <div class="hero__panel">
        <DsTabs v-model="previewTab" :tabs="previewTabs" variant="pill">
          <template #overview>
            <div class="ds-grid ds-grid-sm">
              <div v-for="m in metrics" :key="m.key" class="metric">
                <span class="metric__label">{{ m.label }}</span>
                <strong class="metric__value">{{ formatNumber(m.value) }}</strong>
                <DsBadge :tone="m.delta >= 0 ? 'success' : 'danger'" size="sm">
                  {{ m.delta >= 0 ? '↑' : '↓' }} {{ Math.abs(m.delta) }}%
                </DsBadge>
              </div>
            </div>
          </template>
          <template #activity>
            <ul class="ds-stack ds-stack-3 activity">
              <li v-for="a in activities" :key="a.id" class="activity__item">
                <DsAvatar :name="a.user" size="sm" />
                <div class="activity__text">
                  <strong>{{ a.user }}</strong>
                  <span>{{ a.action }}</span>
                </div>
                <DsBadge :tone="a.tone" size="sm">{{ a.at }}</DsBadge>
              </li>
            </ul>
          </template>
        </DsTabs>
      </div>
    </section>

    <h2 class="section-title">核心特性</h2>
    <div class="ds-grid ds-grid-lg">
      <DsCard v-for="f in features" :key="f.title" hoverable padding="md">
        <template #header>
          <div class="feature__head">
            <span class="feature__icon"><DsIcon :name="f.icon" size="lg" /></span>
            <h3 class="feature__title">{{ f.title }}</h3>
          </div>
        </template>
        <p class="feature__desc">{{ f.desc }}</p>
        <template #footer>
          <DsBadge v-for="tag in f.tags" :key="tag" tone="brand" size="sm">{{ tag }}</DsBadge>
        </template>
      </DsCard>
    </div>

    <h2 class="section-title">安装与使用</h2>
    <div class="ds-grid ds-grid-lg">
      <DsCard padding="md">
        <template #header><h3 class="panel-title">全量注册</h3></template>
        <pre class="code"><code>{{ installCode }}</code></pre>
      </DsCard>
      <DsCard padding="md">
        <template #header><h3 class="panel-title">按需引入</h3></template>
        <pre class="code"><code>{{ importCode }}</code></pre>
      </DsCard>
    </div>

    <h2 class="section-title">目录结构</h2>
    <DsCard padding="md">
      <pre class="code code--tree"><code>{{ treeCode }}</code></pre>
    </DsCard>

    <h2 class="section-title">响应式与无障碍约定</h2>
    <div class="ds-grid">
      <DsCard padding="md">
        <template #header><h3 class="panel-title">断点</h3></template>
        <ul class="ds-stack ds-stack-2 rule-list">
          <li v-for="b in bpList" :key="b.name">
            <code>{{ b.name }}</code>
            <span>{{ b.range }}</span>
          </li>
        </ul>
      </DsCard>
      <DsCard padding="md">
        <template #header><h3 class="panel-title">约定</h3></template>
        <ul class="ds-stack ds-stack-2 rule-list rule-list--plain">
          <li>触控目标在小屏不小于 44px，输入框字号 ≥16px 防 iOS 缩放</li>
          <li>所有交互元素可键盘聚焦，焦点环使用 <code>--ds-color-focus</code></li>
          <li>表格在 &lt;768px 自动切换为卡片列表，不再横向滚动</li>
          <li>尊重 <code>prefers-reduced-motion</code> 与 <code>prefers-color-scheme</code></li>
          <li>语义化标签 + ARIA：dialog / listbox / switch / progressbar / tablist</li>
        </ul>
      </DsCard>
    </div>
  </div>
</template>

<script>
import PageHeader from '@/docs/components/PageHeader.vue'
import DsButton from '@/components/DsButton.vue'
import DsCard from '@/components/DsCard.vue'
import DsIcon from '@/components/DsIcon.vue'
import DsBadge from '@/components/DsBadge.vue'
import DsAvatar from '@/components/DsAvatar.vue'
import DsTabs from '@/components/DsTabs.vue'
import { metrics, activities } from '@/api/mock/data'
import { breakpointOrder } from '@ds/core'
import { defaultBreakpoints as breakpoints } from '@ds/tokens'
import { breakpointLabels } from '@/utils/breakpointLabels'

const bpOrder = breakpointOrder(breakpoints)

export default {
  name: 'GettingStarted',
  components: { PageHeader, DsButton, DsCard, DsIcon, DsBadge, DsAvatar, DsTabs },
  data() {
    return {
      metrics,
      activities,
      previewTab: 'overview',
      previewTabs: [
        { name: 'overview', label: '指标概览', icon: 'grid' },
        { name: 'activity', label: '团队动态', icon: 'bell' },
      ],
      features: [
        {
          icon: 'palette',
          title: 'Design Token 驱动',
          desc: '令牌以 CSS 变量注入 <html>，5 套明暗主题 × 6 种强调色自由组合，运行时改一个变量全站生效，无需重渲染。',
          tags: ['多主题', '运行时覆盖', '持久化'],
        },
        {
          icon: 'monitor',
          title: '移动优先响应式',
          desc: '断点系统与组件联动：小屏自动放大触控区、表格转卡片、侧边栏转抽屉、模态框贴底全屏。',
          tags: ['6 断点', 'useBreakpoint', '栅格工具'],
        },
        {
          icon: 'check',
          title: '无障碍内置',
          desc: '焦点管理、焦点可见、ARIA 语义、键盘导航、减少动效偏好，覆盖 dialog / listbox / switch 等复杂组件模式。',
          tags: ['WCAG 2.1 AA', '键盘可达', '读屏友好'],
        },
        {
          icon: 'layers',
          title: '26 个基础组件',
          desc: '从按钮到表格、从提示到抽屉，统一 API 风格与令牌消费方式，可直接用于生产。',
          tags: ['统一 API', '插槽丰富', '零三方 UI 依赖'],
        },
        {
          icon: 'database',
          title: '可切换 API 层',
          desc: 'axios 实例 + 自定义 mock adapter，一行切换真实后端；错误统一归一化，业务代码零感知。',
          tags: ['Mock/Real', '错误归一化', '请求拦截'],
        },
        {
          icon: 'code',
          title: '可测试',
          desc: 'Vitest + @vue/test-utils 覆盖令牌引擎与关键组件交互，npm test 即可回归。',
          tags: ['Vitest', 'jsdom', '交互测试'],
        },
      ],
      installCode: `// main.js
import Vue from 'vue'
import AuroraDS from '@/components'
import { installTheme } from '@/theme'          // 主题接线（@ds/core + @ds/dom + @ds/vue2）
import '@/styles/base.css'
import '@/styles/utilities.css'

installTheme(Vue)       // 必须在挂载前调用，避免首屏闪烁
Vue.use(AuroraDS)       // 注册全部 Ds* 组件

new Vue({ router, store, render: (h) => h(App) }).$mount('#app')`,
      importCode: `// 按需引入（Tree-shaking 友好）
import { DsButton, DsTable, toast } from '@/components'

export default {
  components: { DsButton, DsTable },
  methods: {
    async save() {
      await api.save()
      toast.success('保存成功')
    },
  },
}`,
      treeCode: `src/
├─ theme/                  属于这个产品的令牌数据
│  ├─ tokens.js            基础尺度 + 主题工厂
│  ├─ themes.js            5 套内置主题
│  ├─ accents.js           6 种强调色
│  └─ index.js             接线：把数据交给 @ds/dom，再装 @ds/vue2 插件
├─ composables/            useBreakpoint 响应式能力（接 @ds/core 的断点）
├─ components/             26 个基础组件 + toast
├─ api/                    axios 实例 / mock adapter / 业务模块
├─ store/                  Vuex 模块化状态
├─ router/                 文档站路由
├─ styles/                 base.css + utilities.css
└─ docs/                   文档站外壳与示例容器`,
    }
  },
  computed: {
    bpList() {
      return bpOrder.map((name, i) => {
        const start = breakpoints[name]
        const next = bpOrder[i + 1]
        const range = next ? `${start} – ${breakpoints[next] - 1}px` : `≥ ${start}px`
        return { name, range, label: breakpointLabels[name] }
      })
    },
  },
  methods: {
    formatNumber(v) {
      return Number(v).toLocaleString('zh-CN')
    },
  },
}
</script>

<style scoped>
.hero {
  margin-bottom: var(--ds-space-8);
}
.hero__panel {
  padding: var(--ds-space-5);
  border: 1px solid var(--ds-color-border);
  border-radius: var(--ds-radius-xl);
  background: linear-gradient(
    135deg,
    var(--ds-color-brand-subtle),
    var(--ds-color-bg-elevated) 55%
  );
}

.metric {
  display: flex;
  flex-direction: column;
  gap: var(--ds-space-1);
  padding: var(--ds-space-3);
  border: 1px solid var(--ds-color-border);
  border-radius: var(--ds-radius-md);
  background: var(--ds-color-bg-elevated);
}
.metric__label {
  font-size: var(--ds-font-size-xs);
  color: var(--ds-color-fg-muted);
}
.metric__value {
  font-size: var(--ds-font-size-2xl);
  font-weight: var(--ds-font-weight-bold);
  font-variant-numeric: tabular-nums;
  letter-spacing: -0.02em;
}

.activity__item {
  display: flex;
  align-items: center;
  gap: var(--ds-space-3);
  padding: var(--ds-space-2);
  border-radius: var(--ds-radius-md);
}
.activity__item:hover {
  background: var(--ds-color-bg-hover);
}
.activity__text {
  flex: 1;
  min-width: 0;
  font-size: var(--ds-font-size-sm);
  color: var(--ds-color-fg-muted);
}
.activity__text strong {
  color: var(--ds-color-fg);
  margin-right: var(--ds-space-2);
}

.section-title {
  margin: var(--ds-space-8) 0 var(--ds-space-4);
  font-size: var(--ds-font-size-xl);
  font-weight: var(--ds-font-weight-semibold);
}

.feature__head {
  display: flex;
  align-items: center;
  gap: var(--ds-space-3);
}
.feature__icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border-radius: var(--ds-radius-md);
  background: var(--ds-color-brand-subtle);
  color: var(--ds-color-brand-fg);
  flex: none;
}
.feature__title {
  font-size: var(--ds-font-size-md);
  font-weight: var(--ds-font-weight-semibold);
}
.feature__desc {
  font-size: var(--ds-font-size-sm);
  color: var(--ds-color-fg-muted);
  line-height: var(--ds-line-height-relaxed);
}

.panel-title {
  font-size: var(--ds-font-size-md);
  font-weight: var(--ds-font-weight-semibold);
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
  tab-size: 2;
}
.code--tree {
  font-size: 11.5px;
  line-height: 1.85;
}

.rule-list {
  font-size: var(--ds-font-size-sm);
  color: var(--ds-color-fg-muted);
}
.rule-list li {
  display: flex;
  align-items: center;
  gap: var(--ds-space-3);
  line-height: 1.6;
}
.rule-list--plain li::before {
  content: '';
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: var(--ds-color-brand);
  flex: none;
}
.rule-list code {
  padding: 1px 6px;
  border-radius: var(--ds-radius-sm);
  background: var(--ds-color-bg-inset);
  color: var(--ds-color-fg);
}

@media (max-width: 639px) {
  .hero__panel {
    padding: var(--ds-space-4);
  }
}
</style>
