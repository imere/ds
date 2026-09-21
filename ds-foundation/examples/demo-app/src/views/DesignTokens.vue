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
          <template #header>
            <h3 class="panel-title">派生主题：给一个种子色，算出整套令牌</h3>
          </template>
          <p class="panel-desc">
            上面 5 套主题是手写的（每个色值都人挑）。这里走另一条路：<code>seed</code> 只给一个品牌色，
            经 <code>algorithm</code> 管道算出 hover / active / subtle / 语义色 / 中性色阶。
            改下面任一开关都会立刻重算并应用到整站 —— 一次 <code>registry.theme()</code>，
            没有一个色值是手写的。
          </p>

          <p v-if="accentActive" class="panel-note">
            当前强调色「{{ accentLabel }}」正在接管品牌色（强调色的优先级高于主题），
            所以下面的种子色现在改不动 <code>color-brand</code> 一族。
            想看派生结果，先在主题面板里切回「跟随主题」。
          </p>

          <div class="derive">
            <div class="derive__controls">
              <div class="derive__field">
                <label for="seed-brand">种子品牌色</label>
                <div class="derive__color">
                  <input id="seed-brand" v-model="seedBrand" type="color" />
                  <code>{{ seedBrand }}</code>
                </div>
              </div>
              <DsSwitch v-model="seedDark">暗色（追加 darkAlgorithm）</DsSwitch>
              <DsSwitch v-model="seedCompact">紧凑（追加 compactAlgorithm）</DsSwitch>
              <DsButton size="sm" variant="primary" @click="applyDerived">生成并应用</DsButton>
            </div>

            <div class="derive__result">
              <div v-for="s in derivedSwatches" :key="s.key" class="derive__swatch">
                <span class="derive__chip" :style="{ background: s.value }" />
                <span class="derive__key">{{ s.key }}</span>
                <code>{{ s.value }}</code>
              </div>
            </div>

            <pre class="code"><code>{{ deriveCode }}</code></pre>
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
import DsButton from '@/components/DsButton.vue'
import DsInput from '@/components/DsInput.vue'
import DsSwitch from '@/components/DsSwitch.vue'
import ThemeSwitcher from '@/docs/components/ThemeSwitcher.vue'
import { createDerivedTheme, defaultAlgorithm, darkAlgorithm, compactAlgorithm } from '@/theme/derived'

const COLOR_GROUPS = [
  { name: 'surface', label: '表面 Surface', match: /^color-(bg|overlay|skeleton)/ },
  { name: 'text', label: '文字 Text', match: /^color-(fg)/ },
  { name: 'border', label: '描边 Border', match: /^color-(border)/ },
  { name: 'brand', label: '品牌 Brand', match: /^color-(brand|focus)/ },
  { name: 'status', label: '语义色 Status', match: /^color-(success|warning|danger|info)/ },
]

export default {
  name: 'DesignTokens',
  components: { PageHeader, DsCard, DsBadge, DsButton, DsInput, DsSwitch, ThemeSwitcher },
  data() {
    return {
      keyword: '',
      seedBrand: '#0d9480',
      seedDark: false,
      seedCompact: false,
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
    /**
     * 强调色是盖在主题之上的一层，会把 brand 一族整组换掉。
     * 演示派生主题时必须知道它在不在 —— 否则「改了种子色没反应」会让人以为是派生失灵。
     */
    accentActive() {
      return !!this.$ds.state.accent
    },
    accentLabel() {
      const reg = this.$ds.manager.registry
      const def = reg.getAccent()
      return def ? def.label : ''
    },
    /** 页面上那张派生演示卡里展示的 6 个令牌，全部来自当前生效的令牌表 */
    derivedSwatches() {
      const keys = [
        'color-brand',
        'color-brand-hover',
        'color-brand-active',
        'color-brand-subtle',
        'color-bg',
        'color-fg',
      ]
      return keys.map((k) => ({ key: `--ds-${k}`, value: this.tokens[k] || '' }))
    },
    deriveCode() {
      const list = ['defaultAlgorithm']
      if (this.seedDark) list.push('darkAlgorithm')
      if (this.seedCompact) list.push('compactAlgorithm')
      return `import { createDerivedTheme, ${list.join(', ')} } from '@/theme/derived'

registry.theme('derived', createDerivedTheme({
  label: '派生 ${this.seedBrand}',
  mode: '${this.seedDark ? 'dark' : 'light'}',
  seed: { color: { brand: '${this.seedBrand}' } },
  algorithm: [${list.join(', ')}],
}))
ds.use('derived')`
    },
  },
  methods: {
    /** 重算一遍派生主题并立即应用到整站 */
    applyDerived() {
      const algorithm = [defaultAlgorithm]
      if (this.seedDark) algorithm.push(darkAlgorithm)
      if (this.seedCompact) algorithm.push(compactAlgorithm)

      const def = createDerivedTheme({
        label: `派生 ${this.seedBrand}`,
        mode: this.seedDark ? 'dark' : 'light',
        seed: { color: { brand: this.seedBrand } },
        algorithm,
      })
      this.$ds.manager.registry.theme('derived', def)
      this.$ds.use('derived')
    },
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

.panel-desc {
  margin-bottom: var(--ds-space-4);
  font-size: var(--ds-font-size-xs);
  line-height: 1.7;
  color: var(--ds-color-fg-muted);
}
.panel-desc code {
  padding: 1px 5px;
  border-radius: var(--ds-radius-sm);
  background: var(--ds-color-bg-inset);
  color: var(--ds-color-fg);
}

.panel-note {
  margin-bottom: var(--ds-space-4);
  padding: var(--ds-space-3);
  border: 1px solid var(--ds-color-warning-border, var(--ds-color-warning));
  border-left-width: 3px;
  border-radius: var(--ds-radius-sm);
  background: var(--ds-color-warning-subtle);
  font-size: var(--ds-font-size-xs);
  line-height: 1.7;
  color: var(--ds-color-warning-fg);
}
.panel-note code {
  padding: 1px 5px;
  border-radius: var(--ds-radius-sm);
  background: var(--ds-color-bg-inset);
}

.derive {
  display: flex;
  flex-direction: column;
  gap: var(--ds-space-4);
}
.derive__controls {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--ds-space-4);
  font-size: var(--ds-font-size-xs);
  color: var(--ds-color-fg-muted);
}
.derive__field {
  display: flex;
  align-items: center;
  gap: var(--ds-space-2);
}
.derive__color {
  display: flex;
  align-items: center;
  gap: var(--ds-space-2);
}
.derive__color input[type='color'] {
  width: 44px;
  height: 28px;
  padding: 0;
  border: 1px solid var(--ds-color-border);
  border-radius: var(--ds-radius-sm);
  background: transparent;
}
.derive__color code {
  padding: 2px 6px;
  border-radius: var(--ds-radius-sm);
  background: var(--ds-color-bg-inset);
  color: var(--ds-color-fg);
}

.derive__result {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(210px, 1fr));
  gap: var(--ds-space-2);
}
.derive__swatch {
  display: flex;
  align-items: center;
  gap: var(--ds-space-2);
  padding: var(--ds-space-2);
  border: 1px solid var(--ds-color-border-subtle);
  border-radius: var(--ds-radius-md);
  background: var(--ds-color-bg-subtle);
  font-size: var(--ds-font-size-xs);
}
.derive__chip {
  flex: none;
  width: 22px;
  height: 22px;
  border: 1px solid var(--ds-color-border);
  border-radius: var(--ds-radius-sm);
}
.derive__key {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: var(--ds-color-fg-muted);
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
