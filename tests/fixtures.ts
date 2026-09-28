/**
 * 测试夹具
 * -------------------------------------------------------------
 * core / dom 现在不带任何默认值，主题、尺度、断点表都得调用方自己给。
 * 于是几乎每个测试都要传同一坨东西，各写一遍既啰嗦又容易走偏 ——
 * 集中在这里，测试只写「跟这次断言有关的那部分」。
 *
 * 值全部来自 @ds/tokens：夹具本身也不该凭空造一套设计出来。
 */

import {
  themes as presetThemes,
  accents,
  defaultScales,
  defaultScaleRules,
  defaultUtilities,
  defaultSemanticMap,
  defaultBreakpoints,
  defaultSeed,
} from '@ds/tokens'

export const themes = presetThemes
export const bp = defaultBreakpoints
export const seed = defaultSeed

/** createThemeManager / bootstrap 的必填项 */
export const baseOpts = {
  themes,
  accents,
  scales: defaultScales,
  rules: defaultScaleRules,
  utilities: defaultUtilities,
  map: defaultSemanticMap,
}

/** primitiveRules / semanticRules / buildClassSheet 的必填项 */
export const classOpts = {
  scales: defaultScales,
  rules: defaultScaleRules,
  utilities: defaultUtilities,
  map: defaultSemanticMap,
}
