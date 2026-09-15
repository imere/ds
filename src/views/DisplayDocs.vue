<template>
  <div>
    <PageHeader title="数据展示 Display" subtitle="卡片、徽标、标签、头像、进度、骨架屏与空状态，覆盖中后台最常见的静态展示场景，全部跟随主题令牌自动换肤。">
      <template #actions>
        <DsBadge tone="info">全部支持插槽</DsBadge>
      </template>
    </PageHeader>

    <DemoBlock title="卡片 Card" description="四种视觉层级 + 可选头图、操作区、页脚；horizontal 在 ≥768px 左右排布，小屏自动堆叠。" :code="cardCode" block>
      <div class="ds-grid ds-grid-lg">
        <DsCard title="团队空间" subtitle="12 名成员 · 3 个项目" hoverable padding="md">
          <p>卡片正文区域，用于承载描述性内容。悬停时抬升阴影，暗示可点击。</p>
          <template #footer>
            <DsButton size="sm" variant="primary">进入</DsButton>
            <DsButton size="sm" variant="ghost">邀请成员</DsButton>
          </template>
        </DsCard>

        <DsCard variant="outlined" padding="md">
          <template #header>
            <div>
              <h3 class="mini-title">本月进度</h3>
              <p class="mini-sub">已完成 68%，剩余 4 天</p>
            </div>
          </template>
          <DsProgress :value="68" show-value label="迭代完成度" />
          <template #footer>
            <DsBadge tone="success" dot>正常</DsBadge>
            <DsBadge tone="info">Sprint 24</DsBadge>
          </template>
        </DsCard>

        <DsCard variant="subtle" padding="md" horizontal>
          <template #media>
            <div class="fake-media">
              <DsIcon name="layers" size="xl" />
            </div>
          </template>
          <template #header>
            <div>
              <h3 class="mini-title">横向卡片</h3>
              <p class="mini-sub">桌面左右，手机上下</p>
            </div>
          </template>
          <p>把窗口宽度缩到 768px 以下，这张卡片会自动从左右布局变成上下布局。</p>
        </DsCard>
      </div>
    </DemoBlock>

    <DemoBlock title="徽标与标签" description="Badge 用于状态与计数，Tag 额外支持关闭按钮。" :code="badgeCode" block>
      <div class="ds-cluster ds-cluster-4">
        <DsBadge tone="neutral">草稿</DsBadge>
        <DsBadge tone="brand" dot>进行中</DsBadge>
        <DsBadge tone="success">已发布</DsBadge>
        <DsBadge tone="warning">待审核</DsBadge>
        <DsBadge tone="danger">已阻塞</DsBadge>
        <DsBadge tone="info" icon="zap">自动化</DsBadge>
        <DsBadge tone="brand" pill size="lg">VIP</DsBadge>
      </div>
      <div class="ds-cluster ds-cluster-4">
        <DsTag v-for="t in tags" :key="t.label" :tone="t.tone" closable @close="removeTag(t)">
          {{ t.label }}
        </DsTag>
        <DsButton v-if="!tags.length" size="sm" variant="ghost" icon="plus" @click="restoreTags">
          恢复标签
        </DsButton>
      </div>
    </DemoBlock>

    <DemoBlock title="头像 Avatar" description="图片加载失败自动降级为首字母，再降级为默认图标；支持在线状态点。" :code="avatarCode">
      <div class="ds-cluster ds-cluster-4">
        <DsAvatar v-for="size in ['xs', 'sm', 'md', 'lg', 'xl']" :key="size" name="陈志远" :size="size" />
        <DsAvatar name="Ada Lovelace" size="lg" online />
        <DsAvatar name="Grace Hopper" size="lg" shape="square" color="#0ea5e9" />
        <DsAvatar src="https://invalid.example.com/404.png" name="图片失败" size="lg" />
      </div>
    </DemoBlock>

    <DemoBlock title="进度 Progress" description="支持确定进度与不确定加载两种形态。" :code="progressCode" block>
      <div class="ds-stack ds-stack-4" style="width: 100%">
        <DsProgress :value="progressValue" show-value label="上传进度" />
        <div class="ds-cluster ds-cluster-4">
          <DsButton size="sm" variant="ghost" icon="minus" @click="progressValue = Math.max(0, progressValue - 10)" />
          <DsButton size="sm" variant="ghost" icon="plus" @click="progressValue = Math.min(100, progressValue + 10)" />
        </div>
        <DsProgress :value="42" tone="success" size="sm" label="成功" />
        <DsProgress :value="65" tone="warning" size="sm" label="警告" />
        <DsProgress :value="88" tone="danger" size="sm" label="危险" />
        <DsProgress indeterminate label="加载中" />
      </div>
    </DemoBlock>

    <DemoBlock title="提示气泡 Tooltip" description="固定定位不受父级 overflow 裁剪，四个方向自动避让。" :code="tooltipCode">
      <DsTooltip content="显示在上方" placement="top">
        <DsButton variant="secondary" size="sm">上</DsButton>
      </DsTooltip>
      <DsTooltip content="显示在下方" placement="bottom">
        <DsButton variant="secondary" size="sm">下</DsButton>
      </DsTooltip>
      <DsTooltip content="显示在左侧" placement="left">
        <DsButton variant="secondary" size="sm">左</DsButton>
      </DsTooltip>
      <DsTooltip content="显示在右侧" placement="right">
        <DsButton variant="secondary" size="sm">右</DsButton>
      </DsTooltip>
      <DsTooltip tone="light" content="浅色气泡，用于深色卡片内">
        <DsButton variant="secondary" size="sm">浅色</DsButton>
      </DsTooltip>
    </DemoBlock>

    <DemoBlock title="骨架屏与空状态" description="加载中用骨架屏占位，无数据时给出明确引导，而不是一片空白。" :code="skeletonCode" block>
      <div class="ds-grid ds-grid-lg">
        <DsCard padding="md">
          <template #header><h4 class="mini-title">加载中</h4></template>
          <div class="ds-stack ds-stack-3">
            <div class="skeleton-row">
              <DsSkeleton variant="circle" />
              <div class="ds-stack ds-stack-2" style="flex: 1">
                <DsSkeleton variant="text" width="40%" />
                <DsSkeleton variant="text" width="70%" />
              </div>
            </div>
            <DsSkeleton variant="rect" />
          </div>
          <template #footer><DsSkeleton variant="text" width="30%" /></template>
        </DsCard>

        <DsCard padding="md">
          <template #header><h4 class="mini-title">空状态</h4></template>
          <DsEmpty
            title="还没有项目"
            description="创建第一个项目后，这里会显示它的构建状态与最近部署记录。"
          >
            <template #action>
              <DsButton size="sm" variant="primary" icon="plus">新建项目</DsButton>
            </template>
          </DsEmpty>
        </DsCard>
      </div>
    </DemoBlock>
  </div>
