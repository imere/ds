/**
 * 主题运行时管理器
 * -------------------------------------------------------------
 * 能力：
 *  · setTheme(name)            切换内置 / 自定义主题
 *  · registerTheme(name, def)  运行时注册新主题（支持从后台下发 JSON）
 *  · setAccent(name)           独立切换强调色，与明暗主题正交
 *  · setToken(s)(k, v)         覆盖任意单个令牌，实现“随意改”
 *  · resetTokens()             还原被覆盖的令牌
 *  · followSystem / onChange   跟随系统偏好 + 订阅变更
 *
 * 令牌最终以 `--ds-xxx` CSS 变量写入 <html>，所以任何组件样式、甚至外部
 * 业务样式都能直接消费，切换主题不触发组件重新渲染，性能开销≈0。
 */
import Vue from 'vue'
import { flattenTokens } from './tokens'
import { themes as builtInThemes, DEFAULT_THEME } from './themes'
import { accents as builtInAccents, DEFAULT_ACCENT } from './accents'

const STORAGE_KEY = 'aurora-ds:theme'
const ROOT_ATTR_THEME = 'data-ds-theme'
const ROOT_ATTR_MODE = 'data-ds-mode'

const isBrowser = typeof window !== 'undefined' && typeof document !== 'undefined'

function readPersisted() {
  if (!isBrowser) return null
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : null
  } catch (e) {
    return null
  }
}

function persist(payload) {
  if (!isBrowser) return
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload))
  } catch (e) {
    /* 隐私模式下写入失败可忽略 */
  }
}

const listeners = new Set()

/** 响应式状态：组件里直接用 themeManager.state.xxx 即可自动更新 */
export const state = Vue.observable({
  themes: { ...builtInThemes },
  accents: { ...builtInAccents },
  name: DEFAULT_THEME,
  accent: DEFAULT_ACCENT,
  overrides: {},
  followSystem: false,
  systemMode: 'light',
})

/**
 * 计算当前生效的令牌集合（主题 → 强调色 → 手动覆盖，后者覆盖前者）
 * @returns {Record<string,string>} 键形如 `color-bg`
 */
export function resolveTokens() {
  const theme = state.themes[state.name] || state.themes[DEFAULT_THEME]
  const base = flattenTokens(theme.tokens)

  const accent = state.accent && state.accents[state.accent]
  if (accent) {
    Object.assign(base, flattenTokens({ color: accent.tokens }))
  }

  Object.assign(base, flattenTokens(state.overrides))
  return base
}

/** 当前生效令牌 -> CSS 变量名映射（含 `--ds-` 前缀） */
export function resolveCssVars() {
  const tokens = resolveTokens()
  const vars = {}
  Object.keys(tokens).forEach((key) => {
    vars[`--ds-${key}`] = tokens[key]
  })
  return vars
}

