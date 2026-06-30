import api from "../../../lib/axios"
import type { EncryptedPayload } from "../types/message.types"

export const sendMessageApi = async (payload: {
    conversationId: string
    encryptedContent?: string
    nonce?: string
    encryptedPayloads?: EncryptedPayload[]
    clientMessageId: string
    type?: string
    senderDeviceId?: string
    signature?: string
}) => {

    const res = await api.post("/messages", payload)

    return res.data.data
}
