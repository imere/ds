/**
 * @ds/tokens —— 设计决策（值）
 * -------------------------------------------------------------
 * 这个包里**只有值，没有算法**；@ds/core 里**只有算法，没有值**。
 *
 * 为什么要拆开：
 *   令牌是设计决策，机制不是。中性色用 slate 还是 gray、断点取 768 还是 750、
 *   强调色是靛蓝还是品牌红 —— 换一套设计语言这些全都要改，而「令牌怎么合并、
 *   怎么派生、怎么输出成 CSS」一个字都不用动。
 *   两者混在一个包里的后果是：想换个配色就得 fork 整个库。
 *
 * 拆开之后 core 是纯机制，可以喂任何一套令牌；本包只是「官方那一套」，
 * 想用自己的就照着这个形状写一份，不引这个包也行。
 *
 * 颜色写法有一条硬规矩：最低支持 IE10，
 * IE10 认识 rgba(r, g, b, a)（逗号语法），不认识 rgb(r g b / a)（空格斜杠语法）。
 * 所以这里所有半透明色一律用逗号写法，不要图省事改写成空格语法。
 *
 * 末尾那几行是**转出**的：单位换算与 W3C / Figma 的转换函数实现在 @ds/core（它们是算法，
 * 而 core 没有值、tokens 不实现算法），这里转一份，
 * 好让「token 相关的一切」能从一个包里拿到。
 */

export * from './theme'
export * from './accent'
export * from './seed'
export * from './breakpoint'
export * from './scale'
export {
  fromW3C,
  fromFigma,
  remify,
  remifyTree,
  pxToRem,
  rescale,
  rescaleTokens,
  toUnit,
  factorOf,
  canConvert,
  toPx,
  length,
  figmaColor,
} from '@ds/core'
export { DEFAULT_KEEP_PX, DEFAULT_ROOT_FONT_SIZE, ABSOLUTE_UNITS } from '@ds/core'
export type {
  TokenSource,
  UnitId,
  KnownUnit,
  UnitSpace,
  UnknownMode,
  ConvertOptions,
  ConvertIssue,
  ConvertResult,
} from '@ds/core'
