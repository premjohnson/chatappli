import api from "../../../lib/axios"

export const resetPasswordApi = async (
  email: string,
  otp: string,
  newPassword: string
) => {

  const { data } = await api.post(
    "/auth/reset-password",
    {
      email,
      otp,
      newPassword
    }
  )

  return data
}