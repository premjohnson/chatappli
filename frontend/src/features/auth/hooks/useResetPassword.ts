import { useMutation } from "@tanstack/react-query"
import { resetPasswordApi } from "../api/resetPassword.api"

export const useResetPassword = () => {

  return useMutation({

    mutationFn: ({
      email,
      otp,
      newPassword
    }: {
      email: string
      otp: string
      newPassword: string
    }) => resetPasswordApi(email, otp, newPassword)

  })
}