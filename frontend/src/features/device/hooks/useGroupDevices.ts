import { useQuery } from "@tanstack/react-query"
import { getUsersDevices } from "../device.service"
import type { DeviceInfo } from "../types/device.types"

export const useGroupDevices = (userIds: string[]) => {
  // Sort and join user IDs to form a stable string cache key
  const cacheKey = [...userIds].sort().join(",")

  return useQuery<DeviceInfo[], Error>({
    queryKey: ["group-devices", cacheKey],
    queryFn: () => getUsersDevices(userIds),
    enabled: userIds.length > 0,
    staleTime: 5 * 60 * 1000, // 5 minutes cache validity
  })
}
