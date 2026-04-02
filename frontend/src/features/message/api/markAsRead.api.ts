import api from "../../../lib/axios"

export const markAsReadApi = async (
    conversationId: string
) => {

    const res = await api.patch(
        `/messages/${conversationId}/read`
    )

    return res.data.data
}