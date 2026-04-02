import api from "../../../lib/axios"

export const sendMessageApi = async (payload: {
    conversationId: string
    encryptedContent: string
    nonce: string
    clientMessageId: string
    type?: string
}) => {

    const res = await api.post("/messages", payload)

    return res.data.data
}