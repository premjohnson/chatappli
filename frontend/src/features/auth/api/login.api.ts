import api from "../../../lib/axios"

import type {
  LoginRequest,
  LoginResponse
} from "../types/auth.types.tsx"

export const loginApi = async (
  payload: LoginRequest
): Promise<LoginResponse> => {

  const { data } = await api.post<LoginResponse>(
    "/auth/login",
    payload
  )

  return data
}