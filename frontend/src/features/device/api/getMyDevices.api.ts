import api from "../../../lib/axios"

export const getMyDevicesApi = async () => {

    const res = await api.get("/devices")

    return res.data.data
}