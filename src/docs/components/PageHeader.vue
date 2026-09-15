<template>
  <header class="page-head">
    <div class="page-head__row">
      <div class="page-head__main">
        <h1 class="page-head__title">{{ title }}</h1>
        <p v-if="subtitle" class="page-head__subtitle">{{ subtitle }}</p>
      </div>
      <div v-if="$slots.actions" class="page-head__actions">
        <slot name="actions" />
      </div>
    </div>
    <div v-if="$slots.default" class="page-head__extra">
      <slot />
    </div>
  </header>
</template>

<script>
/** 文档页统一页头 */
export default {
  name: 'PageHeader',
  props: {
    title: { type: String, required: true },
    subtitle: { type: String, default: '' },
  },
}
</script>

<style scoped>
.page-head {
  margin-bottom: var(--ds-space-7);
}
.page-head__row {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--ds-space-4);
  flex-wrap: wrap;
}
.page-head__title {
  font-size: var(--ds-font-size-3xl);
  font-weight: var(--ds-font-weight-bold);
  letter-spacing: -0.02em;
}
.page-head__subtitle {
  margin-top: var(--ds-space-2);
  max-width: 68ch;
  font-size: var(--ds-font-size-md);
  line-height: var(--ds-line-height-relaxed);
  color: var(--ds-color-fg-muted);
}
.page-head__actions {
  display: flex;
  align-items: center;
  gap: var(--ds-space-2);
  flex-wrap: wrap;
}
.page-head__extra {
  margin-top: var(--ds-space-5);
}

@media (max-width: 767px) {
  .page-head__title {
    font-size: var(--ds-font-size-2xl);
  }
  .page-head__subtitle {
    font-size: var(--ds-font-size-sm);
  }
}
</style>
