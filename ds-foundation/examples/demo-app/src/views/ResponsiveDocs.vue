<template>
  <div>
    <PageHeader title="响应式" subtitle="断点系统由 JS 与 CSS 共用同一份定义：组件能感知断点（表格转卡片、侧边栏转抽屉），样式也能用工具类直接命中同一组断点，两边永不脱节。">
      <template #actions>
        <DsBadge :tone="isMobile ? 'warning' : 'success'" dot>
          {{ bpName }} · {{ width }}px
        </DsBadge>
      </template>
    </PageHeader>

    <DemoBlock title="实时断点" description="拖动浏览器窗口，下面所有数值与组件形态会同步变化。" :code="bpCode" block>
      <div class="bp-grid">
        <div v-for="b in bpList" :key="b.name" class="bp-cell" :class="{ 'is-current': b.name === bpName }">
          <DsIcon :name="b.icon" size="md" />
          <span class="bp-cell__name">{{ b.name }}</span>
          <span class="bp-cell__range">{{ b.range }}</span>
        </div>
      </div>
      <div class="bp-readout">
        <div><span>视口宽度</span><strong>{{ bp.width }}px</strong></div>
        <div><span>视口高度</span><strong>{{ bp.height }}px</strong></div>
        <div><span>当前断点</span><strong>{{ bp.name }}</strong></div>
        <div><span>设备归类</span><strong>{{ deviceLabel }}</strong></div>
        <div><span>触屏设备</span><strong>{{ isTouch ? '是' : '否' }}</strong></div>
      </div>
    </DemoBlock>

    <DemoBlock title="可拖拽预览框" description="拖住右侧手柄改变容器宽度，观察内部组件在不同容器宽度下的表现（组件级响应式，而非仅视口响应式）。" :code="previewCode" block>
      <div class="preview-bar">
        <DsRadioGroup v-model="preset" :options="presets" variant="button" size="sm" />
        <span class="preview-bar__width">{{ previewWidth }}px</span>
        <DsButton size="sm" variant="ghost" icon="refresh" @click="previewWidth = 900">重置</DsButton>
      </div>

      <div ref="frame" class="preview-frame" :style="{ width: previewWidth + 'px' }">
        <div class="preview-frame__body">
          <DsCard padding="md" horizontal>
            <template #media>
              <div class="fake-media"><DsIcon name="layers" size="xl" /></div>
            </template>
            <template #header>
              <div>
                <h4 class="mini-title">容器查询式布局</h4>
                <p class="mini-sub">宽度 &lt;768px 时自动堆叠</p>
              </div>
            </template>
            <p class="mini-text">
              当前容器宽度 {{ previewWidth }}px，{{ previewWidth < 768 ? '已切换为上下堆叠' : '保持左右排列' }}。
            </p>
          </DsCard>

          <DsTable :columns="miniColumns" :data="rows" :responsive="true" class="preview-table" />
        </div>
        <div class="preview-frame__handle" @mousedown="startDrag" @touchstart="startDrag" />
      </div>
    </DemoBlock>

    <DemoBlock title="自适应栅格" description="grid 使用 auto-fit + minmax，不写死列数，容器多宽就放几列。" :code="gridCode" block>
      <div class="ds-grid ds-grid-sm">
        <div v-for="i in 8" :key="i" class="grid-demo">auto-fit · 160px</div>
      </div>
      <div class="ds-grid ds-grid-lg">
        <div v-for="i in 3" :key="i" class="grid-demo">auto-fit · 320px</div>
      </div>
    </DemoBlock>

    <DemoBlock title="显隐工具类" description="同一份 DOM，用工具类按断点控制显隐，避免重复渲染两套结构。" :code="utilityCode" block>
      <div class="utility-demo">
        <div class="utility-box utility-box--a">.ds-hide-mobile —— 手机隐藏</div>
        <div class="utility-box utility-box--b">.ds-hide-tablet-up —— 平板及以上隐藏</div>
        <div class="utility-box utility-box--c">.ds-hide-below-desktop —— 桌面以下隐藏</div>
      </div>
      <p class="mini-text">
        当前可见：
        <DsBadge tone="brand">A {{ !isMobile ? '显示' : '隐藏' }}</DsBadge>
        <DsBadge tone="info">B {{ width < 768 ? '显示' : '隐藏' }}</DsBadge>
        <DsBadge tone="success">C {{ width >= 1024 ? '显示' : '隐藏' }}</DsBadge>
      </p>
    </DemoBlock>

    <DemoBlock title="触控与输入适配" description="移动端控件高度提升到 ≥42px，输入框字号 ≥16px，避免 iOS 聚焦时页面自动放大。" :code="touchCode" block>
      <div class="ds-cluster ds-cluster-4">
        <DsButton size="sm" variant="secondary">小按钮</DsButton>
        <DsButton size="md" variant="primary">中按钮</DsButton>
        <DsInput placeholder="移动端 16px" style="max-width: 220px" />
        <DsSwitch :value="true">开关</DsSwitch>
        <DsCheckbox :model-value="true">复选</DsCheckbox>
        <DsRadio :model-value="1" :value="1">单选</DsRadio>
      </div>
    </DemoBlock>

    <h2 class="section-title">useBreakpoint</h2>
    <ApiTable :rows="apiRows" />
  </div>
