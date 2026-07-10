import api from "../../../lib/axios"

export interface GroupSettingsPayload {
  onlyAdminsCanSend?: boolean
  onlyAdminsCanAddMembers?: boolean
  onlyAdminsCanRemoveMembers?: boolean
  onlyAdminsCanEditInfo?: boolean
  onlyAdminsCanPinMessages?: boolean
  slowModeDelay?: number
  disappearingDuration?: number
  memberApprovalsEnabled?: boolean
}

export const updateGroupSettingsApi = async (
  conversationId: string,
  settings: GroupSettingsPayload
) => {
  const res = await api.patch(
    `/conversations/${conversationId}/settings`,
    settings
  )
  return res.data.data
}
