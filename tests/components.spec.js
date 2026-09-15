import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import DsButton from '@/components/DsButton.vue'
import DsInput from '@/components/DsInput.vue'
import DsCheckbox from '@/components/DsCheckbox.vue'
import DsCheckboxGroup from '@/components/DsCheckboxGroup.vue'
import DsSelect from '@/components/DsSelect.vue'
import DsSwitch from '@/components/DsSwitch.vue'
import DsPagination from '@/components/DsPagination.vue'
import DsTable from '@/components/DsTable.vue'

describe('DsButton', () => {
  it('点击时派发 click 事件', async () => {
    const wrapper = mount(DsButton, { slots: { default: '确定' } })
    await wrapper.trigger('click')
    expect(wrapper.emitted('click')).toBeTruthy()
  })

  it('loading / disabled 状态下不派发 click', async () => {
    const wrapper = mount(DsButton, { propsData: { loading: true } })
    await wrapper.trigger('click')
    expect(wrapper.emitted('click')).toBeFalsy()

    const disabled = mount(DsButton, { propsData: { disabled: true } })
    await disabled.trigger('click')
    expect(disabled.emitted('click')).toBeFalsy()
  })

  it('根据 variant / size 生成对应类名', () => {
    const wrapper = mount(DsButton, { propsData: { variant: 'primary', size: 'lg', block: true } })
    expect(wrapper.classes()).toContain('ds-btn--primary')
    expect(wrapper.classes()).toContain('ds-btn--lg')
    expect(wrapper.classes()).toContain('ds-btn--block')
  })

  it('传入 href 时渲染为链接', () => {
    const wrapper = mount(DsButton, { propsData: { href: 'https://example.com' } })
    expect(wrapper.element.tagName).toBe('A')
  })
})

describe('DsInput', () => {
  it('v-model 双向绑定（value + input）', async () => {
    const wrapper = mount(DsInput, { propsData: { value: '初始值' } })
    const input = wrapper.find('input')

    expect(input.element.value).toBe('初始值')
    await input.setValue('新值')
    expect(wrapper.emitted('input')[0]).toEqual(['新值'])
  })

  it('清空按钮会派发 input 为空字符串', async () => {
    const wrapper = mount(DsInput, { propsData: { value: 'abc', clearable: true } })
    await wrapper.find('.ds-input__clear').trigger('click')
    expect(wrapper.emitted('input')[0]).toEqual([''])
  })

  it('password 类型可切换显隐', async () => {
    const wrapper = mount(DsInput, { propsData: { type: 'password', value: 'secret' } })
    expect(wrapper.find('input').attributes('type')).toBe('password')
    await wrapper.find('.ds-input__toggle').trigger('click')
    expect(wrapper.find('input').attributes('type')).toBe('text')
  })

  it('error 时标记 aria-invalid', () => {
    const wrapper = mount(DsInput, { propsData: { error: '必填' } })
    expect(wrapper.find('input').attributes('aria-invalid')).toBe('true')
  })
})

describe('DsCheckbox', () => {
  it('布尔模式下切换 true / false', async () => {
    const wrapper = mount(DsCheckbox, { propsData: { modelValue: false } })
    await wrapper.find('input').trigger('change')
    expect(wrapper.emitted('change')[0]).toEqual([true])
  })

  it('数组模式下把 value 加入 / 移出数组', async () => {
    const wrapper = mount(DsCheckbox, {
      propsData: { modelValue: ['a'], value: 'b' },
    })
    await wrapper.find('input').trigger('change')
    expect(wrapper.emitted('change')[0]).toEqual([['a', 'b']])

    const selected = mount(DsCheckbox, { propsData: { modelValue: ['b'], value: 'b' } })
    await selected.find('input').trigger('change')
    expect(selected.emitted('change')[0]).toEqual([[]])
  })

  it('支持 indeterminate 半选态', () => {
    const wrapper = mount(DsCheckbox, {
      propsData: { modelValue: false, indeterminate: true },
    })
    expect(wrapper.classes()).toContain('ds-checkbox--indeterminate')
  })
})

describe('DsCheckboxGroup', () => {
  it('选中项通过 input 事件冒泡给父级', async () => {
    const wrapper = mount(DsCheckboxGroup, {
      propsData: {
        value: [],
        options: [
          { label: 'A', value: 'a' },
          { label: 'B', value: 'b' },
        ],
      },
    })
    // jsdom 下 trigger('change') 不会真实切换 checked，这里手动模拟浏览器行为
    const input = wrapper.findAll('input').at(1)
    input.element.checked = true
    await input.trigger('change')
    expect(wrapper.emitted('input')[0]).toEqual([['b']])
  })
})

describe('DsSelect（内部为 el-select）', () => {
  const options = [
    { label: '苹果', value: 'apple' },
    { label: '香蕉', value: 'banana' },
  ]
  const elSelect = (wrapper) => wrapper.findComponent({ name: 'ElSelect' })

  it('options 渲染为 el-option', () => {
    const wrapper = mount(DsSelect, { propsData: { options } })
    expect(wrapper.findAllComponents({ name: 'ElOption' })).toHaveLength(2)
  })

  it('value 与 placeholder 透传给 el-select', () => {
    const wrapper = mount(DsSelect, {
      propsData: { options, value: 'banana', placeholder: '请选择水果' },
    })
    expect(elSelect(wrapper).props('value')).toBe('banana')
    expect(elSelect(wrapper).props('placeholder')).toBe('请选择水果')
  })

  it('el-select 派发 input 时向外转发', async () => {
    const wrapper = mount(DsSelect, { propsData: { options } })
    elSelect(wrapper).vm.$emit('input', 'banana')
    await wrapper.vm.$nextTick()
    expect(wrapper.emitted('input')[0]).toEqual(['banana'])
  })

  it('searchable / clearable 映射为 el-select 的 filterable / clearable', () => {
    const wrapper = mount(DsSelect, { propsData: { options, searchable: true, clearable: true } })
    expect(elSelect(wrapper).props('filterable')).toBe(true)
    expect(elSelect(wrapper).props('clearable')).toBe(true)
  })

  it('visible-change 同步展开状态并向外派发', async () => {
    const wrapper = mount(DsSelect, { propsData: { options } })
    elSelect(wrapper).vm.$emit('visible-change', true)
    await wrapper.vm.$nextTick()
    expect(wrapper.vm.open).toBe(true)
    expect(wrapper.emitted('visible-change')[0]).toEqual([true])
  })

  it('error 时标记 aria-invalid', () => {
    const wrapper = mount(DsSelect, { propsData: { options, error: '必填' } })
    expect(wrapper.find('input').attributes('aria-invalid')).toBe('true')
  })
})