</template>

<script>
import PageHeader from '@/docs/components/PageHeader.vue'
import DemoBlock from '@/docs/components/DemoBlock.vue'
import ApiTable from '@/docs/components/ApiTable.vue'
import DsBadge from '@/components/DsBadge.vue'
import DsIcon from '@/components/DsIcon.vue'
import DsCard from '@/components/DsCard.vue'
import DsTable from '@/components/DsTable.vue'
import DsRadioGroup from '@/components/DsRadioGroup.vue'
import DsButton from '@/components/DsButton.vue'
import DsInput from '@/components/DsInput.vue'
import DsSwitch from '@/components/DsSwitch.vue'
import DsCheckbox from '@/components/DsCheckbox.vue'
import DsRadio from '@/components/DsRadio.vue'
import { useBreakpoint } from '@/composables/useBreakpoint'
import { breakpointOrder } from '@ds/core'
import { defaultBreakpoints as breakpoints } from '@ds/tokens'
import { breakpointLabels } from '@/utils/breakpointLabels'

const BP_ICONS = { xs: 'smartphone', sm: 'smartphone', md: 'tablet', lg: 'monitor', xl: 'monitor', xxl: 'monitor' }

export default {
  name: 'ResponsiveDocs',
  components: {
    PageHeader,
    DemoBlock,
    ApiTable,
    DsBadge,
    DsIcon,
    DsCard,
    DsTable,
    DsRadioGroup,
    DsButton,
    DsInput,
    DsSwitch,
    DsCheckbox,
    DsRadio,
  },
  setup() {
    const bp = useBreakpoint()
    return { bp }
  },
  data() {
    return {
      previewWidth: 900,
      preset: 'auto',
      presets: [
        { label: '手机 375', value: '375' },
        { label: '平板 768', value: '768' },
        { label: '桌面 1280', value: '1280' },
        { label: '自适应', value: 'auto' },
      ],
      miniColumns: [
        { key: 'name', title: '名称' },
        { key: 'value', title: '数值' },
        { key: 'desc', title: '说明' },
      ],
      rows: [
        { id: 1, name: '列宽', value: 'auto', desc: '按内容自适应' },
        { id: 2, name: '模式', value: 'auto', desc: '窄容器转卡片' },
      ],
      bpCode: `import { useBreakpoint } from '@/composables/useBreakpoint'

setup() {
  const bp = useBreakpoint()
  return { bp }
}

// 模板里：bp.isMobile.value / bp.up('lg').value / bp.name.value`,
      previewCode: `<div class="frame" :style="{ width: width + 'px' }">
  <DsCard horizontal>...</DsCard>
  <DsTable :columns="columns" :data="rows" />
  <div class="handle" @mousedown="startDrag" />
</div>`,
      gridCode: `<div class="ds-grid ds-grid-sm">  <!-- minmax(160px, 1fr) -->
  <div>...</div>
</div>`,
      utilityCode: `<div class="ds-hide-mobile">手机隐藏</div>
<div class="ds-hide-tablet-up">平板及以上隐藏</div>
<div class="ds-hide-below-desktop">桌面以下隐藏</div>`,
      touchCode: `.ds-btn--md { height: 36px; }
@media (max-width: 767px) {
  .ds-btn--md { height: 42px; }
  .ds-input--md { height: 42px; font-size: 16px; }
}`,
      apiRows: [
        { name: 'bp.width / height', type: 'Ref<Number>', default: '—', desc: '视口尺寸，响应式' },
        { name: 'bp.name', type: "Ref<'xs'|'sm'|'md'|'lg'|'xl'|'xxl'>", default: '—', desc: '当前断点名' },
        { name: 'bp.up(key)', type: 'Function → Ref<Boolean>', default: '—', desc: '是否 ≥ 某断点' },
        { name: 'bp.down(key)', type: 'Function → Ref<Boolean>', default: '—', desc: '是否 < 某断点' },
        { name: 'bp.between(a, b)', type: 'Function → Ref<Boolean>', default: '—', desc: '是否落在区间内' },
        { name: 'bp.isMobile / isTablet / isDesktop', type: 'Ref<Boolean>', default: '—', desc: '设备归类快捷方式' },
        { name: 'bp.isTouch', type: 'Ref<Boolean>', default: '—', desc: '触屏且非大屏' },
        { name: 'breakpointMixin', type: 'Mixin', default: '—', desc: '选项式 API 版本，注入 this.bp' },
      ],
    }
  },
  computed: {
    width() {
      return this.bp.width.value
    },
    height() {
      return this.bp.height.value
    },
    bpName() {
      return this.bp.name.value
    },
    isMobile() {
      return this.bp.width.value < 768
    },
    isTouch() {
      return this.bp.isTouch.value
    },
    deviceLabel() {
      if (this.bp.isMobile.value) return '手机'
      if (this.bp.isTablet.value) return '平板'
      return '桌面'
    },
    bpList() {
      return breakpointOrder(breakpoints).map((name, i, arr) => {
        const start = breakpoints[name]
        const next = arr[i + 1]
        return {
          name,
          icon: BP_ICONS[name],
          range: next ? `${start}–${breakpoints[next] - 1}` : `≥${start}`,
          label: breakpointLabels[name],
        }
      })
    },
  },
  watch: {
    preset(v) {
      if (v !== 'auto') this.previewWidth = Number(v)
    },
  },
  beforeDestroy() {
    this.stopDrag()
  },
  methods: {
    startDrag(e) {
      e.preventDefault()
      this.dragging = true
      this.startX = e.touches ? e.touches[0].clientX : e.clientX
      this.startWidth = this.previewWidth
      window.addEventListener('mousemove', this.onDrag)
      window.addEventListener('mouseup', this.stopDrag)
      window.addEventListener('touchmove', this.onDrag)
      window.addEventListener('touchend', this.stopDrag)
    },
    onDrag(e) {
      if (!this.dragging) return
      const x = e.touches ? e.touches[0].clientX : e.clientX
      const next = this.startWidth + (x - this.startX)
      const max = (this.$refs.frame && this.$refs.frame.parentElement.clientWidth) || 1200
      this.previewWidth = Math.max(280, Math.min(next, max))
      this.preset = 'auto'
    },
    stopDrag() {
      this.dragging = false
      window.removeEventListener('mousemove', this.onDrag)
      window.removeEventListener('mouseup', this.stopDrag)
      window.removeEventListener('touchmove', this.onDrag)
      window.removeEventListener('touchend', this.stopDrag)
    },
  },
}
</script>

