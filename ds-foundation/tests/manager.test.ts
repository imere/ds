/**
 * @ds/dom theme：双通道引擎的其余分支
 * -------------------------------------------------------------
 * dom.test.ts 已经覆盖了「换主题 -> 写样式」的主干，这里补的是边角：
 * 局部作用域、cssText 导出、destroy 清理、系统偏好监听的三种挂载方式、
 * 以及「切过去的目标不存在」这类静默失败路径。
 *
 * @vitest-environment jsdom
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { createThemeManager, bootstrap, resetEnvCache } from '@ds/dom'
import type { ThemeManager } from '@ds/dom'

beforeEach(() => {
  resetEnvCache()
  document.head.innerHTML = ''
  document.documentElement.removeAttribute('data-ds-theme')
  document.documentElement.removeAttribute('data-ds-mode')
  document.documentElement.removeAttribute('data-ds-accent')
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('命名辅助', () => {
  it('varName 给出 CSS 变量名', () => {
    const m = createThemeManager()
    expect(m.varName('color-bg')).toBe('--ds-color-bg')
  })

  it('className 给出完整类名', () => {
    const m = createThemeManager()
    expect(m.className('bg-brand')).toBe('ds-bg-brand')
  })

  it('两者都跟着前缀走', () => {
    const m = createThemeManager({ prefix: 'acme' })
    expect(m.varName('color-bg')).toBe('--acme-color-bg')
    expect(m.className('bg-brand')).toBe('acme-bg-brand')
  })
})

describe('init / apply', () => {
  it('init 可重复调用，等价于 apply', () => {
    const m = createThemeManager()
    m.init()
    const first = document.getElementById('ds-tokens')?.textContent
    m.init()
    expect(document.getElementById('ds-tokens')?.textContent).toBe(first)
  })

  it('apply 在未 init 过的情况下也照样写样式并通知订阅者', () => {
    const m = createThemeManager()
    const fn = vi.fn()
    m.subscribe(fn)
    m.apply()
    expect(fn).toHaveBeenCalledTimes(1)
    expect(document.getElementById('ds-tokens')).not.toBeNull()
  })
})

describe('get / style / tokens / state', () => {
  it('vars 通道下 asRef 给 var() 引用', () => {
    const m = createThemeManager({ channel: 'vars' })
    expect(m.get('color-bg', true)).toBe('var(--ds-color-bg)')
  })

  it('vars 通道下不传 asRef 给实值', () => {
    const m = createThemeManager({ channel: 'vars' })
    expect(m.get('color-bg')).toBe('#ffffff')
  })

  it('static 通道下 asRef 也只给实值（IE10 没有 var()）', () => {
    const m = createThemeManager({ channel: 'static' })
    expect(m.get('color-bg', true)).toBe('#ffffff')
  })

  it('取不存在的令牌给 undefined', () => {
    const m = createThemeManager()
    expect(m.get('color-nope')).toBeUndefined()
  })

  it('style() 过滤掉取不到的令牌，不留空声明', () => {
    // vars 通道下 asRef 只是拼 var() 串，取不到也会返回引用；
    // 只有 static 通道（拿实值）才看得出某个令牌真的不存在
    const m = createThemeManager({ channel: 'static' })
    const out = m.style({ color: 'color-fg', background: 'color-nope' })
    expect(Object.keys(out)).toEqual(['color'])
  })

  it('style() 抗 null', () => {
    const m = createThemeManager()
    expect(m.style(null)).toEqual({})
  })

  it('tokens() 给全量扁平令牌', () => {
    const m = createThemeManager()
    expect(Object.keys(m.tokens()).length).toBeGreaterThan(30)
  })

  it('state() 带上通道与跟随系统标记', () => {
    const m = createThemeManager()
    expect(m.state()).toMatchObject({ channel: 'vars', followSystem: false, theme: 'light' })
  })
})

describe('局部作用域（target 不是 <html>）', () => {
  it('把变量写成元素的内联自定义属性', () => {
    const el = document.createElement('div')
    document.body.appendChild(el)
    const m = createThemeManager({ target: el, channel: 'vars' })
    m.init()
    expect(el.style.getPropertyValue('--ds-color-bg')).toBe('#ffffff')
    expect(document.getElementById('ds-tokens')).toBeNull()
    m.destroy()
    el.remove()
  })

  it('换主题时清掉这次不再存在的键', () => {
    const el = document.createElement('div')
    document.body.appendChild(el)
    const m = createThemeManager({ target: el, channel: 'vars' })
    m.init()
    m.override('color-temp', '1px')
    expect(el.style.getPropertyValue('--ds-color-temp')).toBe('1px')
    m.resetOverrides()
    expect(el.style.getPropertyValue('--ds-color-temp')).toBe('')
    m.destroy()
    el.remove()
  })
})

describe('cssText（SSR 内联）', () => {
  it('vars 通道导出变量块 + 两层 class', () => {
    const m = createThemeManager({ channel: 'vars' })
    const out = m.cssText({ theme: 'dark' })
    expect(out.channel).toBe('vars')
    expect(out.tokens).toContain('--ds-color-bg:#0b1220')
    expect(out.semantic).toContain('var(--ds-')
    expect(out.all).toBe(out.tokens + out.primitive + out.semantic)
  })

  it('static 通道不导变量块，semantic 里全是实值', () => {
    const m = createThemeManager({ channel: 'static' })
    const out = m.cssText({ channel: 'static' })
    expect(out.tokens).toBe('')
    expect(out.semantic).not.toContain('var(')
  })

  it('导出后恢复原主题，不留下副作用', () => {
    const m = createThemeManager()
    m.use('dark')
    m.cssText({ theme: 'light', accent: 'green' })
    expect(m.state().theme).toBe('dark')
  })

  it('accent 传空串表示导出时不用强调色', () => {
    const m = createThemeManager()
    expect(() => m.cssText({ accent: '' })).not.toThrow()
  })
})

describe('destroy', () => {
  it('清掉所有注入的 style 与订阅者', () => {
    const m = createThemeManager()
    m.init()
    const fn = vi.fn()
    m.subscribe(fn)
    expect(document.getElementById('ds-tokens')).not.toBeNull()
    m.destroy()
    expect(fn).not.toHaveBeenCalled()
    expect(document.getElementById('ds-tokens')).toBeNull()
    expect(document.getElementById('ds-class-primitive')).toBeNull()
    m.use('dark')
    expect(fn).not.toHaveBeenCalled()
  })

  it('destroy 之后还能重新 init', () => {
    const m = createThemeManager()
    m.init()
    m.destroy()
    m.init()
    expect(document.getElementById('ds-tokens')).not.toBeNull()
  })
})

describe('未 init 时的改动（挂载前的静默期）', () => {
  /**
   * started 之前改主题不该碰 DOM —— 那时还没有初始样式可改，
   * 提前写会让 SSR 算好的首屏样式被覆盖。
   */
  it('改主题 / 覆盖令牌都只改内部状态，不写 DOM', () => {
    const m = createThemeManager()
    m.use('dark')
    m.useAccent('green')
    m.override('color-bg', '#000')
    m.overrideMap({ 'color-fg': '#111' })
    m.resetOverrides()

    expect(m.state().theme).toBe('dark')
    expect(document.getElementById('ds-tokens')).toBeNull()
    expect(document.documentElement.hasAttribute('data-ds-theme')).toBe(false)

    // 打开跟随系统会把主题拉回系统偏好（这里是浅色），但同样不写 DOM
    m.followSystem(true)
    expect(m.state().theme).toBe('light')
    expect(document.getElementById('ds-tokens')).toBeNull()
  })

  it('init 之后一次性补上', () => {
    const m = createThemeManager()
    m.use('dark')
    m.init()
    expect(document.documentElement.getAttribute('data-ds-theme')).toBe('dark')
  })
})

