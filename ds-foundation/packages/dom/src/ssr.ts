/**
 * SSR / 防闪烁
 * -------------------------------------------------------------
 * 主题是运行时注入的，如果等 JS 下载完再决定明暗，用户会先看到一帧白底（FOUC）。
 * 解法是把一段同步脚本内联进 <head>：在任何样式生效前，先把 data-ds-theme 打到 <html> 上。
 *
 * 这段脚本必须自己能在 IE10 上跑，所以：
 *   · 用 var，不用 let/const
 *   · 不依赖任何库
 *   · localStorage 读不到就退到 cookie（file:// 下常见）
 *
 * 前缀要和运行时保持一致，否则脚本写的是 data-acme-theme、
 * CSS 却在等 [data-ds-theme]，首屏颜色会错一帧。
 */

import { prefixOf } from '@ds/core'
import type { Prefix, Dict } from '@ds/core'

/** getInitScript / renderHead 的入参 */
export interface InitScriptOptions {
  /** 与 createThemeManager 传同一个值即可 */
  prefix?: string | Prefix | Dict<any> | null
  storageKey?: string
  accentKey?: string
  attr?: string
  modeAttr?: string
  accentAttr?: string
  theme?: string
  modes?: Dict<string>
  styleId?: string
}

/**
 * 返回可直接内联到 <head> 的脚本字符串
 * @param {object} [options]
 * @param {string|object} [options.prefix] 与 createThemeManager 传同一个值即可
 */
export function getInitScript(options?: InitScriptOptions): string {
  var o = options || {}
  var p = prefixOf(o.prefix)
  var config = {
    key: o.storageKey || p.keys.theme,
    ak: o.accentKey || p.keys.accent,
    attr: o.attr || p.attr,
    mattr: o.modeAttr || p.modeAttr,
    aattr: o.accentAttr || p.accentAttr,
    def: o.theme || '',
    modes: o.modes || { light: 'light', dark: 'dark' },
  }

  return (
    '<script>(function(c){try{' +
    "var d=document.documentElement;" +
    "function rd(k){try{var v=localStorage.getItem(k);if(v){return v}}catch(e){}" +
    "var s=document.cookie?document.cookie.split(';'):[];" +
    "for(var i=0;i<s.length;i++){var p=s[i],x=p.indexOf('=')," +
    "n=(x>-1?p.slice(0,x):p).replace(/^\\s+|\\s+$/g,'');" +
    "if(n===k){return decodeURIComponent((x>-1?p.slice(x+1):'').replace(/^\\s+|\\s+$/g,''))}}" +
    "return null}" +
    "var t=rd(c.key)||c.def,a=rd(c.ak);" +
    "if(t){d.setAttribute(c.attr,t);var m=c.modes[t];if(m){d.setAttribute(c.mattr,m)}}" +
    "if(a){d.setAttribute(c.aattr,a)}" +
    '}catch(e){}})(' +
    JSON.stringify(config) +
    ');</script>'
  )
}

/** 与 getInitScript 配套：把 SSR 阶段算好的 CSS 也内联进去，首屏就是最终配色 */
export function renderHead(cssText: string, options?: InitScriptOptions): string {
  var o = options || {}
  var id = o.styleId || prefixOf(o.prefix).ids.ssr
  return getInitScript(o) + (cssText ? '<style id="' + id + '">' + cssText + '</style>' : '')
}
