import api from "../../../lib/axios"

export const getInviteInfoApi = async (code: string) => {
  const res = await api.get(`/conversations/invite/${code}`)
  return res.data.data
}
