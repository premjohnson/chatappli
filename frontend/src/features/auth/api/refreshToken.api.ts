import api from "../../../lib/axios"
import type { RefreshResponse } from "../types/auth.types"

export const refreshTokenApi = async (): Promise<RefreshResponse> => {

  const { data } = await api.post<RefreshResponse>(
    "/auth/refresh"
  )

  return data
}