</template>

<script>
import PageHeader from '@/docs/components/PageHeader.vue'
import DemoBlock from '@/docs/components/DemoBlock.vue'
import DsCard from '@/components/DsCard.vue'
import DsButton from '@/components/DsButton.vue'
import DsBadge from '@/components/DsBadge.vue'
import DsTag from '@/components/DsTag.vue'
import DsAvatar from '@/components/DsAvatar.vue'
import DsProgress from '@/components/DsProgress.vue'
import DsTooltip from '@/components/DsTooltip.vue'
import DsSkeleton from '@/components/DsSkeleton.vue'
import DsEmpty from '@/components/DsEmpty.vue'
import DsIcon from '@/components/DsIcon.vue'

const DEFAULT_TAGS = () => [
  { label: 'Vue 2', tone: 'brand' },
  { label: 'Vite', tone: 'success' },
  { label: 'Design Token', tone: 'info' },
  { label: '待重构', tone: 'warning' },
]

export default {
  name: 'DisplayDocs',
  components: {
    PageHeader,
    DemoBlock,
    DsCard,
    DsButton,
    DsBadge,
    DsTag,
    DsAvatar,
    DsProgress,
    DsTooltip,
    DsSkeleton,
    DsEmpty,
    DsIcon,
  },
  data() {
    return {
      tags: DEFAULT_TAGS(),
      progressValue: 36,
      cardCode: `<DsCard title="团队空间" subtitle="12 名成员" hoverable>
  <p>正文内容</p>
  <template #footer>
    <DsButton size="sm" variant="primary">进入</DsButton>
  </template>
</DsCard>`,
      badgeCode: `<DsBadge tone="success">已发布</DsBadge>
<DsBadge tone="brand" dot>进行中</DsBadge>
<DsTag tone="info" closable @close="remove">Vue 2</DsTag>`,
      avatarCode: `<DsAvatar name="陈志远" size="lg" />
<DsAvatar name="Ada Lovelace" size="lg" online />
<DsAvatar src="..." name="图片失败" size="lg" />  <!-- 自动降级 -->`,
      progressCode: `<DsProgress :value="68" show-value label="上传进度" />
<DsProgress indeterminate label="加载中" />`,
      tooltipCode: `<DsTooltip content="显示在上方" placement="top">
  <DsButton size="sm">上</DsButton>
</DsTooltip>`,
      skeletonCode: `<DsSkeleton variant="circle" />
<DsSkeleton variant="text" width="40%" />
<DsSkeleton variant="rect" />

<DsEmpty title="还没有项目" description="创建第一个项目后…">
  <template #action><DsButton icon="plus">新建项目</DsButton></template>
</DsEmpty>`,
    }
  },
  methods: {
    removeTag(tag) {
      this.tags = this.tags.filter((t) => t.label !== tag.label)
    },
    restoreTags() {
      this.tags = DEFAULT_TAGS()
    },
  },
}
</script>

<style scoped>
.mini-title {
  font-size: var(--ds-font-size-md);
  font-weight: var(--ds-font-weight-semibold);
}
.mini-sub {
  margin-top: 2px;
  font-size: var(--ds-font-size-xs);
  color: var(--ds-color-fg-muted);
}
.fake-media {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  min-height: 120px;
  color: var(--ds-color-fg-subtle);
  background: linear-gradient(135deg, var(--ds-color-brand-subtle), transparent);
}
.skeleton-row {
  display: flex;
  align-items: center;
  gap: var(--ds-space-3);
}
</style>
