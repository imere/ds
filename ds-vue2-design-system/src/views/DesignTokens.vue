<template>
  <div>
    <PageHeader title="设计令牌" subtitle="所有视觉属性都收敛为令牌：以 CSS 变量（--ds-*）注入根节点，主题切换不触发任何组件重渲染。下方所有改动都是即时生效的。">
      <template #actions>
        <DsBadge tone="brand">{{ Object.keys(themes).length }} 套主题</DsBadge>
        <DsBadge tone="info">{{ Object.keys(accents).length }} 种强调色</DsBadge>
        <DsBadge tone="neutral">{{ tokenCount }} 个令牌</DsBadge>
      </template>
    </PageHeader>

    <div class="tokens-layout">
      <!-- ============ 左侧：切换器 ============ -->
      <aside class="tokens-aside">
        <DsCard padding="md">
          <template #header><h3 class="panel-title">主题配置</h3></template>
          <ThemeSwitcher />
        </DsCard>
      </aside>

      <!-- ============ 右侧：令牌表 ============ -->
      <div class="tokens-main">
        <DsCard padding="md">
          <template #header>
            <div class="panel-head">
              <h3 class="panel-title">颜色令牌</h3>
              <DsInput v-model="keyword" size="sm" placeholder="搜索令牌…" prefix="search" clearable />
            </div>
          </template>

          <div class="token-groups">
            <section v-for="group in filteredColorGroups" :key="group.name">
              <h4 class="token-group__title">{{ group.label }}</h4>
              <div class="token-grid">
                <div v-for="t in group.items" :key="t.key" class="token-item">
                  <span class="token-item__swatch" :style="{ background: t.value }" />
                  <div class="token-item__meta">
                    <code class="token-item__key">{{ t.key }}</code>
                    <span class="token-item__value">{{ t.value }}</span>
                  </div>
                </div>
              </div>
            </section>
          </div>
        </DsCard>

        <DsCard padding="md">
          <template #header><h3 class="panel-title">尺度与动效</h3></template>
          <div class="token-groups">
            <section v-for="group in scaleGroups" :key="group.name">
              <h4 class="token-group__title">{{ group.label }}</h4>
              <div class="token-list">
                <div v-for="t in group.items" :key="t.key" class="token-row">
                  <code class="token-row__key">{{ t.key }}</code>
                  <span class="token-row__value">{{ t.value }}</span>
                  <span
                    v-if="group.preview === 'space' || group.preview === 'radius'"
                    class="token-row__preview"
                    :style="previewStyle(group.preview, t.value)"
                  />
                </div>
              </div>
            </section>
          </div>
        </DsCard>

        <DsCard padding="md">
          <template #header><h3 class="panel-title">在业务代码中使用</h3></template>
          <pre class="code"><code>{{ usageCode }}</code></pre>
        </DsCard>

        <DsCard padding="md">
          <template #header><h3 class="panel-title">运行时注册新主题</h3></template>
          <pre class="code"><code>{{ registerCode }}</code></pre>
        </DsCard>
      </div>
    </div>
  </div>
</template>

<script>
import PageHeader from '@/docs/components/PageHeader.vue'
import DsCard from '@/components/DsCard.vue'
import DsBadge from '@/components/DsBadge.vue'
import DsInput from '@/components/DsInput.vue'
import ThemeSwitcher from '@/docs/components/ThemeSwitcher.vue'

const COLOR_GROUPS = [
  { name: 'surface', label: '表面 Surface', match: /^color-(bg|overlay|skeleton)/ },
  { name: 'text', label: '文字 Text', match: /^color-(fg)/ },
  { name: 'border', label: '描边 Border', match: /^color-(border)/ },
  { name: 'brand', label: '品牌 Brand', match: /^color-(brand|focus)/ },
  { name: 'status', label: '语义色 Status', match: /^color-(success|warning|danger|info)/ },
]

