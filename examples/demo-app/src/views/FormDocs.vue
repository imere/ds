<template>
  <div>
    <PageHeader title="表单 Form" subtitle="输入框、选择器、开关等控件全部基于同一套令牌与尺寸体系，移动端自动放大并强制 16px 字号（避免 iOS 聚焦缩放），错误态同时提供文案与无障碍提示。">
      <template #actions>
        <DsBadge tone="brand">v-model 全支持</DsBadge>
      </template>
    </PageHeader>

    <DemoBlock title="基础输入" description="DsField 统一承载 label / 提示 / 错误，并与控件 id 自动关联。" :code="baseCode" block>
      <div class="form-grid">
        <DsField label="姓名" required hint="请输入真实姓名">
          <DsInput v-model="form.name" placeholder="请输入姓名" clearable />
        </DsField>
        <DsField label="邮箱" :error="emailError">
          <DsInput v-model="form.email" placeholder="you@example.com" prefix="mail" />
        </DsField>
        <DsField label="密码">
          <DsInput v-model="form.password" type="password" placeholder="至少 8 位" show-count :maxlength="32" />
        </DsField>
        <DsField label="手机号">
          <DsInput v-model="form.phone" placeholder="138 0000 0000" inputmode="tel" clearable />
        </DsField>
      </div>
      <p class="form-preview">当前值：<code>{{ form }}</code></p>
    </DemoBlock>

    <DemoBlock title="文本域与字数" description="DsTextarea 支持自动高度与字数统计。" :code="textareaCode" block>
      <DsField label="项目简介" hint="用于展示在团队主页">
        <DsTextarea v-model="form.bio" :rows="3" :maxlength="120" show-count placeholder="一句话介绍这个项目" />
      </DsField>
    </DemoBlock>

    <DemoBlock title="选择器" description="支持搜索、清空、键盘导航（↑↓ 选择、Enter 确认、Esc 关闭）；小屏自动变成底部弹层。" :code="selectCode" block>
      <div class="form-grid">
        <DsField label="角色">
          <DsSelect v-model="form.role" :options="roles" placeholder="选择角色" clearable />
        </DsField>
        <DsField label="城市（可搜索）">
          <DsSelect v-model="form.city" :options="cities" searchable clearable prefix="search" />
        </DsField>
        <DsField label="禁用状态">
          <DsSelect v-model="form.role" :options="roles" disabled />
        </DsField>
        <DsField label="错误状态" error="该字段为必填">
          <DsSelect v-model="form.empty" :options="roles" placeholder="请选择" />
        </DsField>
      </div>
    </DemoBlock>

    <DemoBlock title="选择与开关" description="CheckboxGroup / RadioGroup 用数组或单值做 v-model；RadioGroup 支持分段按钮形态。" :code="choiceCode" block>
      <DsField label="通知渠道">
        <DsCheckboxGroup v-model="form.channels" :options="channels" />
      </DsField>
      <DsField label="可见范围">
        <DsRadioGroup v-model="form.scope" :options="scopes" />
      </DsField>
      <DsField label="视图（分段按钮）">
        <DsRadioGroup v-model="form.view" :options="views" variant="button" />
      </DsField>
      <div class="switch-row">
        <DsSwitch v-model="form.enabled">启用该配置</DsSwitch>
        <DsSwitch v-model="form.async" loading>异步切换中</DsSwitch>
        <DsSwitch :value="true" disabled>已锁定</DsSwitch>
      </div>
    </DemoBlock>

    <DemoBlock title="响应式表单布局" description="同一份表单在桌面双列、平板单列、手机全宽堆叠，无需为不同屏幕写两套 DOM。" :code="layoutCode" block>
      <div class="ds-grid ds-grid-lg">
        <DsCard v-for="device in deviceHints" :key="device.name" padding="md" variant="subtle">
          <template #header>
            <div class="panel-head">
              <DsIcon :name="device.icon" size="md" />
              <h4 class="panel-title">{{ device.name }}</h4>
            </div>
          </template>
          <p class="hint-text">{{ device.desc }}</p>
        </DsCard>
      </div>
      <form class="responsive-form" @submit.prevent="submitForm">
        <DsField label="标题"><DsInput v-model="form.title" placeholder="请输入标题" /></DsField>
        <DsField label="分类"><DsSelect v-model="form.category" :options="categories" /></DsField>
        <DsField label="开始日期"><DsInput v-model="form.start" type="date" /></DsField>
        <DsField label="结束日期"><DsInput v-model="form.end" type="date" /></DsField>
        <div class="responsive-form__full responsive-form__actions">
          <DsButton variant="ghost" @click="resetForm">重置</DsButton>
          <DsButton variant="primary" native-type="submit" :loading="submitting">提交</DsButton>
        </div>
      </form>
    </DemoBlock>

    <h2 class="section-title">DsField API</h2>
    <ApiTable :rows="fieldProps" />
    <h2 class="section-title">DsInput API</h2>
    <ApiTable :rows="inputProps" />
  </div>
