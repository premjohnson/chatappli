import api from "../../../lib/axios"

export const updateGroupInfoApi = async (
  conversationId: string,
  data: {
    groupName?: string
    groupAbout?: string
    avatar?: File
    removeAvatar?: boolean
  }
) => {

  const formData = new FormData()

  if (data.groupName !== undefined) formData.append("groupName", data.groupName)
  if (data.groupAbout !== undefined) formData.append("groupAbout", data.groupAbout)
  if (data.avatar) formData.append("avatar", data.avatar)
  if (data.removeAvatar !== undefined) formData.append("removeAvatar", String(data.removeAvatar))

  const res = await api.patch(
    `/conversations/${conversationId}`,
    formData
  )

  return res.data.data
}