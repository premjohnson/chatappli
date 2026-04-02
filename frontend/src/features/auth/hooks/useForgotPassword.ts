import { useMutation } from "@tanstack/react-query"
import { forgotPasswordApi } from "../api/forgotPassword.api"

export const useForgotPassword = () => {

  return useMutation({
    mutationFn: forgotPasswordApi
  })
}