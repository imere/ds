<template>
  <div>
    <PageHeader title="反馈 Feedback" subtitle="操作反馈类组件：提示条、模态框、抽屉、轻提示与警告。全部支持键盘关闭、焦点管理与滚动锁定，移动端转为贴底弹层。">
      <template #actions>
        <DsButton size="sm" variant="secondary" icon="bell" @click="toast.info('这是一条信息提示')">
          触发 Toast
        </DsButton>
      </template>
    </PageHeader>

    <DemoBlock title="提示条 Alert" description="tone=danger 时使用 role=alert，读屏器会立即朗读；支持关闭与自定义操作。" :code="alertCode" block>
      <div class="ds-stack ds-stack-3" style="width: 100%">
        <DsAlert v-if="showInfo" tone="info" title="新版本可用" closable @close="showInfo = false">
          v1.4.0 增加了 6 个组件与令牌覆盖能力。
          <template #actions>
            <DsButton size="xs" variant="secondary">查看更新日志</DsButton>
          </template>
        </DsAlert>
        <DsAlert tone="success" title="部署成功">生产环境已切换到新版本，耗时 42s。</DsAlert>
        <DsAlert tone="warning" title="配额即将用尽">本月构建次数已使用 86%，升级套餐可解锁更多额度。</DsAlert>
        <DsAlert tone="danger" title="构建失败" closable>第 3 步「单元测试」退出码为 1，请检查失败的用例。</DsAlert>
        <DsAlert tone="brand" variant="outline">描边风格，用于浅色背景上弱化视觉权重。</DsAlert>
        <DsAlert tone="info" variant="solid" banner>横幅风格，通常用于页面顶部全局通知。</DsAlert>
      </div>
    </DemoBlock>

    <DemoBlock title="模态框 Modal" description="Esc 关闭、遮罩关闭、Tab 焦点循环；小屏自动贴底全屏、按钮竖排铺满。" :code="modalCode">
      <DsButton variant="primary" @click="basic = true">基础弹窗</DsButton>
      <DsButton variant="secondary" @click="formModal = true">表单弹窗</DsButton>
      <DsButton variant="secondary" @click="scrollModal = true">长内容</DsButton>
      <DsButton variant="danger" @click="dangerModal = true">危险操作</DsButton>
    </DemoBlock>

    <DemoBlock title="抽屉 Drawer" description="四个方向可选，常用于筛选、详情与移动端导航。" :code="drawerCode">
      <DsButton variant="secondary" icon="chevronRight" @click="drawer = 'right'">右侧</DsButton>
      <DsButton variant="ghost" icon="chevronLeft" @click="drawer = 'left'">左侧</DsButton>
      <DsButton variant="ghost" icon="arrowUp" @click="drawer = 'top'">顶部</DsButton>
      <DsButton variant="ghost" icon="arrowDown" @click="drawer = 'bottom'">底部</DsButton>
    </DemoBlock>

    <DemoBlock title="轻提示 Toast" description="纯 JS 调用，无需在模板里声明组件；鼠标悬停暂停自动关闭。" :code="toastCode" block>
      <div class="ds-cluster ds-cluster-4">
        <DsButton variant="secondary" @click="toast.info('已保存草稿')">Info</DsButton>
        <DsButton variant="success" @click="toast.success('发布成功', { title: '操作完成' })">Success</DsButton>
        <DsButton variant="secondary" @click="toast.warning('网络较慢，请稍候')">Warning</DsButton>
        <DsButton variant="danger" @click="toast.error('保存失败，请重试')">Error</DsButton>
        <DsButton variant="ghost" @click="toast.show({ message: '10 秒后关闭', duration: 10000 })">
          长时提示
        </DsButton>
        <DsButton variant="ghost" @click="toast.clear()">清空全部</DsButton>
      </div>
    </DemoBlock>

    <!-- ============ 弹窗实例 ============ -->
    <DsModal v-model="basic" title="基础弹窗" size="sm">
      <p>按 Esc 或点击遮罩即可关闭。打开时页面滚动被锁定，焦点被限制在弹窗内循环。</p>
      <template #footer>
        <DsButton variant="ghost" @click="basic = false">取消</DsButton>
        <DsButton variant="primary" @click="confirmBasic">确定</DsButton>
      </template>
    </DsModal>

    <DsModal v-model="formModal" title="新建成员" size="md">
      <div class="ds-stack ds-stack-4">
        <DsField label="姓名" required><DsInput v-model="invite.name" placeholder="请输入姓名" /></DsField>
        <DsField label="邮箱" required :error="inviteError">
          <DsInput v-model="invite.email" placeholder="name@company.com" prefix="mail" />
        </DsField>
        <DsField label="角色"><DsSelect v-model="invite.role" :options="roles" /></DsField>
        <DsField label="备注"><DsTextarea v-model="invite.note" :rows="2" /></DsField>
      </div>
      <template #footer>
        <DsButton variant="ghost" @click="formModal = false">取消</DsButton>
        <DsButton variant="primary" :loading="inviting" @click="inviteMember">发送邀请</DsButton>
      </template>
    </DsModal>

    <DsModal v-model="scrollModal" title="长内容滚动" size="lg">
      <div class="long-content">
        <p v-for="i in 12" :key="i">
          第 {{ i }} 段：弹窗内容超出视口高度时，正文区域独立滚动，头部与底部操作区保持固定。
        </p>
      </div>
      <template #footer>
        <DsButton variant="primary" @click="scrollModal = false">我知道了</DsButton>
      </template>
    </DsModal>

    <DsModal v-model="dangerModal" title="删除确认" size="sm">
      <DsAlert tone="danger" title="该操作不可撤销">
        删除后，与该环境关联的所有部署记录与密钥都会被清除。
      </DsAlert>
      <template #footer>
        <DsButton variant="ghost" @click="dangerModal = false">取消</DsButton>
        <DsButton variant="danger" @click="doDelete">确认删除</DsButton>
      </template>
    </DsModal>

    <!-- ============ 抽屉实例 ============ -->
    <DsDrawer v-model="drawerRight" title="筛选条件" placement="right" size="sm">
      <div class="ds-stack ds-stack-5">
        <DsField label="状态"><DsCheckboxGroup v-model="filterStatus" :options="statusOptions" vertical /></DsField>
        <DsField label="负责人"><DsSelect v-model="filterOwner" :options="roles" clearable /></DsField>
        <DsField label="时间范围"><DsRadioGroup v-model="filterRange" :options="rangeOptions" variant="button" /></DsField>
      </div>
      <template #footer>
        <DsButton variant="ghost" block @click="drawerRight = false">取消</DsButton>
        <DsButton variant="primary" block @click="applyFilter">应用筛选</DsButton>
      </template>
    </DsDrawer>

    <DsDrawer v-model="drawerLeft" title="左侧抽屉" placement="left" size="sm">
      <p>常用于移动端主导航或次要信息面板。</p>
    </DsDrawer>
    <DsDrawer v-model="drawerTop" title="顶部抽屉" placement="top" size="sm">
      <p>适合放置全局搜索或快捷入口。</p>
    </DsDrawer>
    <DsDrawer v-model="drawerBottom" title="底部抽屉" placement="bottom" size="sm">
      <p>移动端最常用的形态，拇指可及。</p>
    </DsDrawer>
  </div>
