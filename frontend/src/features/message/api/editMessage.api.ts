import api from "../../../lib/axios"

export const editMessageApi = async (
    messageId: string,
    encryptedContent: string,
    nonce: string
) => {

    const res = await api.patch(`/messages/${messageId}`, {
        encryptedContent,
        nonce
    })

    return res.data.data
}