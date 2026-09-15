/** Mock 数据源：真实项目里这一段由后端提供，此处仅用于脱敏演示 */
const FIRST = ['陈', '林', '黄', '张', '李', '王', '吴', '刘', '蔡', '杨', '许', '郑']
const LAST = ['志远', '雅雯', '承翰', '思彤', '宇轩', '佳蓉', '柏宏', '若彤', '子谦', '昱辰', '冠宇', '诗涵']
const ROLES = ['前端工程师', '后端工程师', '产品经理', '交互设计师', '测试工程师', '运维工程师']
const DEPTS = ['基础平台', '增长中台', '交易前台', '数据智能', '客户成功']
const STATUSES = ['active', 'invited', 'suspended']

function pick(arr, i) {
  return arr[i % arr.length]
}

export const users = Array.from({ length: 87 }, (_, i) => {
  const status = i % 11 === 0 ? 'suspended' : i % 5 === 0 ? 'invited' : 'active'
  return {
    id: 1001 + i,
    name: `${pick(FIRST, i)}${pick(LAST, (i * 7) % LAST.length)}`,
    email: `user${1001 + i}@aurora.dev`,
    role: pick(ROLES, i),
    dept: pick(DEPTS, (i * 3) % DEPTS.length),
    status,
    progress: ((i * 13) % 100) + 1,
    updatedAt: new Date(Date.now() - i * 36e5 * 7).toISOString().slice(0, 10),
  }
})

export const metrics = [
  { key: 'dau', label: '日活跃用户', value: 128460, delta: 12.4, unit: '人' },
  { key: 'orders', label: '今日订单', value: 8421, delta: -3.2, unit: '单' },
  { key: 'gmv', label: '成交额', value: 2864310, delta: 8.7, unit: '元' },
  { key: 'conv', label: '转化率', value: 4.62, delta: 0.8, unit: '%' },
]

export const activities = [
  { id: 1, user: '陈志远', action: '发布了组件库 v1.4.0', at: '2 分钟前', tone: 'success' },
  { id: 2, user: '林雅雯', action: '更新了设计令牌规范', at: '18 分钟前', tone: 'brand' },
  { id: 3, user: '黄承翰', action: '提交了 3 个无障碍修复', at: '1 小时前', tone: 'info' },
  { id: 4, user: '张思彤', action: '关闭了问题 #482', at: '3 小时前', tone: 'neutral' },
  { id: 5, user: '李宇轩', action: '回滚了一次异常发布', at: '昨天', tone: 'warning' },
]

export const STATUS_LABELS = {
  active: '在职',
  invited: '待接受',
  suspended: '已停用',
}

export const STATUS_TONES = {
  active: 'success',
  invited: 'warning',
  suspended: 'danger',
}
