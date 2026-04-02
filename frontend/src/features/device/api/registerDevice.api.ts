import api from "../../../lib/axios"

export const registerDeviceApi = async (payload: {
    deviceId: string
    publicKey: string
    identityKey: string
    signedPreKey: string
}) => {

    const res = await api.post("/devices", payload)

    return res.data.data
}