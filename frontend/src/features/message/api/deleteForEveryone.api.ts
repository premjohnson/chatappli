import api from "../../../lib/axios"

export const deleteForEveryoneApi = async (
    messageId: string
) => {

    const res = await api.delete(
        `/messages/${messageId}/everyone`
    )

    return res.data.data
}