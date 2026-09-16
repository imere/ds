/**
 * Prettier 3 配置
 * -------------------------------------------------------------
 * 这里的值是在「迁就既有代码」和「用最新默认」之间取的结果：
 *
 *   semi / singleQuote —— 迁就。仓库现有代码全是单引号 + 无分号，
 *     按 Prettier 默认（双引号 + 分号）跑一遍会改动几百行，
 *     那种规模的重排会淹没掉真正有意义的 diff。
 *     新项目的默认值未必适合老仓库。
 *
 *   printWidth 100 —— 迁就。源码里有大量长注释和长参数行，80 会被拆得很难读。
 *
 *   trailingComma 'es5' —— 正好卡在这仓库的兼容边界上：
 *     ES5 允许「对象 / 数组字面量」的尾逗号，IE10 认；
 *     ES2017 才允许「函数参数」的尾逗号，IE10 不认。
 *     所以不能设 'all'（会给函数参数也加上），也没必要退到 'none'
 *     （白白丢掉对象/数组尾逗号带来的干净 diff）。
 *
 * 其余沿用 Prettier 3 默认。
 *
 * @type {import('prettier').Config}
 */
export default {
  semi: false,
  singleQuote: true,
  printWidth: 100,
  tabWidth: 2,
  trailingComma: 'es5',
  bracketSpacing: true,
  arrowParens: 'always',
  // 仓库在 Windows 上开发，但产物和源码统一 LF，避免 diff 里混进 CRLF 改动
  endOfLine: 'lf',
}
