import api from "../../../lib/axios"
import type { SignupRequest } from "../types/auth.types"

export const signupApi = async (payload: SignupRequest) => {

  const formData = new FormData()

  formData.append("email", payload.email)
  formData.append("username", payload.username)
  formData.append("password", payload.password)

  if (payload.avatar) {
    formData.append("avatar", payload.avatar)
  }

  const { data } = await api.post("/auth/register", formData, {
    headers: {
      "Content-Type": "multipart/form-data"
    }
  })

  return data
}