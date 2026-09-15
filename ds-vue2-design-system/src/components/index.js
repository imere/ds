/**
 * 组件库统一出口
 * 两种用法：
 *  1) 全量注册：Vue.use(AuroraDS)
 *  2) 按需引入：import { DsButton } from '@/components'
 */
import DsIcon from './DsIcon.vue'
import DsButton from './DsButton.vue'
import DsField from './DsField.vue'
import DsInput from './DsInput.vue'
import DsTextarea from './DsTextarea.vue'
import DsSelect from './DsSelect.vue'
import DsCheckbox from './DsCheckbox.vue'
import DsCheckboxGroup from './DsCheckboxGroup.vue'
import DsRadio from './DsRadio.vue'
import DsRadioGroup from './DsRadioGroup.vue'
import DsSwitch from './DsSwitch.vue'
import DsBadge from './DsBadge.vue'
import DsTag from './DsTag.vue'
import DsCard from './DsCard.vue'
import DsAvatar from './DsAvatar.vue'
import DsProgress from './DsProgress.vue'
import DsSkeleton from './DsSkeleton.vue'
import DsEmpty from './DsEmpty.vue'
import DsAlert from './DsAlert.vue'
import DsModal from './DsModal.vue'
import DsDrawer from './DsDrawer.vue'
import DsTooltip from './DsTooltip.vue'
import DsTabs from './DsTabs.vue'
import DsTable from './DsTable.vue'
import DsPagination from './DsPagination.vue'
import DsToastHost from './DsToastHost.vue'
import toast from './toast'

export const components = {
  DsIcon,
  DsButton,
  DsField,
  DsInput,
  DsTextarea,
  DsSelect,
  DsCheckbox,
  DsCheckboxGroup,
  DsRadio,
  DsRadioGroup,
  DsSwitch,
  DsBadge,
  DsTag,
  DsCard,
  DsAvatar,
  DsProgress,
  DsSkeleton,
  DsEmpty,
  DsAlert,
  DsModal,
  DsDrawer,
  DsTooltip,
  DsTabs,
  DsTable,
  DsPagination,
  DsToastHost,
}

export {
  DsIcon,
  DsButton,
  DsField,
  DsInput,
  DsTextarea,
  DsSelect,
  DsCheckbox,
  DsCheckboxGroup,
  DsRadio,
  DsRadioGroup,
  DsSwitch,
  DsBadge,
  DsTag,
  DsCard,
  DsAvatar,
  DsProgress,
  DsSkeleton,
  DsEmpty,
  DsAlert,
  DsModal,
  DsDrawer,
  DsTooltip,
  DsTabs,
  DsTable,
  DsPagination,
  DsToastHost,
  toast,
}

export const AuroraDS = {
  install(Vue, options = {}) {
    const prefix = options.prefix || ''
    Object.keys(components).forEach((name) => {
      Vue.component(prefix + name, components[name])
    })
    Vue.prototype.$toast = toast
    if (!Vue.prototype.$dsInstalled) {
      Vue.prototype.$dsInstalled = true
    }
  },
}

export default AuroraDS
