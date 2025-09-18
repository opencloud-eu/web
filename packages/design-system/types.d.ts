import OcApplicationIcon from './src/components/OcApplicationIcon/OcApplicationIcon.vue'
import OcAvatar from './src/components/OcAvatar/OcAvatar.vue'
import OcAvatarCount from './src/components/OcAvatarCount/OcAvatarCount.vue'
import OcAvatarFederated from './src/components/OcAvatarFederated/OcAvatarFederated.vue'
import OcAvatarGroup from './src/components/OcAvatarGroup/OcAvatarGroup.vue'
import OcAvatarGuest from './src/components/OcAvatarGuest/OcAvatarGuest.vue'
import OcAvatarItem from './src/components/OcAvatarItem/OcAvatarItem.vue'
import OcAvatarLink from './src/components/OcAvatarLink/OcAvatarLink.vue'
import OcAvatars from './src/components/OcAvatars/OcAvatars.vue'
import OcBreadcrumb from './src/components/OcBreadcrumb/OcBreadcrumb.vue'
import OcBottomDrawer from './src/components/OcBottomDrawer/OcBottomDrawer.vue'
import OcButton from './src/components/OcButton/OcButton.vue'
import OcCard from './src/components/OcCard/OcCard.vue'
import OcCheckbox from './src/components/OcCheckbox/OcCheckbox.vue'
import OcContextualHelper from './src/components/OcContextualHelper/OcContextualHelper.vue'
import OcColorInput from './src/components/OcColorInput/OcColorInput.vue'
import OcDatepicker from './src/components/OcDatepicker/OcDatepicker.vue'
import OcDefinitionList from './src/components/OcDefinitionList/OcDefinitionList.vue'
import OcDrop from './src/components/OcDrop/OcDrop.vue'
import OcDropzone from './src/components/OcDropzone/OcDropzone.vue'
import OcFileInput from './src/components/OcFileInput/OcFileInput.vue'
import OcFilterChip from './src/components/OcFilterChip/OcFilterChip.vue'
import OcHiddenAnnouncer from './src/components/OcHiddenAnnouncer/OcHiddenAnnouncer.vue'
import OcIcon from './src/components/OcIcon/OcIcon.vue'
import OcImage from './src/components/OcImage/OcImage.vue'
import OcInfoDrop from './src/components/OcInfoDrop/OcInfoDrop.vue'
import OcList from './src/components/OcList/OcList.vue'
import OcLoader from './src/components/OcLoader/OcLoader.vue'
import OcModal from './src/components/OcModal/OcModal.vue'
import OcNotificationMessage from './src/components/OcNotificationMessage/OcNotificationMessage.vue'
import OcNotifications from './src/components/OcNotifications/OcNotifications.vue'
import OcPageSize from './src/components/OcPageSize/OcPageSize.vue'
import OcPagination from './src/components/OcPagination/OcPagination.vue'
import OcProgress from './src/components/OcProgress/OcProgress.vue'
import OcProgressPie from './src/components/OcProgressPie/OcProgressPie.vue'
import OcRadio from './src/components/OcRadio/OcRadio.vue'
import OcRecipient from './src/components/OcRecipient/OcRecipient.vue'
import OcSearchBar from './src/components/OcSearchBar/OcSearchBar.vue'
import OcSelect from './src/components/OcSelect/OcSelect.vue'
import OcSpinner from './src/components/OcSpinner/OcSpinner.vue'
import OcStatusIndicators from './src/components/OcStatusIndicators/OcStatusIndicators.vue'
import OcSwitch from './src/components/OcSwitch/OcSwitch.vue'
import OcTable from './src/components/OcTable/OcTable.vue'
import OcTableBody from './src/components/OcTableBody/OcTableBody.vue'
import OcTableFoot from './src/components/OcTableFoot/OcTableFoot.vue'
import OcTableHead from './src/components/OcTableHead/OcTableHead.vue'
import OcTableSimple from './src/components/OcTableSimple/OcTableSimple.vue'
import OcTableTd from './src/components/OcTableTd/OcTableTd.vue'
import OcTableTh from './src/components/OcTableTh/OcTableTh.vue'
import OcTableTr from './src/components/OcTableTr/OcTableTr.vue'
import OcTag from './src/components/OcTag/OcTag.vue'
import OcTextarea from './src/components/OcTextarea/OcTextarea.vue'
import OcTextInput from './src/components/OcTextInput/OcTextInput.vue'
import OcErrorLog from './src/components/OcErrorLog/OcErrorLog.vue'
import OcEmojiPicker from './src/components/OcEmojiPicker/OcEmojiPicker.vue'

declare module 'vue' {
  interface GlobalComponents {
    OcApplicationIcon: typeof OcApplicationIcon
    OcAvatar: typeof OcAvatar
    OcAvatarCount: typeof OcAvatarCount
    OcAvatarFederated: typeof OcAvatarFederated
    OcAvatarGroup: typeof OcAvatarGroup
    OcAvatarGuest: typeof OcAvatarGuest
    OcAvatarItem: typeof OcAvatarItem
    OcAvatarLink: typeof OcAvatarLink
    OcAvatars: typeof OcAvatars
    OcBreadcrumb: typeof OcBreadcrumb
    OcBottomDrawer: typeof OcBottomDrawer
    OcButton: typeof OcButton
    OcCard: typeof OcCard
    OcCheckbox: typeof OcCheckbox
    OcColorInput: typeof OcColorInput
    OcContextualHelper: typeof OcContextualHelper
    OcDatepicker: typeof OcDatepicker
    OcDefinitionList: typeof OcDefinitionList
    OcDrop: typeof OcDrop
    OcDropzone: typeof OcDropzone
    OcFileInput: typeof OcFileInput
    OcFilterChip: typeof OcFilterChip
    OcHiddenAnnouncer: typeof OcHiddenAnnouncer
    OcIcon: typeof OcIcon
    OcImage: typeof OcImage
    OcInfoDrop: typeof OcInfoDrop
    OcList: typeof OcList
    OcLoader: typeof OcLoader
    OcModal: typeof OcModal
    OcNotificationMessage: typeof OcNotificationMessage
    OcNotifications: typeof OcNotifications
    OcPageSize: typeof OcPageSize
    OcPagination: typeof OcPagination
    OcProgress: typeof OcProgress
    OcProgressPie: typeof OcProgressPie
    OcRadio: typeof OcRadio
    OcRecipient: typeof OcRecipient
    OcSearchBar: typeof OcSearchBar
    OcSelect: typeof OcSelect
    OcSpinner: typeof OcSpinner
    OcStatusIndicators: typeof OcStatusIndicators
    OcSwitch: typeof OcSwitch
    OcTable: typeof OcTable
    OcTableBody: typeof OcTableBody
    OcTableFoot: typeof OcTableFoot
    OcTableHead: typeof OcTableHead
    OcTableSimple: typeof OcTableSimple
    OcTableTd: typeof OcTableTd
    OcTableTh: typeof OcTableTh
    OcTableTr: typeof OcTableTr
    OcTag: typeof OcTag
    OcTextarea: typeof OcTextarea
    OcTextInput: typeof OcTextInput
    OcErrorLog: typeof OcErrorLog
    OcEmojiPicker: typeof OcEmojiPicker
  }
}
