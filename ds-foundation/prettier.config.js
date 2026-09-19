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
 *   trailingComma 'es5' —— 只给「对象 / 数组字面量」加尾逗号，函数参数不加。
 *     前者是 ES5 语法，后者要 ES2017 才合法。虽然进 IE10 的是 SWC 产物
 *     （实测 `function t(a, b,) {}` → `function t(a, b) {}`，尾逗号到不了 dist），
 *     但源码这一层也没必要靠这个兜底 —— 函数参数尾逗号对可读性没帮助，
 *     还会让老一点的解析器（含部分构建链里的中间工具）直接报错。取最小值。
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
