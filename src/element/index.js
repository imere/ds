/**
 * Element UI 按需引入层
 * ---------------------------------------------------------------
 * 约定：这个工程「只用 Element UI 的组件能力」。
 * 所有 el-* 组件的注册与样式都集中在这里，业务侧不直接 import element-ui。
 *
 * 新增/裁剪组件只需要改 `COMPONENTS` 这一张表：
 *   El 组件名  ->  element-ui/lib/<kebab>  +  theme-chalk/<kebab>.css
 */
import Vue from 'vue'
import ElementLocale from 'element-ui/lib/locale'
import zhCN from 'element-ui/lib/locale/lang/zh-CN'

/* ---------- 基础样式 ---------- */
import 'element-ui/lib/theme-chalk/base.css'
import 'element-ui/lib/theme-chalk/icon.css'
import 'element-ui/lib/theme-chalk/popper.css'
import 'element-ui/lib/theme-chalk/select-dropdown.css'
import 'element-ui/lib/theme-chalk/scrollbar.css'

/* ---------- 组件清单（按需） ---------- */
const COMPONENTS = [
  ['Button', 'button'],
  ['Link', 'link'],
  ['Input', 'input'],
  ['Select', 'select'],
  ['Option', 'option'],
  ['OptionGroup', 'option-group'],
  ['Checkbox', 'checkbox'],
  ['CheckboxGroup', 'checkbox-group'],
  ['CheckboxButton', 'checkbox-button'],
  ['Radio', 'radio'],
  ['RadioGroup', 'radio-group'],
  ['RadioButton', 'radio-button'],
  ['Switch', 'switch'],
  ['Table', 'table'],
  ['TableColumn', 'table-column'],
  ['Pagination', 'pagination'],
  ['Tabs', 'tabs'],
  ['TabPane', 'tab-pane'],
  ['Dialog', 'dialog'],
  ['Drawer', 'drawer'],
  ['Tooltip', 'tooltip'],
  ['Alert', 'alert'],
  ['Badge', 'badge'],
  ['Tag', 'tag'],
  ['Card', 'card'],
  ['Avatar', 'avatar'],
  ['Progress', 'progress'],
  ['Skeleton', 'skeleton'],
  ['SkeletonItem', 'skeleton-item'],
  ['Empty', 'empty'],
  ['Form', 'form'],
  ['FormItem', 'form-item'],
  ['Scrollbar', 'scrollbar'],
]

// 静态 import：保证 Rollup 能分析依赖并参与构建
import Button from 'element-ui/lib/button'
import Link from 'element-ui/lib/link'
import Input from 'element-ui/lib/input'
import Select from 'element-ui/lib/select'
import Option from 'element-ui/lib/option'
import OptionGroup from 'element-ui/lib/option-group'
import Checkbox from 'element-ui/lib/checkbox'
import CheckboxGroup from 'element-ui/lib/checkbox-group'
import CheckboxButton from 'element-ui/lib/checkbox-button'
import Radio from 'element-ui/lib/radio'
import RadioGroup from 'element-ui/lib/radio-group'
import RadioButton from 'element-ui/lib/radio-button'
import Switch from 'element-ui/lib/switch'
import Table from 'element-ui/lib/table'
import TableColumn from 'element-ui/lib/table-column'
import Pagination from 'element-ui/lib/pagination'
import Tabs from 'element-ui/lib/tabs'
import TabPane from 'element-ui/lib/tab-pane'
import Dialog from 'element-ui/lib/dialog'
import Drawer from 'element-ui/lib/drawer'
import Tooltip from 'element-ui/lib/tooltip'
import Alert from 'element-ui/lib/alert'
import Badge from 'element-ui/lib/badge'
import Tag from 'element-ui/lib/tag'
import Card from 'element-ui/lib/card'
import Avatar from 'element-ui/lib/avatar'
import Progress from 'element-ui/lib/progress'
import Skeleton from 'element-ui/lib/skeleton'
import SkeletonItem from 'element-ui/lib/skeleton-item'
import Empty from 'element-ui/lib/empty'
import Form from 'element-ui/lib/form'
import FormItem from 'element-ui/lib/form-item'
import Scrollbar from 'element-ui/lib/scrollbar'

