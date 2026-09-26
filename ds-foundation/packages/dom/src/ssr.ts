/**
 * SSR / 防闪烁
 * -------------------------------------------------------------
 * 主题是运行时注入的，如果等 JS 下载完再决定明暗，用户会先看到一帧白底（FOUC）。
 * 解法是把一段同步脚本内联进 <head>：在任何样式生效前，先把 data-ds-theme 打到 <html> 上。
 *
 * 这段脚本必须自己能在 IE10 上跑，所以：
 *   · 用 var，不用 let/const
 *   · 不依赖任何库
 *
 * 而且它默认【不碰存储】：初始主题只来自 options.theme。
 * 想让它也读回上次的主题，把 storage.ts 的 restoreScript() 生成的代码传进来即可 ——
 * 存储介质是调用方的决定，核心不替你假设 localStorage 还是 cookie。
 *
 * 前缀要和运行时保持一致，否则脚本写的是 data-acme-theme、
 * CSS 却在等 [data-ds-theme]，首屏颜色会错一帧。
 */

import { prefixOf } from '@ds/core'
import type { Prefix, Dict } from '@ds/core'

/** getInitScript / renderHead 的入参 */
export interface InitScriptOptions {
  /** 与 createThemeManager 传同一个值即可 */
  prefix?: string | Prefix | Dict<string> | null
  attr?: string
  modeAttr?: string
  accentAttr?: string
  /** 兜底主题名。没读到任何值时的选择 */
  theme?: string
  modes?: Dict<string>
  styleId?: string
  /**
   * 可选的还原代码片段（JS 源码字符串）。
   * 片段里可读可写两个变量：t（主题名）和 a（强调色名）。
   * 用 storage.ts 的 restoreScript() 生成，或自己拼 —— 只要保证是 ES5。
   */
  restore?: string
}

/**
 * 返回可直接内联到 <head> 的防闪烁脚本。
 * 脚本必须是同步的：等 JS chunk 下载完再决定明暗，用户就会先看到一帧白底（FOUC）。
 * 它默认只读 options.theme，不碰存储 —— 存储介质是调用方的决定，
 * 想读回上次的主题就把 storage.ts 的 restoreScript() 结果塞进 options.restore。
 * @param {object} [options]
 * @param {string|object} [options.prefix] 与 createThemeManager 传同一个值即可
 * @param {string} [options.restore]  可选还原片段，见 InitScriptOptions.restore
 * @returns {string} 含 <script> 标签的 HTML 片段，原样插进 <head> 即可
 * @example
 *   // 只认服务端已知的主题
 *   res.write(getInitScript({ theme: 'dark', prefix: 'acme' }))
 *
 *   // 想连上次的主题一起还原
 *   res.write(getInitScript({ theme: 'light', restore: restoreScript() }))
 */
export function getInitScript(options?: InitScriptOptions): string {
  const o = options || {}
  const p = prefixOf(o.prefix)
  const config = {
    attr: o.attr || p.attr,
    mattr: o.modeAttr || p.modeAttr,
    aattr: o.accentAttr || p.accentAttr,
    def: o.theme || '',
    modes: o.modes || { light: 'light', dark: 'dark' },
  }

  // 注意：下面这段是**字符串**，SWC 不会转译字符串里的内容。
  // 它会被内联进 HTML 在 IE10 上直接执行，所以这里必须手写 ES5，
  // 不能跟着源码一起现代化 —— 是全仓库唯一一处刻意保留 var 的地方。
  // 片段里的变量用 __ds 前缀，别撞上主脚本的 d / t / a / m
  return (
    `<script>(function(c){try{` +
    `var d=document.documentElement,t=c.def||'',a='';${
      o.restore || ''
    }if(t){d.setAttribute(c.attr,t);var m=c.modes[t];if(m){d.setAttribute(c.mattr,m)}}` +
    `if(a){d.setAttribute(c.aattr,a)}` +
    `}catch(e){}})(${JSON.stringify(config)});</script>`
  )
}

/**
 * 与 getInitScript 配套：把 SSR 阶段算好的 CSS 一起内联进去。
 * 脚本负责把标记打到 <html> 上，CSS 负责让首屏直接是最终配色 —— 少了后者，
 * 属性已经对了但样式还没下载完，看到的依然是一帧无样式内容。
 * cssText 为空时只返回脚本：没有可用 CSS 就不塞空 <style>，免得污染 DOM。
 * @param {string} cssText 服务端算好的 CSS 文本（通常是 ds.cssText().all）
 * @param {object} [options] 与 getInitScript 同一份入参，两个函数要保持前缀一致
 * @returns {string} 脚本 + <style> 拼成的 HTML 片段
 */
export function renderHead(cssText: string, options?: InitScriptOptions): string {
  const o = options || {}
  const id = o.styleId || prefixOf(o.prefix).ids.ssr
  return getInitScript(o) + (cssText ? `<style id="${id}">${cssText}</style>` : '')
}
