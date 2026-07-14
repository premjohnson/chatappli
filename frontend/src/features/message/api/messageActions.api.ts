import api from "../../../lib/axios"

export const reactToMessageApi = async (messageId: string, emoji: string) => {
  const res = await api.post(`/messages/${messageId}/react`, { emoji })
  return res.data.data
}

export const togglePinApi = async (messageId: string) => {
  const res = await api.post(`/messages/${messageId}/pin`)
  return res.data.data
}

export const toggleStarApi = async (messageId: string) => {
  const res = await api.post(`/messages/${messageId}/star`)
  return res.data.data
}
