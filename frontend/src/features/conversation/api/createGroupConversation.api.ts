import api from "../../../lib/axios"

export const createGroupConversationApi = async (data: {
  groupName: string
  groupAbout?: string
  members: string[]
  avatar?: File
}) => {

  const formData = new FormData()

  formData.append("groupName", data.groupName)

  if (data.groupAbout) {
    formData.append("groupAbout", data.groupAbout)
  }

  data.members.forEach((id) =>
    formData.append("members", id)
  )

  if (data.avatar) {
    formData.append("avatar", data.avatar)
  }

  const res = await api.post("/conversations/group", formData)

  return res.data.data
}