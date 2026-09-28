/**
 * 工具类尺度与规则
 * -------------------------------------------------------------
 * 三组东西都是设计决策，所以都在 tokens 包：
 *   defaultScales      取值域（space 有几档、每档多少 px）
 *   defaultScaleRules  类名约定（p 对应 padding、rounded 对应 border-radius）
 *   defaultUtilities   静态工具类（flex / truncate / …）的具体声明
 *   defaultSemanticMap 语义类前缀到令牌分组的映射
 *
 * @ds/core 里 primitiveRules / semanticRules 生成规则，但尺度与映射必须传进来。
 */

import type { ScaleTable, ScaleRuleDef, UtilityDef, SemanticDef, Dict } from '@ds/core'

/** 取值域。主题无关，所以可以放死值 */
export const defaultScales: ScaleTable = {
  space: {
    0: '0px',
    1: '4px',
    2: '8px',
    3: '12px',
    4: '16px',
    5: '20px',
    6: '24px',
    7: '28px',
    8: '32px',
    10: '40px',
    12: '48px',
    16: '64px',
  },
  radius: { none: '0px', sm: '2px', md: '4px', lg: '8px', xl: '12px', full: '9999px' },
  fontSize: {
    xs: '12px',
    sm: '13px',
    md: '14px',
    lg: '16px',
    xl: '18px',
    '2xl': '20px',
    '3xl': '24px',
  },
  lineHeight: { tight: '1.25', snug: '1.375', normal: '1.5', relaxed: '1.625' },
  borderWidth: { 0: '0px', 1: '1px', 2: '2px', 4: '4px' },
  zIndex: { 0: '0', 10: '10', 20: '20', 30: '30', 40: '40', 50: '50', max: '2147483647' },
  size: {
    auto: 'auto',
    full: '100%',
    half: '50%',
    screen: '100vw',
    0: '0px',
    4: '16px',
    8: '32px',
    12: '48px',
    16: '64px',
  },
}

/**
 * scale 派生的 primitive 规则声明
 * prop 可以是数组，一条 class 同时写多个属性（如 px -> padding-left/right）
 */
export const defaultScaleRules: ScaleRuleDef[] = [
  { prefix: 'p', prop: 'padding', scale: 'space' },
  { prefix: 'px', prop: ['padding-left', 'padding-right'], scale: 'space' },
  { prefix: 'py', prop: ['padding-top', 'padding-bottom'], scale: 'space' },
  { prefix: 'pt', prop: 'padding-top', scale: 'space' },
  { prefix: 'pr', prop: 'padding-right', scale: 'space' },
  { prefix: 'pb', prop: 'padding-bottom', scale: 'space' },
  { prefix: 'pl', prop: 'padding-left', scale: 'space' },

  { prefix: 'm', prop: 'margin', scale: 'space' },
  { prefix: 'mx', prop: ['margin-left', 'margin-right'], scale: 'space' },
  { prefix: 'my', prop: ['margin-top', 'margin-bottom'], scale: 'space' },
  { prefix: 'mt', prop: 'margin-top', scale: 'space' },
  { prefix: 'mr', prop: 'margin-right', scale: 'space' },
  { prefix: 'mb', prop: 'margin-bottom', scale: 'space' },
  { prefix: 'ml', prop: 'margin-left', scale: 'space' },

  { prefix: 'gap', prop: 'gap', scale: 'space' },
  { prefix: 'rounded', prop: 'border-radius', scale: 'radius' },
  { prefix: 'text', prop: 'font-size', scale: 'fontSize' },
  { prefix: 'leading', prop: 'line-height', scale: 'lineHeight' },
  { prefix: 'border', prop: 'border-width', scale: 'borderWidth' },
  { prefix: 'z', prop: 'z-index', scale: 'zIndex' },
  { prefix: 'w', prop: 'width', scale: 'size' },
  { prefix: 'h', prop: 'height', scale: 'size' },
]

/**
 * 静态工具 class。
 * decls 的值是数组时按顺序全部输出 —— 这是 IE10 前缀降级的关键：
 *   display: ['-ms-flexbox', 'flex']  会输出两条，IE10 吃前者，现代浏览器吃后者。
 */