</template>

<script>
import PageHeader from '@/docs/components/PageHeader.vue'
import DemoBlock from '@/docs/components/DemoBlock.vue'
import ApiTable from '@/docs/components/ApiTable.vue'
import DsField from '@/components/DsField.vue'
import DsInput from '@/components/DsInput.vue'
import DsTextarea from '@/components/DsTextarea.vue'
import DsSelect from '@/components/DsSelect.vue'
import DsCheckboxGroup from '@/components/DsCheckboxGroup.vue'
import DsRadioGroup from '@/components/DsRadioGroup.vue'
import DsSwitch from '@/components/DsSwitch.vue'
import DsButton from '@/components/DsButton.vue'
import DsBadge from '@/components/DsBadge.vue'
import DsIcon from '@/components/DsIcon.vue'
import DsCard from '@/components/DsCard.vue'
import { toast } from '@/components/toast'

const DEFAULT_FORM = () => ({
  name: '',
  email: 'not-an-email',
  password: '',
  phone: '',
  bio: '',
  role: 'fe',
  city: 'hangzhou',
  empty: '',
  channels: ['email'],
  scope: 'team',
  view: 'day',
  enabled: true,
  async: false,
  title: '',
  category: 'product',
  start: '',
  end: '',
})

export default {
  name: 'FormDocs',
  components: {
    PageHeader,
    DemoBlock,
    ApiTable,
    DsField,
    DsInput,
    DsTextarea,
    DsSelect,
    DsCheckboxGroup,
    DsRadioGroup,
    DsSwitch,
    DsButton,
    DsBadge,
    DsIcon,
    DsCard,
  },
  data() {
    return {
      form: DEFAULT_FORM(),
      submitting: false,
      roles: [
        { label: '前端工程师', value: 'fe' },
        { label: '后端工程师', value: 'be' },
        { label: '产品经理', value: 'pm' },
        { label: '交互设计师', value: 'ux' },
      ],
      cities: [
        { label: '杭州', value: 'hangzhou' },
        { label: '北京', value: 'beijing' },
        { label: '上海', value: 'shanghai' },
        { label: '深圳', value: 'shenzhen' },
        { label: '成都', value: 'chengdu' },
        { label: '广州', value: 'guangzhou' },
      ],
      channels: [
        { label: '邮件', value: 'email' },
        { label: '短信', value: 'sms' },
        { label: '企业微信', value: 'wecom' },
        { label: '站内消息', value: 'inbox' },
      ],
      scopes: [
        { label: '仅自己', value: 'private' },
        { label: '团队可见', value: 'team' },
        { label: '全公司', value: 'company' },
      ],
      views: [
        { label: '日', value: 'day', icon: 'calendar' },
        { label: '周', value: 'week', icon: 'grid' },
        { label: '月', value: 'month', icon: 'layers' },
      ],
      categories: [
        { label: '产品需求', value: 'product' },
        { label: '技术优化', value: 'tech' },
        { label: '缺陷修复', value: 'bug' },
      ],
      deviceHints: [
        { name: '桌面 ≥1024px', icon: 'monitor', desc: '表单双列排布，标签与控件同行，操作区右对齐。' },
        { name: '平板 768–1023px', icon: 'tablet', desc: '自动降为单列，控件全宽，触控目标放大到 42px。' },
        { name: '手机 <768px', icon: 'smartphone', desc: '操作按钮竖排铺满，字号 16px 防止 iOS 自动缩放。' },
      ],
      baseCode: `<DsField label="姓名" required hint="请输入真实姓名">
  <DsInput v-model="form.name" placeholder="请输入姓名" clearable />
</DsField>

<DsField label="邮箱" :error="emailError">
  <DsInput v-model="form.email" prefix="mail" />
</DsField>`,
      textareaCode: `<DsField label="项目简介" hint="用于展示在团队主页">
  <DsTextarea v-model="form.bio" :rows="3" :maxlength="120" show-count />
</DsField>`,
      selectCode: `<DsSelect v-model="form.role" :options="roles" clearable />
<DsSelect v-model="form.city" :options="cities" searchable clearable prefix="search" />`,
      choiceCode: `<DsCheckboxGroup v-model="form.channels" :options="channels" />
<DsRadioGroup v-model="form.scope" :options="scopes" />
<DsRadioGroup v-model="form.view" :options="views" variant="button" />
<DsSwitch v-model="form.enabled">启用该配置</DsSwitch>`,
      layoutCode: `.responsive-form {
  display: grid;
  gap: var(--ds-space-4);
  grid-template-columns: 1fr;              /* 手机：单列 */
}
@media (min-width: 768px) {
  .responsive-form { grid-template-columns: repeat(2, 1fr); }
}
.responsive-form__full { grid-column: 1 / -1; }`,
      fieldProps: [
        { name: 'label', type: 'String', default: "''", desc: '字段标签，自动与控件 id 关联' },
        { name: 'labelFor', type: 'String', default: "''", desc: '自定义关联控件 id' },
        { name: 'hint', type: 'String', default: "''", desc: '辅助说明文案' },
        { name: 'error', type: 'String', default: "''", desc: '错误文案，存在时替换 hint 并变红' },
        { name: 'required', type: 'Boolean', default: 'false', desc: '显示必填星号' },
        { name: 'disabled', type: 'Boolean', default: 'false', desc: '整体置灰' },
        { name: 'size', type: 'sm | md | lg', default: 'md', desc: '字号与密度' },
      ],
      inputProps: [
        { name: 'value / v-model', type: 'String | Number', default: "''", desc: '绑定值' },
        { name: 'type', type: 'String', default: 'text', desc: '原生 type，password 时自动带显隐切换' },
        { name: 'size', type: 'sm | md | lg', default: 'md', desc: '控件高度' },
        { name: 'clearable', type: 'Boolean', default: 'false', desc: '显示清空按钮' },
        { name: 'error', type: 'String', default: "''", desc: '错误态描边' },
        { name: 'prefix', type: 'String', default: "''", desc: '前置图标名' },
        { name: 'maxlength / showCount', type: 'Number / Boolean', default: '—', desc: '最大长度与字数统计' },
        { name: 'inputmode', type: 'String', default: "''", desc: '调起移动端对应键盘' },
      ],
    }
  },
  computed: {
    emailError() {
      if (!this.form.email) return '邮箱不能为空'
      return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(this.form.email) ? '' : '邮箱格式不正确'
    },
  },
  methods: {
    submitForm() {
      this.submitting = true
      setTimeout(() => {
        this.submitting = false
        toast.success('表单提交成功')
      }, 900)
    },
    resetForm() {
      this.form = Object.assign(DEFAULT_FORM(), {
        title: '',
        start: '',
        end: '',
        category: 'product',
      })
      toast.info('已重置')
    },
  },
}
</script>

