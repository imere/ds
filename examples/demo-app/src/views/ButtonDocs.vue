<template>
  <div>
    <PageHeader title="按钮 Button" subtitle="按钮用于触发即时操作。7 种变体覆盖主要 / 次要 / 危险 / 链接等语义，4 种尺寸适配不同密度，移动端自动放大触控区域。">
      <template #actions>
        <DsBadge tone="success">无第三方依赖</DsBadge>
      </template>
    </PageHeader>

    <DemoBlock
      title="变体"
      description="primary 用于页面唯一主操作，secondary 用于常规操作，danger 用于破坏性操作。"
      :code="variantCode"
    >
      <DsButton variant="primary">主要按钮</DsButton>
      <DsButton variant="secondary">次要按钮</DsButton>
      <DsButton variant="ghost">幽灵按钮</DsButton>
      <DsButton variant="subtle">弱化按钮</DsButton>
      <DsButton variant="danger">删除</DsButton>
      <DsButton variant="success">通过</DsButton>
      <DsButton variant="link">文字链接</DsButton>
    </DemoBlock>

    <DemoBlock title="尺寸" description="xs / sm / md / lg，移动端自动提升至 ≥42px 触控高度。" :code="sizeCode">
      <DsButton size="xs" variant="secondary">超小 xs</DsButton>
      <DsButton size="sm" variant="secondary">小 sm</DsButton>
      <DsButton size="md" variant="secondary">中 md</DsButton>
      <DsButton size="lg" variant="secondary">大 lg</DsButton>
    </DemoBlock>

    <DemoBlock title="状态" description="加载态会禁用点击并显示旋转指示器；禁用态保留布局但去除交互。" :code="stateCode">
      <DsButton variant="primary" :loading="loading" @click="fakeSubmit">点击加载</DsButton>
      <DsButton variant="secondary" loading>提交中</DsButton>
      <DsButton variant="secondary" disabled>禁用</DsButton>
      <DsButton variant="primary" disabled>禁用主要</DsButton>
    </DemoBlock>

    <DemoBlock
      title="图标"
      description="icon / iconRight 插入图标，iconOnly 用于纯图标按钮（记得提供 aria-label）。"
      :code="iconCode"
    >
      <DsButton variant="primary" icon="plus">新建</DsButton>
      <DsButton variant="secondary" icon="download">导出</DsButton>
      <DsButton variant="secondary" icon="filter" icon-right="chevronDown">筛选</DsButton>
      <DsButton variant="ghost" icon="refresh" icon-only aria-label="刷新" />
      <DsButton variant="ghost" icon="trash" icon-only aria-label="删除" />
      <DsButton variant="ghost" icon="external" href="https://v2.vuejs.org/" target="_blank">外部链接</DsButton>
    </DemoBlock>

    <DemoBlock title="块级与圆角" description="block 撑满父容器，常用于移动端表单提交；round 用于强调型 CTA。" :code="blockCode">
      <div style="width: 100%; max-width: 420px" class="ds-stack ds-stack-3">
        <DsButton variant="primary" block size="lg" round>立即开始</DsButton>
        <DsButton variant="secondary" block>稍后再说</DsButton>
      </div>
    </DemoBlock>

    <h2 class="section-title">API</h2>
    <ApiTable :rows="props" />
  </div>
</template>

<script>
import PageHeader from '@/docs/components/PageHeader.vue'
import DemoBlock from '@/docs/components/DemoBlock.vue'
import ApiTable from '@/docs/components/ApiTable.vue'
import DsButton from '@/components/DsButton.vue'
import DsBadge from '@/components/DsBadge.vue'
import { toast } from '@/components/toast'

export default {
  name: 'ButtonDocs',
  components: { PageHeader, DemoBlock, ApiTable, DsButton, DsBadge },
  data() {
    return {
      loading: false,
      variantCode: `<DsButton variant="primary">主要按钮</DsButton>
<DsButton variant="secondary">次要按钮</DsButton>
<DsButton variant="ghost">幽灵按钮</DsButton>
<DsButton variant="subtle">弱化按钮</DsButton>
<DsButton variant="danger">删除</DsButton>
<DsButton variant="success">通过</DsButton>
<DsButton variant="link">文字链接</DsButton>`,
      sizeCode: `<DsButton size="xs">超小</DsButton>
<DsButton size="sm">小</DsButton>
<DsButton size="md">中</DsButton>
<DsButton size="lg">大</DsButton>`,
      stateCode: `<DsButton :loading="loading" @click="submit">点击加载</DsButton>
<DsButton loading>提交中</DsButton>
<DsButton disabled>禁用</DsButton>`,
      iconCode: `<DsButton variant="primary" icon="plus">新建</DsButton>
<DsButton icon="download">导出</DsButton>
<DsButton icon="filter" icon-right="chevronDown">筛选</DsButton>
<DsButton icon="refresh" icon-only aria-label="刷新" />`,
      blockCode: `<DsButton variant="primary" block size="lg" round>立即开始</DsButton>
<DsButton variant="secondary" block>稍后再说</DsButton>`,
      props: [
        { name: 'variant', type: 'primary | secondary | ghost | subtle | danger | success | link', default: 'secondary', desc: '视觉变体' },
        { name: 'size', type: 'xs | sm | md | lg', default: 'md', desc: '尺寸，移动端自动放大' },
        { name: 'block', type: 'Boolean', default: 'false', desc: '撑满父容器宽度' },
        { name: 'loading', type: 'Boolean', default: 'false', desc: '加载态，自动禁用点击' },
        { name: 'disabled', type: 'Boolean', default: 'false', desc: '禁用态' },
        { name: 'round', type: 'Boolean', default: 'false', desc: '全圆角' },
        { name: 'icon / iconRight', type: 'String', default: "''", desc: '内置图标名，见 DsIcon' },
        { name: 'iconOnly', type: 'Boolean', default: 'false', desc: '纯图标按钮，需配合 aria-label' },
        { name: 'href', type: 'String', default: "''", desc: '传入则渲染为 <a>' },
        { name: 'to', type: 'String | Object', default: 'null', desc: '传入则渲染为 router-link' },
        { name: 'nativeType', type: 'button | submit | reset', default: 'button', desc: '原生 type' },
        { name: 'ariaLabel', type: 'String', default: "''", desc: '无障碍标签' },
      ],
    }
  },
  methods: {
    fakeSubmit() {
      this.loading = true
      setTimeout(() => {
        this.loading = false
        toast.success('操作成功')
      }, 1200)
    },
  },
}
</script>

<style scoped>
.section-title {
  margin: var(--ds-space-8) 0 var(--ds-space-4);
  font-size: var(--ds-font-size-xl);
  font-weight: var(--ds-font-weight-semibold);
}
</style>
