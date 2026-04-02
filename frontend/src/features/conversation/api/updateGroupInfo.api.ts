import api from "../../../lib/axios"

export const updateGroupInfoApi = async (
  conversationId: string,
  data: {
    name?: string
    avatar?: File
  }
) => {

  const formData = new FormData()

  if (data.name) formData.append("name", data.name)

  if (data.avatar) formData.append("avatar", data.avatar)

  const res = await api.patch(
    `/conversations/${conversationId}`,
    formData
  )

  return res.data.data
}