describe('cssText 的参数边界', () => {
  it('不给任何参数就按当前状态导出', () => {
    const m = createThemeManager()
    const out = m.cssText()
    expect(out.channel).toBe('vars')
    expect(out.tokens).toContain('--ds-color-bg:#ffffff')
  })

  it('指定不存在的主题时不崩，导出仍是当前状态', () => {
    const m = createThemeManager()
    expect(() => m.cssText({ theme: 'nope' })).not.toThrow()
  })
})

describe('toggle', () => {
  it('找不到目标明暗的主题时静默不动', () => {
    // 只有 light：toggle 想切 dark 但没有同名主题，不该把主题清空
    const m = createThemeManager({ themes: { light: { mode: 'light', tokens: { a: '1' } } } })
    m.init()
    m.toggle()
    expect(m.state().theme).toBe('light')
  })
})

describe('没有强调色时', () => {
  it('accent 属性会被摘掉而不是留空', () => {
    const m = createThemeManager({ defaultAccent: false })
    m.init()
    m.useAccent('green')
    expect(document.documentElement.getAttribute('data-ds-accent')).toBe('green')
    m.useAccent('')
    expect(document.documentElement.hasAttribute('data-ds-accent')).toBe(false)
  })
})

/**
 * 默认强调色的兜底
 * -------------------------------------------------------------
 * 这一组是踩出来的：库的默认行为是「accent 为空且 accents 表里有 indigo 就强行套上」，
 * 而强调色在 resolve 顺序里盖住 theme.tokens，整组 brand 会被换掉。
 * 使用方只要自建了 accents 表却想「品牌色跟随主题」，就必须显式 defaultAccent: false，
 * 否则每套主题的品牌色都会被按成同一个靛蓝 —— 而浅色主题的 brand 恰好也是那个色，
 * 现象会被完全掩盖。覆盖率 100% 拦不住它：那行代码被执行到了，行为却没人断言。
 */