function detectSystemMode() {
  if (!isBrowser || !window.matchMedia) return 'light'
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

/** 把令牌写入 DOM */
function apply() {
  if (!isBrowser) return
  const el = document.documentElement
  const theme = state.themes[state.name] || state.themes[DEFAULT_THEME]
  const vars = resolveCssVars()

  Object.keys(vars).forEach((name) => {
    el.style.setProperty(name, vars[name])
  })

  el.setAttribute(ROOT_ATTR_THEME, state.name)
  el.setAttribute(ROOT_ATTR_MODE, theme.mode)
  el.style.colorScheme = theme.mode

  listeners.forEach((fn) => {
    try {
      fn({ name: state.name, accent: state.accent, mode: theme.mode })
    } catch (e) {
      /* 单个订阅者报错不应中断广播 */
    }
  })
}

function save() {
  persist({
    name: state.name,
    accent: state.accent,
    overrides: state.overrides,
    followSystem: state.followSystem,
  })
}

/** 切换主题 */
export function setTheme(name) {
  if (!state.themes[name] || state.name === name) {
    if (state.themes[name]) apply()
    return
  }
  state.name = name
  state.followSystem = false
  apply()
  save()
}

/** 运行时注册主题（例如后台下发品牌配置） */
export function registerTheme(name, definition) {
  if (!name || !definition) return
  Vue.set(state.themes, name, definition)
  apply()
}

/** 移除主题 */
export function unregisterTheme(name) {
  if (name === DEFAULT_THEME || !state.themes[name]) return
  Vue.delete(state.themes, name)
  if (state.name === name) setTheme(DEFAULT_THEME)
  apply()
}

/** 切换强调色；传空字符串表示“使用主题自带品牌色” */
export function setAccent(name) {
  if (state.accent === name) return
  state.accent = name || ''
  apply()
  save()
}

/**
 * 覆盖单个令牌，例如 setToken('color', { brand: '#ff0000' })
 * 也支持 setToken('radius-md', '20px') 这样的扁平键
 */
export function setToken(key, value) {
  // 传对象：整体覆盖一个分组，例如 setToken('color', { brand: '#f00' })
  if (value && typeof value === 'object') {
    Vue.set(state.overrides, key, { ...(state.overrides[key] || {}), ...value })
  } else if (key.includes('.')) {
    // 点号路径：setToken('color.brand', '#f00')
    const [group, ...rest] = key.split('.')
    const current = state.overrides[group] || {}
    Vue.set(state.overrides, group, { ...current, [rest.join('.')]: value })
  } else {
    // 扁平键：setToken('radius-md', '20px')
    Vue.set(state.overrides, key, value)
  }
  apply()
  save()
}

/** 批量覆盖令牌 */
export function setTokens(tokens) {
  Object.keys(tokens || {}).forEach((key) => {
    Vue.set(state.overrides, key, tokens[key])
  })
  apply()
  save()
}

/** 撤销全部手动覆盖 */
export function resetTokens() {
  Vue.set(state, 'overrides', {})
  apply()
  save()
}

/** 订阅主题变更，返回取消订阅函数 */
export function onChange(fn) {
  if (typeof fn !== 'function') return () => {}
  listeners.add(fn)
  return () => listeners.delete(fn)
}

/** 跟随系统明暗 */
export function setFollowSystem(enabled) {
  state.followSystem = !!enabled
  if (enabled) setTheme(state.systemMode === 'dark' ? 'dark' : 'light')
  save()
}

/** 导出当前主题的 CSS 变量文本，方便贴到外部项目 */
export function exportCssVariables() {
  const vars = resolveCssVars()
  return `:root {\n${Object.keys(vars)
    .map((k) => `  ${k}: ${vars[k]};`)
    .join('\n')}\n}`
}

/** 初始化：读取持久化配置 + 监听系统偏好 */
export function initThemeManager() {
  const persisted = readPersisted()
  if (persisted) {
    if (persisted.name && state.themes[persisted.name]) state.name = persisted.name
    if (persisted.accent !== undefined) state.accent = persisted.accent
    if (persisted.overrides) state.overrides = persisted.overrides || {}
    if (persisted.followSystem) state.followSystem = true
  }

  state.systemMode = detectSystemMode()

  if (state.followSystem) {
    state.name = state.systemMode === 'dark' ? 'dark' : 'light'
  }

  apply()

  if (isBrowser && window.matchMedia) {
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const handler = (e) => {
      state.systemMode = e.matches ? 'dark' : 'light'
      if (state.followSystem) setTheme(state.systemMode === 'dark' ? 'dark' : 'light')
    }
    if (mq.addEventListener) mq.addEventListener('change', handler)
    else if (mq.addListener) mq.addListener(handler)
  }

  return state
}

export const themeManager = {
  state,
  resolveTokens,
  resolveCssVars,
  setTheme,
  registerTheme,
  unregisterTheme,
  setAccent,
  setToken,
  setTokens,
  resetTokens,
  setFollowSystem,
  onChange,
  exportCssVariables,
  init: initThemeManager,
}

export default themeManager