import 'element-ui/lib/theme-chalk/button.css'
import 'element-ui/lib/theme-chalk/link.css'
import 'element-ui/lib/theme-chalk/input.css'
import 'element-ui/lib/theme-chalk/select.css'
import 'element-ui/lib/theme-chalk/option.css'
import 'element-ui/lib/theme-chalk/option-group.css'
import 'element-ui/lib/theme-chalk/checkbox.css'
import 'element-ui/lib/theme-chalk/checkbox-group.css'
import 'element-ui/lib/theme-chalk/checkbox-button.css'
import 'element-ui/lib/theme-chalk/radio.css'
import 'element-ui/lib/theme-chalk/radio-group.css'
import 'element-ui/lib/theme-chalk/radio-button.css'
import 'element-ui/lib/theme-chalk/switch.css'
import 'element-ui/lib/theme-chalk/table.css'
import 'element-ui/lib/theme-chalk/table-column.css'
import 'element-ui/lib/theme-chalk/pagination.css'
import 'element-ui/lib/theme-chalk/tabs.css'
import 'element-ui/lib/theme-chalk/tab-pane.css'
import 'element-ui/lib/theme-chalk/dialog.css'
import 'element-ui/lib/theme-chalk/drawer.css'
import 'element-ui/lib/theme-chalk/tooltip.css'
import 'element-ui/lib/theme-chalk/alert.css'
import 'element-ui/lib/theme-chalk/badge.css'
import 'element-ui/lib/theme-chalk/tag.css'
import 'element-ui/lib/theme-chalk/card.css'
import 'element-ui/lib/theme-chalk/avatar.css'
import 'element-ui/lib/theme-chalk/progress.css'
import 'element-ui/lib/theme-chalk/skeleton.css'
import 'element-ui/lib/theme-chalk/skeleton-item.css'
import 'element-ui/lib/theme-chalk/empty.css'
import 'element-ui/lib/theme-chalk/form.css'
import 'element-ui/lib/theme-chalk/form-item.css'

/**
 * element-ui/lib/* 是 webpack 打包产物，导出形如 `{ default: Component }`，
 * 而 Rollup / Vite 的 CJS interop 在「没有 __esModule 标记」时会把整个
 * module.exports 当作默认导出。这里统一做一次解包，拿到真正的组件选项对象。
 */
const interop = (mod) => (mod && mod.default) || mod

const REGISTRY = {
  Button: interop(Button),
  Link: interop(Link),
  Input: interop(Input),
  Select: interop(Select),
  Option: interop(Option),
  OptionGroup: interop(OptionGroup),
  Checkbox: interop(Checkbox),
  CheckboxGroup: interop(CheckboxGroup),
  CheckboxButton: interop(CheckboxButton),
  Radio: interop(Radio),
  RadioGroup: interop(RadioGroup),
  RadioButton: interop(RadioButton),
  Switch: interop(Switch),
  Table: interop(Table),
  TableColumn: interop(TableColumn),
  Pagination: interop(Pagination),
  Tabs: interop(Tabs),
  TabPane: interop(TabPane),
  Dialog: interop(Dialog),
  Drawer: interop(Drawer),
  Tooltip: interop(Tooltip),
  Alert: interop(Alert),
  Badge: interop(Badge),
  Tag: interop(Tag),
  Card: interop(Card),
  Avatar: interop(Avatar),
  Progress: interop(Progress),
  Skeleton: interop(Skeleton),
  SkeletonItem: interop(SkeletonItem),
  Empty: interop(Empty),
  Form: interop(Form),
  FormItem: interop(FormItem),
  Scrollbar: interop(Scrollbar),
}

/**
 * el 组件名 -> 组件对象。二次开发时若需要拿到某个 el 原始组件，
 * 统一从这里取，避免各处散落 `import X from 'element-ui/lib/x'`。
 */
export const elComponents = REGISTRY

/** 当前按需引入的组件清单（供文档站展示） */
export const elComponentNames = COMPONENTS.map(([name]) => name)

/**
 * 注册 Element UI。
 * 单独抽成方法，测试环境可以按需只注册部分组件，避免全局副作用。
 */
export function installElement(VueCtor = Vue, options = {}) {
  const { size = 'small', zIndex = 3000 } = options
  VueCtor.prototype.$ELEMENT = { size, zIndex }
  ElementLocale.use(zhCN)
  Object.keys(REGISTRY).forEach((key) => {
    const comp = REGISTRY[key]
    if (comp && comp.name) VueCtor.component(comp.name, comp)
  })
}

export default {
  install(VueCtor, options) {
    installElement(VueCtor, options)
  },
}
