import api from "../../../lib/axios"

export interface MutePayload {
  muteType: "8_hours" | "1_day" | "1_week" | "always" | "unmute"
  durationSeconds?: number
}

export const muteConversationApi = async (
  conversationId: string,
  payload: MutePayload
) => {
  const res = await api.post(
    `/conversations/${conversationId}/mute`,
    payload
  )
  return res.data.data
}