</template>

<script>
import PageHeader from '@/docs/components/PageHeader.vue'
import DemoBlock from '@/docs/components/DemoBlock.vue'
import DsAlert from '@/components/DsAlert.vue'
import DsModal from '@/components/DsModal.vue'
import DsDrawer from '@/components/DsDrawer.vue'
import DsButton from '@/components/DsButton.vue'
import DsField from '@/components/DsField.vue'
import DsInput from '@/components/DsInput.vue'
import DsTextarea from '@/components/DsTextarea.vue'
import DsSelect from '@/components/DsSelect.vue'
import DsCheckboxGroup from '@/components/DsCheckboxGroup.vue'
import DsRadioGroup from '@/components/DsRadioGroup.vue'
import { toast } from '@/components/toast'

export default {
  name: 'FeedbackDocs',
  components: {
    PageHeader,
    DemoBlock,
    DsAlert,
    DsModal,
    DsDrawer,
    DsButton,
    DsField,
    DsInput,
    DsTextarea,
    DsSelect,
    DsCheckboxGroup,
    DsRadioGroup,
  },
  data() {
    return {
      showInfo: true,
      basic: false,
      formModal: false,
      scrollModal: false,
      dangerModal: false,
      drawer: '',
      inviting: false,
      invite: { name: '', email: '', role: 'fe', note: '' },
      filterStatus: ['active'],
      filterOwner: '',
      filterRange: '7d',
      statusOptions: [
        { label: '在职', value: 'active' },
        { label: '待接受', value: 'invited' },
        { label: '已停用', value: 'suspended' },
      ],
      rangeOptions: [
        { label: '7 天', value: '7d' },
        { label: '30 天', value: '30d' },
        { label: '全部', value: 'all' },
      ],
      roles: [
        { label: '前端工程师', value: 'fe' },
        { label: '后端工程师', value: 'be' },
        { label: '产品经理', value: 'pm' },
      ],
      alertCode: `<DsAlert tone="success" title="部署成功" closable>
  生产环境已切换到新版本。
</DsAlert>

<DsAlert tone="danger" title="构建失败">第 3 步退出码为 1。</DsAlert>`,
      modalCode: `<DsModal v-model="visible" title="新建成员" size="md">
  <DsField label="姓名"><DsInput v-model="name" /></DsField>
  <template #footer>
    <DsButton @click="visible = false">取消</DsButton>
    <DsButton variant="primary" @click="submit">确定</DsButton>
  </template>
</DsModal>`,
      drawerCode: `<DsDrawer v-model="visible" title="筛选条件" placement="right" size="sm">
  ...
  <template #footer>
    <DsButton variant="primary" block @click="apply">应用筛选</DsButton>
  </template>
</DsDrawer>`,
      toastCode: `import { toast } from '@/components/toast'

toast.info('已保存草稿')
toast.success('发布成功', { title: '操作完成' })
toast.error('保存失败，请重试', { duration: 5000 })
toast.clear()`,
    }
  },
  computed: {
    inviteError() {
      if (!this.invite.email) return ''
      return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(this.invite.email) ? '' : '邮箱格式不正确'
    },
    drawerRight: {
      get() {
        return this.drawer === 'right'
      },
      set(v) {
        this.drawer = v ? 'right' : ''
      },
    },
    drawerLeft: {
      get() {
        return this.drawer === 'left'
      },
      set(v) {
        this.drawer = v ? 'left' : ''
      },
    },
    drawerTop: {
      get() {
        return this.drawer === 'top'
      },
      set(v) {
        this.drawer = v ? 'top' : ''
      },
    },
    drawerBottom: {
      get() {
        return this.drawer === 'bottom'
      },
      set(v) {
        this.drawer = v ? 'bottom' : ''
      },
    },
  },
  methods: {
    confirmBasic() {
      this.basic = false
      toast.success('已确认')
    },
    inviteMember() {
      this.inviting = true
      setTimeout(() => {
        this.inviting = false
        this.formModal = false
        toast.success(`邀请已发送至 ${this.invite.email || '成员邮箱'}`)
      }, 1000)
    },
    doDelete() {
      this.dangerModal = false
      toast.warning('演示环境未真正删除数据')
    },
    applyFilter() {
      this.drawerRight = false
      toast.info(`已应用筛选：${this.filterStatus.length} 个状态`)
    },
  },
}
</script>

<style scoped>
.long-content p {
  padding: var(--ds-space-3) 0;
  border-bottom: 1px solid var(--ds-color-border-subtle);
}
</style>
