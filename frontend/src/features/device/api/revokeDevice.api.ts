import api from "../../../lib/axios"

export const revokeDeviceApi = async (deviceId: string) => {

    const res = await api.delete(`/devices/${deviceId}`)

    return res.data.data
}