describe('DsSwitch', () => {
  it('切换时派发取反后的值', async () => {
    const wrapper = mount(DsSwitch, { propsData: { value: false } })
    await wrapper.find('input').trigger('change')
    expect(wrapper.emitted('input')[0]).toEqual([true])
  })

  it('禁用时不派发', async () => {
    const wrapper = mount(DsSwitch, { propsData: { value: false, disabled: true } })
    await wrapper.find('input').trigger('change')
    expect(wrapper.emitted('input')).toBeFalsy()
  })
})

describe('DsPagination', () => {
  it('根据 total 与 pageSize 计算总页数', () => {
    expect(mount(DsPagination, { propsData: { total: 87, pageSize: 10 } }).vm.pageCount).toBe(9)
    expect(mount(DsPagination, { propsData: { total: 0, pageSize: 10 } }).vm.pageCount).toBe(1)
  })

  it('页码不超过可展示数量时全部列出', () => {
    const wrapper = mount(DsPagination, { propsData: { total: 50, pageSize: 10 } })
    expect(wrapper.vm.pages).toEqual([1, 2, 3, 4, 5])
  })

  it('页码过多时折叠为省略号', () => {
    const wrapper = mount(DsPagination, { propsData: { total: 300, pageSize: 10, value: 15 } })
    const pages = wrapper.vm.pages
    expect(pages[0]).toBe(1)
    expect(pages).toContain('…')
    expect(pages[pages.length - 1]).toBe(30)
  })

  it('点击下一页派发 input', async () => {
    const wrapper = mount(DsPagination, { propsData: { total: 100, pageSize: 10, value: 1 } })
    wrapper.vm.go(2)
    expect(wrapper.emitted('input')[0]).toEqual([2])
  })

  it('页码越界时自动夹紧到合法范围', async () => {
    const wrapper = mount(DsPagination, { propsData: { total: 100, pageSize: 10, value: 1 } })
    wrapper.vm.go(999)
    expect(wrapper.emitted('input')[0]).toEqual([10])

    // 模拟父组件通过 v-model 回写后再越界
    await wrapper.setProps({ value: 10 })
    wrapper.vm.go(-5)
    expect(wrapper.emitted('input')[1]).toEqual([1])
  })

  it('页码未变化时不重复派发', () => {
    const wrapper = mount(DsPagination, { propsData: { total: 100, pageSize: 10, value: 3 } })
    wrapper.vm.go(3)
    expect(wrapper.emitted('input')).toBeUndefined()
  })
})

/**
 * el-table 的列是在子组件 mounted 时注册进 store 的，
 * 表头 / 单元格要等一次响应式刷新后才渲染，统一等待两个 tick。
 */
const settle = async (wrapper) => {
  await wrapper.vm.$nextTick()
  await wrapper.vm.$nextTick()
}

describe('DsTable', () => {
  const columns = [
    { key: 'name', title: '姓名' },
    { key: 'role', title: '岗位' },
  ]
  const data = [
    { id: 1, name: '陈志远', role: '前端' },
    { id: 2, name: '林雅雯', role: '设计' },
  ]

  it('渲染表头与数据行', async () => {
    const wrapper = mount(DsTable, { propsData: { columns, data } })
    await settle(wrapper)
    expect(wrapper.text()).toContain('姓名')
    expect(wrapper.text()).toContain('陈志远')
  })

  it('自定义单元格插槽生效', async () => {
    const wrapper = mount(DsTable, {
      propsData: { columns, data },
      scopedSlots: {
        'cell-name': '<span class="custom">{{ props.row.name }}!</span>',
      },
    })
    await settle(wrapper)
    expect(wrapper.find('.custom').text()).toBe('陈志远!')
  })

  it('支持排序并派发 sort-change', () => {
    const wrapper = mount(DsTable, {
      propsData: {
        columns: [{ key: 'name', title: '姓名', sortable: true }],
        data,
      },
    })
    wrapper.vm.sort({ key: 'name' })
    expect(wrapper.vm.sortOrder).toBe('asc')
    expect(wrapper.emitted('sort-change')[0][0]).toEqual({ key: 'name', order: 'asc' })

    wrapper.vm.sort({ key: 'name' })
    expect(wrapper.vm.sortOrder).toBe('desc')
  })

  it('数据为空时渲染空状态', async () => {
    const wrapper = mount(DsTable, {
      propsData: { columns, data: [], emptyTitle: '暂无成员' },
    })
    await settle(wrapper)
    expect(wrapper.text()).toContain('暂无成员')
  })

  it('全选时收集所有行 key', () => {
    const wrapper = mount(DsTable, { propsData: { columns, data, selectable: true } })
    wrapper.vm.toggleAll(true)
    expect(wrapper.emitted('update:selectedKeys')[0]).toEqual([[1, 2]])
  })
})
