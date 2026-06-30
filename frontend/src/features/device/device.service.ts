import api from "../../lib/axios"
import type { Device } from "./types/device.types"

export const getUserDevices = async (userId: string): Promise<Device[]> => {
  const res = await api.get(`/devices/user/${userId}`)
  return res.data.data
}