export default {
  name: 'DesignTokens',
  components: { PageHeader, DsCard, DsBadge, DsInput, ThemeSwitcher },
  data() {
    return {
      keyword: '',
      usageCode: `/* 业务样式只消费令牌，永远不写死颜色 */
.my-panel {
  background: var(--ds-color-bg-elevated);
  border: 1px solid var(--ds-color-border);
  border-radius: var(--ds-radius-lg);
  padding: var(--ds-space-5);
  color: var(--ds-color-fg);
  box-shadow: var(--ds-shadow-md);
  transition: background-color var(--ds-motion-duration-base) var(--ds-motion-ease-standard);
}

@media (max-width: 767px) {
  .my-panel { padding: var(--ds-space-4); }
}`,
      registerCode: `import { useDs } from '@ds/vue2'
import { createTheme } from '@/theme/tokens'

const ds = useDs()

// 场景一：代码里注册（品牌定制）
ds.manager.registry.theme('brand-x', createTheme({
  label: '品牌 X',
  mode: 'light',
  color: { brand: '#0f766e', brandHover: '#115e59', fg: '#062b28', bg: '#f6fffb' },
}))

// 场景二：后台下发 JSON 直接灌入
fetch('/api/theme').then((r) => r.json()).then((cfg) => {
  ds.manager.registry.theme(cfg.name, createTheme(cfg))
})

ds.use('brand-x')   // 立即生效`,
    }
  },
  computed: {
    state() {
      return this.$ds.state
    },
    themes() {
      return this.$ds.manager.registry.listThemes()
    },
    accents() {
      return this.$ds.manager.registry.listAccents()
    },
    tokens() {
      return this.$ds.state.tokens
    },
    tokenCount() {
      return Object.keys(this.tokens).length
    },
    filteredColorGroups() {
      const kw = this.keyword.trim().toLowerCase()
      return COLOR_GROUPS.map((g) => ({
        ...g,
        items: Object.keys(this.tokens)
          .filter((k) => g.match.test(k) && (!kw || k.toLowerCase().includes(kw)))
          .map((k) => ({ key: `--ds-${k}`, value: this.tokens[k] })),
      })).filter((g) => g.items.length)
    },
    scaleGroups() {
      const t = this.tokens
      const pick = (prefix) =>
        Object.keys(t)
          .filter((k) => k.startsWith(prefix))
          .map((k) => ({ key: `--ds-${k}`, value: t[k] }))
      return [
        { name: 'space', label: '间距 Space', preview: 'space', items: pick('space-') },
        { name: 'radius', label: '圆角 Radius', preview: 'radius', items: pick('radius-') },
        { name: 'fontSize', label: '字号 Font Size', items: pick('font-size-') },
        { name: 'motion', label: '动效 Motion', items: pick('motion-') },
        { name: 'z', label: '层级 Z-Index', items: pick('z-') },
      ]
    },
  },
  methods: {
    previewStyle(kind, value) {
      if (kind === 'space') return { width: value, height: '12px', background: 'var(--ds-color-brand)', borderRadius: '2px' }
      return { width: '28px', height: '28px', background: 'var(--ds-color-brand-subtle)', border: '1px solid var(--ds-color-brand)', borderRadius: value }
    },
  },
}
</script>

<style scoped>
.tokens-layout {
  display: grid;
  grid-template-columns: 320px 1fr;
  gap: var(--ds-space-5);
  align-items: start;
}

.tokens-aside {
  position: sticky;
  top: calc(var(--ds-size-topbar) + var(--ds-space-5));
}

.tokens-main {
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
  width: 100%;
}
.panel-head .ds-input-wrap {
  width: 180px;
}
.panel-title {
  font-size: var(--ds-font-size-md);
  font-weight: var(--ds-font-weight-semibold);
  white-space: nowrap;
}

.token-groups {
  display: flex;
  flex-direction: column;
  gap: var(--ds-space-5);
}
.token-group__title {
  margin-bottom: var(--ds-space-3);
  font-size: var(--ds-font-size-xs);
  font-weight: var(--ds-font-weight-semibold);
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--ds-color-fg-subtle);
}

.token-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(210px, 1fr));
  gap: var(--ds-space-2);
}
.token-item {
  display: flex;
  align-items: center;
  gap: var(--ds-space-3);
  padding: var(--ds-space-2);
  border: 1px solid var(--ds-color-border-subtle);
  border-radius: var(--ds-radius-md);
  min-width: 0;
}
.token-item:hover {
  border-color: var(--ds-color-border-strong);
}
.token-item__swatch {
  width: 32px;
  height: 32px;
  border-radius: var(--ds-radius-sm);
  border: 1px solid var(--ds-color-border);
  flex: none;
}
.token-item__meta {
  display: flex;
  flex-direction: column;
  min-width: 0;
}
.token-item__key {
  font-size: 11px;
  color: var(--ds-color-fg);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.token-item__value {
  font-size: 10px;
  color: var(--ds-color-fg-subtle);
  font-family: var(--ds-font-family-mono);
}

.token-list {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
  gap: 2px var(--ds-space-4);
}
.token-row {
  display: flex;
  align-items: center;
  gap: var(--ds-space-2);
  padding: 4px 0;
  min-width: 0;
}
.token-row__key {
  flex: 1;
  font-size: 11px;
  color: var(--ds-color-fg-muted);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.token-row__value {
  font-size: 11px;
  color: var(--ds-color-fg-subtle);
  font-family: var(--ds-font-family-mono);
}
.token-row__preview {
  flex: none;
  border-radius: 2px;
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
  .tokens-layout {
    grid-template-columns: 1fr;
  }
  .tokens-aside {
    position: static;
  }
}
</style>
