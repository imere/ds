<template>
  <div class="theme-switcher">
    <section class="theme-switcher__section">
      <header class="theme-switcher__head">
        <h4>明暗主题</h4>
        <span class="theme-switcher__hint">{{ currentLabel }}</span>
      </header>
      <div class="theme-switcher__grid">
        <button
          v-for="(theme, key) in themes"
          :key="key"
          type="button"
          class="theme-card"
          :class="{ 'is-active': key === state.name }"
          :aria-pressed="key === state.name ? 'true' : 'false'"
          @click="setTheme(key)"
        >
          <span class="theme-card__preview" :style="previewStyle(key)">
            <i class="theme-card__c1" />
            <i class="theme-card__c2" />
            <i class="theme-card__c3" />
          </span>
          <span class="theme-card__label">{{ theme.label }}</span>
          <DsIcon v-if="key === state.name" name="check" size="sm" class="theme-card__check" />
        </button>
      </div>
    </section>

    <section class="theme-switcher__section">
      <header class="theme-switcher__head">
        <h4>强调色</h4>
        <span class="theme-switcher__hint">与明暗主题正交，可自由组合</span>
      </header>
      <div class="theme-switcher__chips">
        <button
          type="button"
          class="accent-chip"
          :class="{ 'is-active': !state.accent }"
          @click="setAccent('')"
        >
          <span class="accent-chip__dot accent-chip__dot--auto" />
          跟随主题
        </button>
        <button
          v-for="(accent, key) in accents"
          :key="key"
          type="button"
          class="accent-chip"
          :class="{ 'is-active': key === state.accent }"
          @click="setAccent(key)"
        >
          <span class="accent-chip__dot" :style="{ background: accent.swatch }" />
          {{ accent.label }}
        </button>
      </div>
    </section>

    <section class="theme-switcher__section">
      <header class="theme-switcher__head">
        <h4>微调令牌</h4>
        <DsButton v-if="hasOverrides" size="xs" variant="ghost" @click="resetTokens">还原</DsButton>
      </header>

      <div class="theme-switcher__control">
        <label for="ds-radius">圆角 {{ radiusValue }}px</label>
        <input
          id="ds-radius"
          v-model.number="radiusValue"
          type="range"
          min="0"
          max="24"
          step="1"
          @input="onRadius"
        />
      </div>

      <div class="theme-switcher__control">
        <label for="ds-brand">品牌色</label>
        <div class="theme-switcher__color">
          <input
            id="ds-brand"
            :value="brandValue"
            type="color"
            @input="onBrand"
          />
          <code>{{ brandValue }}</code>
        </div>
      </div>

      <div class="theme-switcher__control">
        <DsSwitch v-model="followSystem" @input="onFollowSystem">
          跟随系统明暗
        </DsSwitch>
      </div>
    </section>

    <section class="theme-switcher__section">
      <header class="theme-switcher__head">
        <h4>导出</h4>
      </header>
      <p class="theme-switcher__hint">
        当前配置会写入 <code>--ds-*</code> CSS 变量并持久化到 localStorage，刷新后保持。
      </p>
      <DsButton size="sm" variant="secondary" icon="copy" block @click="copyVars">
        复制 CSS 变量
      </DsButton>
      <details class="theme-switcher__details">
        <summary>预览前 12 条</summary>
        <pre><code>{{ previewVars }}</code></pre>
      </details>
    </section>
  </div>
</template>

<script>
import DsIcon from '@/components/DsIcon.vue'
import DsButton from '@/components/DsButton.vue'
import DsSwitch from '@/components/DsSwitch.vue'
import { toast } from '@/components/toast'
import {
  state,
  setTheme,
  setAccent,
  setToken,
  resetTokens,
  setFollowSystem,
  resolveCssVars,
} from '@/design/themeManager'

/**
 * 主题切换面板：主题 × 强调色 × 令牌微调 三层组合
 * 所有改动都是运行时写 CSS 变量，不触发组件重渲染。
 */
export default {
  name: 'ThemeSwitcher',
  components: { DsIcon, DsButton, DsSwitch },
  data() {
    return {
      radiusValue: Number(String(state.overrides['radius-md'] || '8px').replace('px', '')) || 8,
      brandValue: state.overrides['color-brand'] || '#4f46e5',
      followSystem: state.followSystem,
    }
  },
  computed: {
    state() {
      return state
    },
    themes() {
      return state.themes
    },
    accents() {
      return state.accents
    },
    currentLabel() {
      const t = state.themes[state.name]
      return t ? t.label : ''
    },
    hasOverrides() {
      return Object.keys(state.overrides).length > 0
    },
    previewVars() {
      const vars = resolveCssVars()
      return Object.keys(vars)
        .slice(0, 12)
        .map((k) => `${k}: ${vars[k]};`)
        .join('\n')
    },
  },
  methods: {
    setTheme,
    setAccent,
    resetTokens,
    previewStyle(key) {
      const t = state.themes[key]
      if (!t) return null
      const c = t.tokens.color
      return {
        background: c.bg,
        borderColor: c.border,
      }
    },
    onRadius() {
      setToken('radius-md', `${this.radiusValue}px`)
      setToken('radius-lg', `${Math.round(this.radiusValue * 1.5)}px`)
      setToken('radius-sm', `${Math.round(this.radiusValue * 0.5)}px`)
    },
    onBrand(e) {
      this.brandValue = e.target.value
      setToken('color-brand', this.brandValue)
      setToken('color-brand-hover', this.brandValue)
      setToken('color-brand-active', this.brandValue)
      setToken('color-focus', this.brandValue)
    },
    onFollowSystem(value) {
      setFollowSystem(value)
    },
    copyVars() {
      const text = Object.keys(resolveCssVars())
        .map((k) => `${k}: ${resolveCssVars()[k]};`)
        .join('\n')
      if (navigator.clipboard) navigator.clipboard.writeText(text)
      toast.success('CSS 变量已复制到剪贴板')
    },
  },
}
</script>