export const defaultUtilities: UtilityDef[] = [
  { name: 'flex', decls: { display: ['-ms-flexbox', 'flex'] } },
  { name: 'inline-flex', decls: { display: ['-ms-inline-flexbox', 'inline-flex'] } },
  { name: 'block', decls: { display: 'block' } },
  { name: 'inline-block', decls: { display: 'inline-block' } },
  { name: 'inline', decls: { display: 'inline' } },
  { name: 'hidden', decls: { display: 'none' } },

  { name: 'flex-row', decls: { '-ms-flex-direction': 'row', 'flex-direction': 'row' } },
  { name: 'flex-col', decls: { '-ms-flex-direction': 'column', 'flex-direction': 'column' } },
  { name: 'flex-wrap', decls: { '-ms-flex-wrap': 'wrap', 'flex-wrap': 'wrap' } },
  { name: 'flex-1', decls: { '-ms-flex': '1 1 0%', flex: '1 1 0%' } },
  { name: 'flex-none', decls: { '-ms-flex': 'none', flex: 'none' } },

  { name: 'items-start', decls: { '-ms-flex-align': 'start', 'align-items': 'flex-start' } },
  { name: 'items-center', decls: { '-ms-flex-align': 'center', 'align-items': 'center' } },
  { name: 'items-end', decls: { '-ms-flex-align': 'end', 'align-items': 'flex-end' } },
  { name: 'justify-start', decls: { '-ms-flex-pack': 'start', 'justify-content': 'flex-start' } },
  { name: 'justify-center', decls: { '-ms-flex-pack': 'center', 'justify-content': 'center' } },
  { name: 'justify-end', decls: { '-ms-flex-pack': 'end', 'justify-content': 'flex-end' } },
  {
    name: 'justify-between',
    decls: { '-ms-flex-pack': 'justify', 'justify-content': 'space-between' },
  },

  { name: 'text-left', decls: { 'text-align': 'left' } },
  { name: 'text-center', decls: { 'text-align': 'center' } },
  { name: 'text-right', decls: { 'text-align': 'right' } },
  { name: 'font-normal', decls: { 'font-weight': '400' } },
  { name: 'font-medium', decls: { 'font-weight': '500' } },
  { name: 'font-semibold', decls: { 'font-weight': '600' } },
  { name: 'font-bold', decls: { 'font-weight': '700' } },
  { name: 'italic', decls: { 'font-style': 'italic' } },
  { name: 'underline', decls: { 'text-decoration': 'underline' } },
  {
    name: 'truncate',
    decls: { overflow: 'hidden', 'text-overflow': 'ellipsis', 'white-space': 'nowrap' },
  },

  { name: 'relative', decls: { position: 'relative' } },
  { name: 'absolute', decls: { position: 'absolute' } },
  { name: 'fixed', decls: { position: 'fixed' } },
  { name: 'overflow-hidden', decls: { overflow: 'hidden' } },
  { name: 'overflow-auto', decls: { overflow: 'auto' } },
  { name: 'cursor-pointer', decls: { cursor: 'pointer' } },
  { name: 'cursor-disabled', decls: { cursor: 'not-allowed' } },
  { name: 'border-solid', decls: { 'border-style': 'solid' } },
]

/**
 * semantic 映射：类名前缀 -> 令牌分组
 *   bg     -> color-bg-*      .ds-bg-brand  { background-color: var(--ds-color-bg-brand) }
 *   text   -> color-fg-*      .ds-text-muted{ color:            var(--ds-color-fg-muted) }
 * wrap 用于需要拼装的属性，如 ring 的 box-shadow
 */
export const defaultSemanticMap: Dict<SemanticDef> = {
  bg: { prop: 'background-color', group: 'color-bg' },
  text: { prop: 'color', group: 'color-fg' },
  border: { prop: 'border-color', group: 'color-border' },
  ring: { prop: 'box-shadow', group: 'color-ring', wrap: '0 0 0 2px %s' },
  shadow: { prop: 'box-shadow', group: 'shadow' },
}
