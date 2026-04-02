import api from "../../../lib/axios"

export const deleteForMeApi = async (messageId: string) => {

    const res = await api.delete(`/messages/${messageId}/me`)

    return res.data.data
}