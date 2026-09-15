# @ds/vue2

Design System 底层的 **Vue 2 绑定层**：把 `@ds/dom` 的 manager 变成 Vue 生态里顺手的东西。

- 支持 Vue 2.5 ~ 2.7（`Vue.observable` 不可用时借空实例兜底）
- 产物 `dist/index.js` + `dist/index.umd.cjs`
- 依赖 `@ds/core` `@ds/dom`；`vue` 是 peerDependency，**不打包进产物**

## 安装

```bash
pnpm add @ds/core @ds/dom @ds/vue2
```

```js
import Vue from 'vue'
import DsVue2 from '@ds/vue2'

Vue.use(DsVue2, { theme: 'light', persist: true, prefix: 'acme' })
```

UMD 直引（无构建步骤）：

```html
<script src=".../vue.js"></script>
<script src=".../core/dist/index.umd.cjs"></script>
<script src=".../dom/dist/index.umd.cjs"></script>
<script src=".../vue2/dist/index.umd.cjs"></script>
<script>
  Vue.use(DsVue2, { theme: 'light' })
</script>
```

## 三样东西

### 1. `this.$ds` —— 响应式主题句柄

```js
this.$ds.use('dark')
this.$ds.useAccent('green')
this.$ds.toggle()
this.$ds.t('color-brand')          // 读令牌值
this.$ds.ref('color-brand')        // 'var(--ds-color-brand)'（vars 通道）
this.$ds.state.theme               // 'dark'，响应式
this.$ds.state.tokens              // 扁平令牌表，响应式
```

行内样式：

```html
<p :style="$ds.style({ color: 'color-fg-muted', background: 'color-bg-subtle' })">…</p>
```

### 2. `v-ds-theme` —— 局部换肤

```html
<div v-ds-theme="'dark'">…</div>
<section v-ds-theme="{ theme: 'dark', accent: 'green' }">…</section>
```

原理：把该主题解析出的令牌写成元素的内联自定义属性，后代的 `var(--ds-*)` 就近取到这份值。

> **IE10 做不到** —— 没有自定义属性就没有继承覆盖这一说，指令会退化为整站切换并给出一次性告警。这是能力边界，不是 bug。

### 3. provide / inject

```js
export default {
  inject: ['dsContext'],        // 不用写 from
  computed: {
    brand: function () { return this.dsContext.t('color-brand') },
  },
}
```

provide 的 key 就是注入名，所以 `inject: ['dsContext']` 就够，不用记第二个字符串。

### 4. 自定义令牌前缀

```js
Vue.use(DsVue2, { prefix: 'acme' })

this.$ds.prefix.var            // '--acme-'
this.$ds.varName('color-brand') // '--acme-color-brand'
this.$ds.className('bg-brand')  // 'acme-bg-brand'
```

传给 `Vue.use` 的 `prefix` 会一路透传给 `createThemeManager`，同时改掉 CSS 变量、class 名、DOM 属性、`<style>` id、存储 key。`v-ds-theme` 从 manager 上取前缀，不会出现"整站 `--acme-*`、局部写的还是 `--ds-*`"的错位。

> 指令名本身固定是 `v-ds-theme`，不随前缀变化 —— 它属于包名而非令牌命名空间。

## 导出

```js
import DsVue2, { install, useDs, createDsState, makeDirective, DS_KEY } from '@ds/vue2'
```

| 导出 | 说明 |
|---|---|
| `default` | 插件对象，`Vue.use()` 用 |
| `install(Vue, options)` | 等价于 `Vue.use`，拿到 Vue 实例时手动调用 |
| `useDs()` | install 之后在组件外拿句柄（之前调用返回 `null`） |
| `createDsState(Vue, manager)` | 只要响应式状态、不要全局混入时用 |
| `makeDirective(ds)` | 自己注册指令名时用 |
| `DS_KEY` | `'dsContext'`，provide/inject 的 key |

## Vue 2 的两个坑（源码里已绕）

1. **给响应式对象加新 key 不触发更新** —— 令牌表每次都是全新对象，直接整体替换 `state.tokens`，Vue 会重新 observe。比逐个 `Vue.set` 更快也更稳
2. **Vue 2.6 才有 `Vue.observable`** —— 2.5 用 `new Vue({ data }).$data` 兜底

## 测试

```bash
pnpm test   # 23 项 Vue 2 绑定层验证（vitest + jsdom 实跑，含零告警检查）
```
