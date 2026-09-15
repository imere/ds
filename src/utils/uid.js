/** 生成组件内部 id，避免 SSR / 同页多实例冲突 */
let seed = 0

export function uid(prefix = 'ds') {
  seed += 1
  return `${prefix}-${Date.now().toString(36)}-${seed.toString(36)}`
}

export default uid
