import api from "../../../lib/axios"

export const editMessageApi = async (
    messageId: string,
    encryptedContent: string,
    nonce: string,
    encryptedPayloads?: any
) => {

    const res = await api.patch(`/messages/${messageId}`, {
        encryptedContent,
        nonce,
        encryptedPayloads
    })

    return res.data.data
}