describe('默认强调色的兜底', () => {
  const themes = {
    light: { mode: 'light', tokens: { color: { brand: '#111111' } } },
  }
  const withIndigo = {
    indigo: { label: '靛蓝', swatch: '#4f46e5', tokens: { color: { brand: '#4f46e5' } } },
  }

  it('不传 accent 且表里有 indigo —— 自动套上，brand 被它接管', () => {
    const m = createThemeManager({ themes, accents: withIndigo })
    m.init()
    expect(m.state().accent).toBe('indigo')
    expect(m.tokens()['color-brand']).toBe('#4f46e5')
  })

  it('defaultAccent: false —— accent 保持空，brand 就是主题自己的', () => {
    const m = createThemeManager({ themes, accents: withIndigo, defaultAccent: false })
    m.init()
    expect(m.state().accent).toBe('')
    expect(m.tokens()['color-brand']).toBe('#111111')
    expect(document.documentElement.hasAttribute('data-ds-accent')).toBe(false)
  })

  it('表里没有 indigo 就不兜 —— 没有可兜的对象', () => {
    const m = createThemeManager({
      themes,
      accents: {
        teal: { label: '青', swatch: '#0d9480', tokens: { color: { brand: '#0d9480' } } },
      },
    })
    m.init()
    expect(m.state().accent).toBe('')
    expect(m.tokens()['color-brand']).toBe('#111111')
  })

  it('显式给了 accent 就不走兜底', () => {
    const m = createThemeManager({ themes, accents: withIndigo, accent: '' })
    m.useAccent('indigo')
    expect(m.state().accent).toBe('indigo')
    // 再切回空串也不该被重新兜回去
    m.useAccent('')
    expect(m.state().accent).toBe('')
  })

  it('兜底来的强调色同样会写进 data-ds-accent', () => {
    const m = createThemeManager({ themes, accents: withIndigo })
    m.init()
    expect(document.documentElement.getAttribute('data-ds-accent')).toBe('indigo')
  })
})

describe('跟随系统：三种监听挂载方式', () => {
  it('只有 addEventListener 的新内核也能挂上', () => {
    const handlers: Array<(e: { matches: boolean }) => void> = []
    const mq = {
      matches: false,
      addEventListener: (_type: string, fn: (e: { matches: boolean }) => void) => {
        handlers.push(fn)
      },
      removeEventListener: () => {},
    }
    vi.stubGlobal('matchMedia', () => mq)
    const m = createThemeManager({ followSystem: true })
    m.init()
    expect(handlers).toHaveLength(1)

    mq.matches = true
    handlers[0]({ matches: true })
    expect(m.state().theme).toBe('dark')

    m.followSystem(false)
    expect(m.state().theme).toBe('dark')
  })

  it('matchMedia 抛异常时静默跳过监听', () => {
    vi.stubGlobal('matchMedia', () => {
      throw new Error('denied')
    })
    const m = createThemeManager({ followSystem: true })
    expect(() => m.init()).not.toThrow()
  })

  it('既没有 addListener 也没有 addEventListener 时就不挂监听', () => {
    vi.stubGlobal('matchMedia', () => ({ matches: false }))
    const m = createThemeManager({ followSystem: true })
    expect(() => m.init()).not.toThrow()
    expect(m.state().theme).toBe('light')
    m.destroy()
  })

  it('一个主题都没有时，跟随系统也无从下手', () => {
    vi.stubGlobal('matchMedia', () => ({ matches: true, addListener: () => {} }))
    const m = createThemeManager({ followSystem: true, preset: false })
    expect(() => m.init()).not.toThrow()
    expect(m.state().theme).toBe('')
  })

  it('followSystem 不传参等于打开', () => {
    const m = createThemeManager()
    m.init()
    m.followSystem()
    expect(m.state().followSystem).toBe(true)
  })

  it('系统偏好的主题不存在时不切换', () => {
    vi.stubGlobal('matchMedia', () => ({ matches: true, addListener: () => {} }))
    // 表里没有名为 dark 的主题，prefersDark 也无从下手
    const m = createThemeManager({
      followSystem: true,
      themes: { light: { mode: 'light', tokens: { a: '1' } } },
    })
    m.init()
    expect(m.state().theme).toBe('light')
  })

  it('手动定过主题之后，系统再变也不动', () => {
    const handlers: Array<(e: { matches: boolean }) => void> = []
    const mq = {
      matches: false,
      addListener: (fn: (e: { matches: boolean }) => void) => handlers.push(fn),
      removeListener: () => {},
    }
    vi.stubGlobal('matchMedia', () => mq)
    const m = createThemeManager({ followSystem: true })
    m.init()
    m.use('light') // 手动定过
    handlers[0]({ matches: true })
    expect(m.state().theme).toBe('light')
  })
})

describe('bootstrap', () => {
  it('一行启动：返回已经 init 过的 manager', () => {
    const m: ThemeManager = bootstrap()
    expect(m.state().theme).toBe('light')
    expect(document.getElementById('ds-tokens')).not.toBeNull()
    m.destroy()
  })
})
