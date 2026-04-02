import api from "../../../lib/axios"
import type { User } from "../types/user.types"

export interface SearchUsersResponse {
  status: string
  results: number
  data: User[]
}

export const searchUsersApi = async (query: string): Promise<User[]> => {
  if (!query || query.length < 2) {
    return []
  }

  const res = await api.get<SearchUsersResponse>("/search/users", {
    params: {
      q: query
    }
  })

  return res.data.data
}
