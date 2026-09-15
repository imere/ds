<template>
  <div class="api-table-wrap">
    <table class="api-table">
      <thead>
        <tr>
          <th>参数</th>
          <th class="api-table__type">类型</th>
          <th class="api-table__default">默认值</th>
          <th class="api-table__desc">说明</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="row in rows" :key="row.name">
          <td>
            <code class="api-table__name">{{ row.name }}</code>
            <DsBadge v-if="row.required" tone="danger" size="sm">必填</DsBadge>
          </td>
          <td class="api-table__type"><code>{{ row.type }}</code></td>
          <td class="api-table__default">
            <code v-if="row.default !== undefined">{{ row.default }}</code>
            <span v-else>—</span>
          </td>
          <td class="api-table__desc">{{ row.desc }}</td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<script>
import DsBadge from '@/components/DsBadge.vue'

/** 组件参数说明表（移动端自动转卡片） */
export default {
  name: 'ApiTable',
  components: { DsBadge },
  props: {
    rows: { type: Array, default: () => [] },
  },
}
</script>

<style scoped>
.api-table-wrap {
  width: 100%;
  overflow-x: auto;
  border: 1px solid var(--ds-color-border);
  border-radius: var(--ds-radius-lg);
}

.api-table {
  width: 100%;
  border-collapse: collapse;
  font-size: var(--ds-font-size-xs);
}
.api-table th,
.api-table td {
  padding: var(--ds-space-3) var(--ds-space-4);
  text-align: left;
  border-bottom: 1px solid var(--ds-color-border-subtle);
  vertical-align: top;
}
.api-table th {
  background: var(--ds-color-bg-subtle);
  color: var(--ds-color-fg-muted);
  font-weight: var(--ds-font-weight-semibold);
  white-space: nowrap;
}
.api-table tr:last-child td {
  border-bottom: 0;
}
.api-table__name {
  color: var(--ds-color-brand-fg);
  font-weight: var(--ds-font-weight-medium);
}
.api-table code {
  padding: 1px 5px;
  border-radius: var(--ds-radius-sm);
  background: var(--ds-color-bg-inset);
  color: var(--ds-color-fg);
}
.api-table__desc {
  color: var(--ds-color-fg-muted);
  min-width: 180px;
}

@media (max-width: 767px) {
  .api-table thead {
    display: none;
  }
  .api-table,
  .api-table tbody,
  .api-table tr,
  .api-table td {
    display: block;
    width: 100%;
  }
  .api-table tr {
    padding: var(--ds-space-2) 0;
    border-bottom: 1px solid var(--ds-color-border-subtle);
  }
  .api-table tr:last-child {
    border-bottom: 0;
  }
  .api-table td {
    padding: 2px var(--ds-space-4);
    border: 0;
  }
  .api-table td::before {
    content: attr(data-label);
    display: inline-block;
    width: 62px;
    color: var(--ds-color-fg-subtle);
  }
}
</style>
