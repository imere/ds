---
name: ds-vue2
description: 在 Vue 2 项目里接入 @ds/vue2 的指南——Vue.use 安装与选项透传、$ds 响应式句柄（use/toggle/t/style）、v-ds-theme 局部换肤的能力边界、provide/inject 的 key 直接当注入名、自定义令牌前缀如何一路透传、Vue 2 响应式的两个坑（加新 key 不触发更新、2.6 才有 Vue.observable）。当用户提到"@ds/vue2""Vue.use(DsVue2)""$ds""v-ds-theme""dsContext""Vue 2 主题切换""Vue 2 里换令牌前缀"时使用。
agent_created: true
---

# @ds/vue2 使用指南

把 `@ds/dom` 的 manager 包成 Vue 2 生态里顺手的三样东西：`$ds` 响应式句柄、`v-ds-theme` 指令、provide/inject 上下文。

## 心智模型

```
Vue.use(DsVue2, options)
  └─ createThemeManager(options)      ← 所有选项原样透传，包括 prefix
       └─ createDsState(Vue, manager) ← 包一层 Vue 响应式
            ├─ Vue.prototype.$ds
            ├─ Vue.directive('ds-theme')
            └─ 根实例 provide { dsContext }
```

**所有 `createThemeManager` 的选项都能直接传给 `Vue.use` 的第二个参数**，包括 `prefix`。

## 工作流

1. **装插件** —— `Vue.use(DsVue2, { theme, accent, prefix, followSystem })`
   插件不会碰 localStorage / cookie。要记住用户的选择得显式接：
   `var saved = readTheme({ prefix })` → `Vue.use(...)` → `bindTheme(Vue.ds.manager)`
2. **组件里用 `$ds`** —— `t()` 读令牌、`style()` 生成行内样式、`state` 拿响应式数据
3. **跨层组件用 inject** —— `inject: ['dsContext']`，不用写 `from`
4. **局部换肤用指令** —— `v-ds-theme`，并确认不在 static 通道
5. **要改前缀** —— 一处传 `prefix`，指令会自动跟随

## 三样东西

### `$ds` 响应式句柄

```js
this.$ds.use('dark') // 切主题
this.$ds.useAccent('green') // 切强调色
this.$ds.toggle() // 明暗互切
this.$ds.t('color-brand') // 读令牌值
this.$ds.ref('color-brand') // 'var(--ds-color-brand)'
this.$ds.override('radius', { md: '20px' })
this.$ds.state.theme // 响应式
```

```html
<p :style="$ds.style({ color: 'color-fg-muted' })">…</p>
```

### `v-ds-theme` 局部换肤

```html
<div v-ds-theme="'dark'">…</div>
<section v-ds-theme="{ theme: 'dark', accent: 'green' }">…</section>
```

原理：把令牌写成元素的内联自定义属性，后代的 `var(--ds-*)` 就近取值。

> **IE10 做不到** —— 没有自定义属性就没有继承覆盖，指令退化为整站切换并告警一次。这是能力边界。

### provide / inject

```js
inject: ['dsContext'] // key 就是注入名，不需要 from
```

provide 只在根实例做一次，避免每个组件往 provide 链里塞一份。

## 自定义令牌前缀

```js
Vue.use(DsVue2, { prefix: 'acme' })

this.$ds.prefix.var // '--acme-'
this.$ds.varName('color-brand') // '--acme-color-brand'
this.$ds.className('bg-brand') // 'acme-bg-brand'
```

指令从 manager 上取前缀，不会错位。但**指令名固定是 `v-ds-theme`** —— 它属于包名，不是令牌命名空间。

## 硬规则

1. **选项整体透传** —— 别在 Vue 层重新解释 `createThemeManager` 的选项，容易漏
2. **令牌表整体替换，不要逐个 `Vue.set`** —— Vue 2 给响应式对象加新 key 不触发更新；每次给全新对象，Vue 自动重新 observe
3. **provide 的 key 就是注入名** —— 业务写 `inject: ['dsContext']`，不写 `from`
4. **Vue 2.6 以下要兜底** —— `Vue.observable` 不存在时用 `new Vue({ data }).$data`
5. **插件不 import vue** —— Vue 由 install 参数注入，UMD 下依赖全局 Vue，不把框架打进产物
6. **static 通道下别指望局部换肤** —— 只能整站切，且要有告警

## 常见坑

| 现象                          | 原因                                | 解法                                    |
| ----------------------------- | ----------------------------------- | --------------------------------------- |
| `this.$ds` 是 undefined       | 没 `Vue.use`，或在 install 之前访问 | 装插件；组件外用 `useDs()`              |
| 换主题视图不更新              | 直接改了 `state.tokens` 的某个 key  | 整体替换 `state.tokens`                 |
| `inject` 拿不到               | provider 不在根实例                 | provide 只在 `this === this.$root` 时做 |
| 局部换肤无效                  | 在 IE10 / static 通道               | 能力边界，看控制台告警                  |
| 换前缀后指令写的还是 `--ds-*` | 指令硬编码了前缀                    | 指令应从 `manager.prefix` 取            |
| 告警测不出来                  | Vue 2 的 warn 走 `console.error`    | 冒烟测试要同时 spy `warn` 和 `error`    |
| `require()` 报 "of ES Module" | 包是 `type: module`                 | UMD 产物叫 `index.umd.cjs`              |

## 检查清单

- [ ] `Vue.use` 的选项是否原样透传给 manager（含 `prefix`）
- [ ] 指令是否从 `manager.prefix` 取前缀而非硬编码
- [ ] 是否验证过 Vue 2.5 兜底路径
- [ ] 冒烟测试是否同时监听 `console.warn` 和 `console.error`
- [ ] 组件销毁时是否 `off()` 掉订阅
