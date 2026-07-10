import api from "../../../lib/axios"

export const joinViaInviteApi = async (code: string) => {
  const res = await api.post(`/conversations/invite/${code}/join`)
  return res.data.data
}
