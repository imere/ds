<template>
  <section class="demo">
    <header class="demo__head">
      <h3 v-if="title" class="demo__title">{{ title }}</h3>
      <p v-if="description" class="demo__desc">{{ description }}</p>
    </header>

    <div class="demo__stage" :class="{ 'demo__stage--dense': dense, 'demo__stage--block': block }">
      <slot />
    </div>

    <footer v-if="code" class="demo__foot">
      <button type="button" class="demo__toggle" @click="open = !open">
        <DsIcon :name="open ? 'chevronUp' : 'chevronDown'" size="xs" />
        {{ open ? '收起代码' : '查看代码' }}
      </button>
      <button type="button" class="demo__copy" @click="copy">
        <DsIcon :name="copied ? 'check' : 'copy'" size="xs" />
        {{ copied ? '已复制' : '复制' }}
      </button>
    </footer>

    <pre v-show="open && code" class="demo__code"><code>{{ trimmed }}</code></pre>
  </section>
</template>

<script>
import DsIcon from '@/components/DsIcon.vue'

/** 文档示例容器：实时预览 + 源码展开/复制 */
export default {
  name: 'DemoBlock',
  components: { DsIcon },
  props: {
    title: { type: String, default: '' },
    description: { type: String, default: '' },
    code: { type: String, default: '' },
    dense: { type: Boolean, default: false },
    block: { type: Boolean, default: false },
  },
  data() {
    return { open: false, copied: false }
  },
  computed: {
    trimmed() {
      return String(this.code).replace(/^\n+|\n+$/g, '')
    },
  },
  methods: {
    copy() {
      const text = this.trimmed
      const done = () => {
        this.copied = true
        setTimeout(() => {
          this.copied = false
        }, 1600)
      }
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(done).catch(() => {})
      } else {
        const ta = document.createElement('textarea')
        ta.value = text
        document.body.appendChild(ta)
        ta.select()
        try {
          document.execCommand('copy')
          done()
        } catch (e) {
          /* noop */
        }
        document.body.removeChild(ta)
      }
    },
  },
}
</script>

<style scoped>
.demo {
  border: 1px solid var(--ds-color-border);
  border-radius: var(--ds-radius-lg);
  background: var(--ds-color-bg-elevated);
  overflow: hidden;
}

.demo__head {
  padding: var(--ds-space-4) var(--ds-space-5) 0;
}
.demo__title {
  font-size: var(--ds-font-size-md);
  font-weight: var(--ds-font-weight-semibold);
}
.demo__desc {
  margin-top: var(--ds-space-1);
  font-size: var(--ds-font-size-sm);
  color: var(--ds-color-fg-muted);
}

.demo__stage {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--ds-space-3);
  padding: var(--ds-space-5);
}
.demo__stage--dense {
  padding: var(--ds-space-3) var(--ds-space-5);
}
.demo__stage--block {
  display: block;
}

.demo__foot {
  display: flex;
  align-items: center;
  gap: var(--ds-space-2);
  padding: 0 var(--ds-space-3) var(--ds-space-2);
  border-top: 1px dashed var(--ds-color-border-subtle);
  margin-top: -1px;
}

.demo__toggle,
.demo__copy {
  display: inline-flex;
  align-items: center;
  gap: var(--ds-space-1);
  height: 26px;
  padding: 0 var(--ds-space-2);
  border: 0;
  border-radius: var(--ds-radius-sm);
  background: transparent;
  color: var(--ds-color-fg-muted);
  font-size: var(--ds-font-size-xs);
  transition: background-color var(--ds-motion-duration-fast) var(--ds-motion-ease-standard);
}
.demo__toggle:hover,
.demo__copy:hover {
  background: var(--ds-color-bg-hover);
  color: var(--ds-color-fg);
}
.demo__copy {
  margin-left: auto;
}

.demo__code {
  margin: 0;
  padding: var(--ds-space-4) var(--ds-space-5);
  overflow-x: auto;
  background: var(--ds-color-bg-inset);
  border-top: 1px solid var(--ds-color-border-subtle);
  color: var(--ds-color-fg);
  font-size: var(--ds-font-size-xs);
  line-height: 1.7;
  tab-size: 2;
}

@media (max-width: 767px) {
  .demo__head {
    padding: var(--ds-space-4) var(--ds-space-4) 0;
  }
  .demo__stage {
    padding: var(--ds-space-4);
  }
  .demo__code {
    padding: var(--ds-space-3) var(--ds-space-4);
  }
}
</style>
