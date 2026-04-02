import api from "../../../lib/axios"

export const forgotPasswordApi = async (email: string) => {

  const { data } = await api.post(
    "/auth/forgot-password",
    { email }
  )

  return data
}