<style scoped>
.bp-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
  gap: var(--ds-space-2);
  width: 100%;
}
.bp-cell {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: var(--ds-space-3);
  border: 1px solid var(--ds-color-border);
  border-radius: var(--ds-radius-md);
  background: var(--ds-color-bg-subtle);
  color: var(--ds-color-fg-muted);
}
.bp-cell.is-current {
  border-color: var(--ds-color-brand);
  background: var(--ds-color-brand-subtle);
  color: var(--ds-color-brand-fg);
}
.bp-cell__name {
  font-size: var(--ds-font-size-md);
  font-weight: var(--ds-font-weight-semibold);
}
.bp-cell__range {
  font-size: var(--ds-font-size-2xs);
  opacity: 0.75;
}

.bp-readout {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(130px, 1fr));
  gap: var(--ds-space-3);
  width: 100%;
  padding: var(--ds-space-4);
  border: 1px dashed var(--ds-color-border);
  border-radius: var(--ds-radius-md);
}
.bp-readout div {
  display: flex;
  flex-direction: column;
}
.bp-readout span {
  font-size: var(--ds-font-size-2xs);
  color: var(--ds-color-fg-subtle);
}
.bp-readout strong {
  font-size: var(--ds-font-size-lg);
  font-variant-numeric: tabular-nums;
}

