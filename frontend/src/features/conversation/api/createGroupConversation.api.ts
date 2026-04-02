import api from "../../../lib/axios"

export const createGroupConversationApi = async (data: {
  name: string
  participants: string[]
  avatar?: File
}) => {

  const formData = new FormData()

  formData.append("name", data.name)

  data.participants.forEach((id) =>
    formData.append("participants", id)
  )

  if (data.avatar) {
    formData.append("avatar", data.avatar)
  }

  const res = await api.post("/conversations/group", formData)

  return res.data.data
}