/**
 * 官方强调色板
 * -------------------------------------------------------------
 * makeAccent 是算法（在 @ds/core），这里只是「拿它算了哪几组色」。
 * 业务接自己的品牌色时，直接调 makeAccent('#0ea5e9') 就行，不必改这个包。
 */

import { makeAccent } from '@ds/core'

/** 默认强调色：不指定 accent 时用它 */
export const defaultAccent = makeAccent('#4f46e5', '靛蓝')

export const accents = {
  indigo: defaultAccent,
  blue: makeAccent('#0ea5e9', '天蓝'),
  green: makeAccent('#16a34a', '青绿'),
  orange: makeAccent('#ea580c', '暖橙'),
}
