import api from "../../../lib/axios"

export const logoutApi = async () => {
  const { data } = await api.post("/auth/logout")
  return data
}