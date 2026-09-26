<!--
标题走 Conventional Commits：type(scope): 小写正文
例：fix(core): 修掉派生链没读种子 shadow 的问题
CI 里有一条 PR Title 检查会拦。
-->

## 改了什么

<!-- 一句话说清动机，不是复述 diff。 -->

## 属于哪一类

<!-- 勾一个。判断错了没关系，但别空着 —— 空着说明还没想清楚这次改动的风险面。 -->

- [ ] `core` / `tokens` / `dom` / `vue2` —— 库本体
- [ ] 工程化（构建 / CI / 依赖）
- [ ] 测试
- [ ] 文档
- [ ] 示例工程

## 自检

本地跑一遍就够了，`pnpm run verify` 是 CI 跑的同一串：

```bash
cd ds-foundation
pnpm run verify   # typecheck → lint → build → coverage（门槛 100%）
```

逐项确认：

- [ ] **没有把设计决策写进 `@ds/core`**。具体色值、断点数字、尺度表属于 `@ds/tokens`；
      core 里只允许留前缀兜底 `ds` 与根字号 16 这两个「算法能不能跑」的值
- [ ] **没往库里加默认值兜底**。宁可让调用方传、宁可抛错，也不要替用户做设计决策
      （历史教训：早期「accent 为空就套 indigo」表现为所有主题品牌色一样）
- [ ] **产物仍是纯净 ES5**：没用 `Object.assign` / `Set` / `Map` / `Promise` / `for-of` /
      `async`；半透明色是逗号语法 `rgba(r, g, b, a)`
- [ ] **新增函数都有 JSDoc**（描述 + `@param` + `@returns`），`node scripts/check-jsdoc.mjs` 过
- [ ] **覆盖率仍是 100%**。遇到覆盖不到的分支先分清「没测到」还是「根本走不到」——
      走不到的是死代码，改代码删掉，不要写替身测试去凑数
- [ ] 改了库的话，**重新 `pnpm run build`** 后验过示例工程（demo-app 靠别名指向 `build/`）

## 兼容性影响

<!-- 有没有 breaking？有就写清迁移方式。参数从「可选」改成「必传」也是 breaking。 -->

- [ ] 无
- [ ] 有：