<style scoped>
.theme-switcher {
  display: flex;
  flex-direction: column;
  gap: var(--ds-space-6);
}

.theme-switcher__section {
  display: flex;
  flex-direction: column;
  gap: var(--ds-space-3);
}

.theme-switcher__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--ds-space-2);
}
.theme-switcher__head h4 {
  font-size: var(--ds-font-size-sm);
  font-weight: var(--ds-font-weight-semibold);
}
.theme-switcher__hint {
  font-size: var(--ds-font-size-xs);
  color: var(--ds-color-fg-subtle);
}

.theme-switcher__grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
  gap: var(--ds-space-2);
}

.theme-card {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: var(--ds-space-2);
  padding: var(--ds-space-2);
  border: 1px solid var(--ds-color-border);
  border-radius: var(--ds-radius-md);
  background: var(--ds-color-bg-subtle);
  color: var(--ds-color-fg-muted);
  text-align: left;
  transition: border-color var(--ds-motion-duration-fast) var(--ds-motion-ease-standard);
}
.theme-card:hover {
  border-color: var(--ds-color-brand-border);
}
.theme-card.is-active {
  border-color: var(--ds-color-brand);
  color: var(--ds-color-fg);
}

.theme-card__preview {
  display: flex;
  align-items: center;
  gap: 4px;
  height: 34px;
  padding: 6px;
  border: 1px solid var(--ds-color-border);
  border-radius: var(--ds-radius-sm);
}
.theme-card__preview i {
  display: block;
  border-radius: 3px;
}
.theme-card__c1 {
  width: 26%;
  height: 100%;
  background: var(--ds-color-brand);
}
.theme-card__c2 {
  flex: 1;
  height: 60%;
  background: var(--ds-color-fg-subtle);
  opacity: 0.4;
}
.theme-card__c3 {
  width: 14%;
  height: 100%;
  background: var(--ds-color-fg-subtle);
  opacity: 0.22;
}
.theme-card__label {
  font-size: var(--ds-font-size-xs);
}
.theme-card__check {
  position: absolute;
  top: 6px;
  right: 6px;
  color: var(--ds-color-brand-fg);
}

.theme-switcher__chips {
  display: flex;
  flex-wrap: wrap;
  gap: var(--ds-space-2);
}
.accent-chip {
  display: inline-flex;
  align-items: center;
  gap: var(--ds-space-2);
  padding: 4px 10px 4px 6px;
  border: 1px solid var(--ds-color-border);
  border-radius: var(--ds-radius-full);
  background: var(--ds-color-bg-subtle);
  color: var(--ds-color-fg-muted);
  font-size: var(--ds-font-size-xs);
}
.accent-chip.is-active {
  border-color: var(--ds-color-brand);
  color: var(--ds-color-brand-fg);
  background: var(--ds-color-brand-subtle);
}
.accent-chip__dot {
  width: 14px;
  height: 14px;
  border-radius: 50%;
  border: 1px solid rgba(0, 0, 0, 0.12);
}
.accent-chip__dot--auto {
  background: conic-gradient(#4f46e5, #06b6d4, #10b981, #f59e0b, #e11d48, #4f46e5);
}

.theme-switcher__control {
  display: flex;
  flex-direction: column;
  gap: var(--ds-space-2);
  font-size: var(--ds-font-size-xs);
  color: var(--ds-color-fg-muted);
}
.theme-switcher__control input[type='range'] {
  width: 100%;
  accent-color: var(--ds-color-brand);
}
.theme-switcher__color {
  display: flex;
  align-items: center;
  gap: var(--ds-space-2);
}
.theme-switcher__color input[type='color'] {
  width: 44px;
  height: 28px;
  padding: 0;
  border: 1px solid var(--ds-color-border);
  border-radius: var(--ds-radius-sm);
  background: transparent;
}
.theme-switcher__color code {
  padding: 2px 6px;
  border-radius: var(--ds-radius-sm);
  background: var(--ds-color-bg-inset);
  color: var(--ds-color-fg);
}

.theme-switcher__details summary {
  cursor: pointer;
  font-size: var(--ds-font-size-xs);
  color: var(--ds-color-fg-muted);
  margin-top: var(--ds-space-2);
}
.theme-switcher__details pre {
  margin: var(--ds-space-2) 0 0;
  padding: var(--ds-space-3);
  max-height: 180px;
  overflow: auto;
  background: var(--ds-color-bg-inset);
  border-radius: var(--ds-radius-md);
  font-size: 11px;
  line-height: 1.6;
  color: var(--ds-color-fg);
}
</style>
