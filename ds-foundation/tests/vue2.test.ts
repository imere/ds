/**
 * @ds/vue2 Vue 2 绑定层
 * -------------------------------------------------------------
 * 由原 scripts/vue2-smoke.mjs 迁移而来，断言语义一律不变。
 * 需要真实 DOM + Vue 渲染，跑在 jsdom 环境。
 *
 * 注意：插件安装、组件创建、挂载全都在模块顶层同步完成。
 * vitest 的 describe 回调是在「收集阶段」跑的，早于任何 beforeAll
 * 钩子 —— 如果把挂载放进 describe 里，$ds 还没挂上原型就会渲染失败。
 *
 * @vitest-environment jsdom
 */

import { describe, it, expect, afterAll } from 'vitest'
import Vue from 'vue'
import plugin, { install, DS_KEY, useDs } from '@ds/vue2'

const errors: unknown[] = []
const warns: string[] = []
const origWarn = console.warn

Vue.config.productionTip = false
Vue.config.devtools = false
Vue.config.errorHandler = (e: Error) => {
  errors.push(e)
}
console.warn = (...args: unknown[]) => {
  warns.push(args.join(' '))
}

Vue.use(plugin, { channel: 'vars', theme: 'light' })

afterAll(() => {
  console.warn = origWarn
})

function txt(id: string): string {
  const el = document.getElementById(id)
  return el ? el.textContent || '' : ''
}

const app = document.createElement('div')
app.id = 'app'
document.body.appendChild(app)

const Child = {
  // 不需要 from，key 名即注入名
  inject: ['dsContext'],
  render(this: any, h: any) {
    return h('i', { attrs: { id: 'child' } }, [
      this.dsContext ? this.dsContext.state.theme : 'none',
    ])
  },
}

const vm = new Vue({
  render(this: any, h: any) {
    const self = this
    return h('div', [
      h('span', { attrs: { id: 'theme' } }, [self.$ds.state.theme]),
      h('span', { attrs: { id: 'brand' } }, [String(self.$ds.t('color-brand'))]),
      h('span', { attrs: { id: 'styled' }, style: self.$ds.style({ color: 'color-fg' }) }, ['x']),
      h('section', {
        attrs: { id: 'local' },
        directives: [{ name: 'ds-theme', value: 'dark' }],
      }),
      h(Child),
    ])
  },
})

vm.$mount(app)

describe('0. 插件安装', () => {
  it('导出带 install 的插件对象', () => {
    expect(typeof plugin.install).toBe('function')
    expect(plugin.version).toBe('0.1.0')
    expect(typeof install).toBe('function')
  })

  it('$ds 已挂到原型', () => {
    expect(typeof Vue.prototype.$ds).toBe('object')
  })

  it('v-ds-theme 已注册', () => {
    // Vue.options 运行时存在，但 Vue 2 的类型定义里没导出，所以这里要断言一层
    expect((Vue as any).options.directives['ds-theme']).toBeTruthy()
  })

  it('init 后注入了样式', () => {
    expect(document.getElementById('ds-tokens')).toBeTruthy()
  })

  it('useDs() 拿到同一份句柄', () => {
    expect(useDs()).toBe(Vue.prototype.$ds)
  })

  it('provide key 是 dsContext', () => {
    expect(DS_KEY).toBe('dsContext')
  })

  it('重复 use 同一个 Vue 不会重建句柄', () => {
    const before = Vue.prototype.$ds
    Vue.use(plugin, { channel: 'vars' })
    expect(Vue.prototype.$ds).toBe(before)
  })
})

describe('A. 响应式', () => {
  it('初始渲染出主题名', () => {
    expect(txt('theme')).toBe('light')
  })

  it('渲染出品牌色', () => {
    expect(txt('brand')).toBe('#4f46e5')
  })

  it('$ds.style 生成行内样式', () => {
    expect(document.getElementById('styled')!.style.color).toBe('var(--ds-color-fg)')
  })

  it('provide/inject 拿到同一份句柄', () => {
    expect(txt('child')).toBe('light')
  })

  it('换主题后视图更新', async () => {
    ;(vm as any).$ds.use('dark')
    await Vue.nextTick()
    expect(txt('theme')).toBe('dark')
  })

  it('子组件的 inject 同步更新', () => {
    expect(txt('child')).toBe('dark')
  })

  it('强调色变化触发重渲染', async () => {
    ;(vm as any).$ds.useAccent('green')
    await Vue.nextTick()
    expect(txt('brand')).toBe('#16a34a')
  })
})

// 另一个宿主：值由 data 驱动，用来验 update 钩子和 unbind 清理。
// jsdom 30 已经完整支持 CSS 自定义属性，所以这里能直接断言真值。
const host = document.createElement('div')
host.id = 'host'
document.body.appendChild(host)

const vm2 = new Vue({
  data() {
    return { local: 'dark' }
  },
  render(this: any, h: any) {
    return h('section', { attrs: { id: 'box' }, directives: [{ name: 'ds-theme', value: this.local }] })
  },
})

vm2.$mount(host)

describe('B. v-ds-theme 局部换肤', () => {
  it('元素被打上主题标记', () => {
    const local = document.getElementById('local')
    expect(local!.getAttribute('data-ds-theme')).toBe('dark')
  })

  it('把该主题的令牌写成元素内联变量', () => {
    const local = document.getElementById('local')
    // 局部区域必须拿到 dark 的底色，而不是继承 :root 的浅色
    expect(local!.style.getPropertyValue('--ds-color-bg')).toBe('#0b1220')
  })

  it('写的是带前缀的变量名', () => {
    const local = document.getElementById('local')
    expect(local!.getAttribute('style')).toContain('--ds-color-bg')
  })

  it('初始值 dark 已写入', () => {
    expect(document.getElementById('box')!.style.getPropertyValue('--ds-color-bg')).toBe('#0b1220')
  })

  it('指令值变化(update) 后重写局部变量', async () => {
    ;(vm2 as any).local = 'light'
    await Vue.nextTick()
    expect(document.getElementById('box')!.style.getPropertyValue('--ds-color-bg')).toBe('#ffffff')
  })

  it('同一元素不被遗留的旧变量污染', () => {
    // 两次 apply 之间只切了主题，令牌键集合不变，值必须整体换成新的
    expect(document.getElementById('box')!.getAttribute('data-ds-theme')).toBe('light')
  })

  it('销毁(unbind) 后清掉内联变量', async () => {
    const el = document.getElementById('box')
    vm2.$destroy()
    await Vue.nextTick()
    expect(el!.style.getPropertyValue('--ds-color-bg')).toBe('')
  })
})

describe('C. 静默检查', () => {
  it('无 Vue 报错', () => {
    expect(errors.length).toBe(0)
  })

  it('无 Vue 告警', () => {
    const real = warns.filter((w) => w.indexOf('[ds/vue2]') === -1)
    expect(real).toEqual([])
  })
})
