import api from "../../lib/axios"
import type { Device, DeviceInfo } from "./types/device.types"

export const getUserDevices = async (userId: string): Promise<Device[]> => {
  const res = await api.get(`/devices/user/${userId}`)
  return res.data.data
}

export const getUsersDevices = async (userIds: string[]): Promise<DeviceInfo[]> => {
  if (!userIds.length) return []
  const res = await api.post("/devices/users", { userIds })
  return res.data.data
}
