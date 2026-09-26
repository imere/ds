---
name: ds-testing
description: 在 ds-foundation 里写测试与补覆盖率——四项 100% 门槛怎么补、先分清「没测到」还是「根本走不到」（走不到的改代码不许写替身）、用变异测试验守护强度、模块级状态必须拆文件测、jsdom 用文件头文档块声明、夹具从 tests/fixtures.ts 起步、覆盖率查缺的具体命令。当用户要"补测试""覆盖率差一点""这个分支覆盖不到""这个测试是不是假测试""新测试写在哪"时使用。
agent_created: true
---

# 写测试 / 补覆盖率

## 何时使用

- 新增或修改 `packages/*/src` 的代码
- `pnpm run coverage` 因为门槛（四项 100%）失败
- 怀疑某个测试是「假测试」（覆盖了但没验证行为）

## 心智模型

```
tests/<模块>.test.ts       一个模块一个（或一组）文件
tests/fixtures.ts          统一出 themes / bp / seed / baseOpts / classOpts（值全来自 @ds/tokens）
别名 @ds/* → src           测试跑源码不跑 build（唯一反例：es5.test.ts 的 B 层验真产物）
门槛 100% × 4              statements / branches / functions / lines，写在 vitest.config.ts
```

## 工作流：补一个覆盖不到的分支

1. **先判断成因**，这一步最重要：
   - **真没测到** → 补测试（继续第 2 步）
   - **根本走不到** → **改代码删掉**，不许写替身去凑（跳到第 5 步）
2. **新测试一律 `{ ...baseOpts }` 起步**，别自己造令牌 —— 自己造的令牌让断言失去意义
3. **jsdom 环境用文件头的文档块声明**，不用 `environmentMatchGlobs`（已废弃）：
   ```ts
   /**
    * @vitest-environment jsdom
    */
   ```
4. **断言行为，不是让代码行跑一遍**。写返回值/副作用的具体期望，而不是 `not.toThrow`
5. **不可达分支按定式处理**：先想「是不是 API 语义用错了」。
   经典案例：用 `registry.getTheme(want)` 判「有没有这套主题」**永远为真**
   （查不到会兜回当前主题）→ 改成在 `listThemes()` 里找名字。
   真守卫但外部难触发的，可以用最小替身对象验（`{ prefix, state, subscribe }` cast 成
   ThemeManager），替身不等于假测试

## 覆盖率查缺的命令

```bash
pnpm run coverage -- --coverage.reporter=json
# 遍历 build/coverage/coverage-final.json：
#   b 里含 0 的项 = 未覆盖分支，用 branchMap[k].loc.start.line 定位到行
```

## 硬规则

1. **先补拒绝分支，再补主干** —— 空名字、不存在的主题、一个主题都没注册时的 `resolve()`，
   平时不走但走到必须是确定行为
2. **不可达分支要么删掉要么写明理由**，留着只会让人以为「还有个情况没测」
3. **模块级状态必须拆文件测** —— 一次性告警 flag、`install` 的单例、env 的探测缓存，
   同一文件只能测到第一条路径（所以 `vue2-directive-warn.test.ts`、`vue2-install.test.ts`
   必须独立）
4. **100% ≠ 行为被验证**。要验守护强度就做**变异测试**：故意改坏源码跑全量，
   红 = 真守着，绿 = 形同虚设
5. **别给整段代码贴 ignore 注释去骗过门槛**

## 决策表：这个断言算不算弱

| 断言 | 判断 |
| --- | --- |
| `expect(fn()).toBe('#4f46e5')` | 好，验的是行为 |
| `expect(() => fn()).not.toThrow()` | 弱。只在「唯一要保证的就是不崩」时才可接受 |
| `expect(ds.get(k)).toBeTruthy()` | 弱。换成具体值 |
| `expect(flag).toBe(true)` | 对布尔判定函数是合理的，别一刀切 |
| `expect(n).toBeGreaterThan(30)` | 弱。换成精确值或区间边界 |

## 常见坑

| 现象 | 原因 | 解法 |
| --- | --- | --- |
| es5 那 8 个用例 skipped | 没 build | 属正常；`verify` 把 build 排在测试前就是为了它 |
| 覆盖率命令非 0 退出但报告有了 | 本机删除钩子拦了 vitest 收尾清理 | 看 `build/coverage/coverage-summary.json` 即可，别当回归；要清目录用 `mv` 不用 `rm -rf` |
| 新测试拿不到 DOM | 漏了文件头文档块 | 加 `@vitest-environment jsdom` |
| 同文件里第二个用例被挡住 | 模块级状态 | 拆文件 |
| 测试改了但页面没变 | 测试跑 src，示例跑 build | 改完库 `pnpm run build` |

## 检查清单

- [ ] 覆盖不到的分支已分清「没测到」还是「走不到」
- [ ] 走不到的分支已删 / 已改写 API 语义（不是写替身凑）
- [ ] 断言的是具体行为值，不是「没报错」
- [ ] 有模块级状态的用例是否单独成文件
- [ ] 新测试是否从 `fixtures.ts` 的 `baseOpts` 起步
- [ ] `pnpm run coverage` 四项 100%
