/** 文档站导航结构（侧边栏与路由共用同一份数据） */
export const navGroups = [
  {
    title: '开始',
    items: [
      { label: '快速开始', to: '/', icon: 'home', desc: '项目结构与技术选型' },
      { label: '设计令牌', to: '/tokens', icon: 'palette', desc: '主题与令牌引擎' },
    ],
  },
  {
    title: '组件',
    items: [
      { label: '按钮 Button', to: '/components/button', icon: 'zap', desc: '变体 / 状态 / 图标' },
      { label: '表单 Form', to: '/components/form', icon: 'edit', desc: '输入 / 选择 / 开关' },
      { label: '数据展示 Display', to: '/components/display', icon: 'layers', desc: '卡片 / 徽标 / 头像' },
      { label: '反馈 Feedback', to: '/components/feedback', icon: 'bell', desc: '提示 / 弹窗 / 抽屉' },
      { label: '表格与分页 Table', to: '/components/table', icon: 'grid', desc: '排序 / 选择 / 分页' },
      { label: '响应式 Responsive', to: '/components/responsive', icon: 'monitor', desc: '断点 / 栅格 / 工具类' },
    ],
  },
  {
    title: '工程实践',
    items: [{ label: 'API 实验室', to: '/lab', icon: 'database', desc: 'Mock / 真实接口切换' }],
  },
]

export const flatNav = navGroups.reduce((acc, g) => acc.concat(g.items), [])

export default navGroups