.preview-bar {
  display: flex;
  align-items: center;
  gap: var(--ds-space-3);
  flex-wrap: wrap;
  width: 100%;
}
.preview-bar__width {
  font-size: var(--ds-font-size-xs);
  color: var(--ds-color-fg-muted);
  font-variant-numeric: tabular-nums;
}

.preview-frame {
  position: relative;
  max-width: 100%;
  min-width: 280px;
  margin-top: var(--ds-space-2);
  padding-right: 14px;
  border: 1px dashed var(--ds-color-border-strong);
  border-radius: var(--ds-radius-lg);
}
.preview-frame__body {
  display: flex;
  flex-direction: column;
  gap: var(--ds-space-4);
  padding: var(--ds-space-4);
  overflow: hidden;
}
.preview-frame__handle {
  position: absolute;
  top: 0;
  right: 0;
  bottom: 0;
  width: 14px;
  cursor: col-resize;
  background: repeating-linear-gradient(
    180deg,
    var(--ds-color-border-strong) 0 2px,
    transparent 2px 8px
  );
  border-radius: 0 var(--ds-radius-lg) var(--ds-radius-lg) 0;
}
.preview-frame__handle:hover {
  background-color: var(--ds-color-brand-subtle);
}

.fake-media {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 110px;
  color: var(--ds-color-fg-subtle);
  background: linear-gradient(135deg, var(--ds-color-brand-subtle), transparent);
}
.mini-title {
  font-size: var(--ds-font-size-md);
  font-weight: var(--ds-font-weight-semibold);
}
.mini-sub,
.mini-text {
  font-size: var(--ds-font-size-xs);
  color: var(--ds-color-fg-muted);
}

.grid-demo {
  padding: var(--ds-space-3);
  border: 1px solid var(--ds-color-border);
  border-radius: var(--ds-radius-md);
  background: var(--ds-color-bg-subtle);
  font-size: var(--ds-font-size-xs);
  color: var(--ds-color-fg-muted);
  text-align: center;
}

.utility-demo {
  display: flex;
  flex-direction: column;
  gap: var(--ds-space-2);
  width: 100%;
}
.utility-box {
  padding: var(--ds-space-3);
  border-radius: var(--ds-radius-md);
  font-size: var(--ds-font-size-xs);
}
.utility-box--a {
  background: var(--ds-color-brand-subtle);
  color: var(--ds-color-brand-fg);
}
.utility-box--b {
  background: var(--ds-color-info-subtle);
  color: var(--ds-color-info-fg);
}
.utility-box--c {
  background: var(--ds-color-success-subtle);
  color: var(--ds-color-success-fg);
}

.section-title {
  margin: var(--ds-space-8) 0 var(--ds-space-4);
  font-size: var(--ds-font-size-xl);
  font-weight: var(--ds-font-weight-semibold);
}
</style>