<style scoped>
.form-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: var(--ds-space-4);
  width: 100%;
}
@media (min-width: 768px) {
  .form-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

.form-preview {
  width: 100%;
  font-size: var(--ds-font-size-xs);
  color: var(--ds-color-fg-subtle);
  overflow-wrap: anywhere;
}
.form-preview code {
  padding: 2px 6px;
  border-radius: var(--ds-radius-sm);
  background: var(--ds-color-bg-inset);
}

.switch-row {
  display: flex;
  align-items: center;
  gap: var(--ds-space-5);
  flex-wrap: wrap;
}

.responsive-form {
  display: grid;
  grid-template-columns: 1fr;
  gap: var(--ds-space-4);
  width: 100%;
}
@media (min-width: 768px) {
  .responsive-form {
    grid-template-columns: repeat(2, 1fr);
  }
}
.responsive-form__full {
  grid-column: 1 / -1;
}
.responsive-form__actions {
  display: flex;
  justify-content: flex-end;
  gap: var(--ds-space-2);
}
@media (max-width: 767px) {
  .responsive-form__actions {
    flex-direction: column-reverse;
  }
}

.panel-head {
  display: flex;
  align-items: center;
  gap: var(--ds-space-2);
  color: var(--ds-color-fg-muted);
}
.panel-title {
  font-size: var(--ds-font-size-sm);
  font-weight: var(--ds-font-weight-semibold);
  color: var(--ds-color-fg);
}
.hint-text {
  font-size: var(--ds-font-size-sm);
  color: var(--ds-color-fg-muted);
  line-height: var(--ds-line-height-relaxed);
}

.section-title {
  margin: var(--ds-space-8) 0 var(--ds-space-4);
  font-size: var(--ds-font-size-xl);
  font-weight: var(--ds-font-weight-semibold);
}
</style>
