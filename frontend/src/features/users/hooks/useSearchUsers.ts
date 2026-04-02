import { useQuery } from "@tanstack/react-query"
import { useDebounce } from "../../../hooks/useDebounce"
import { searchUsersApi } from "../api/searchUsers.api"
import type { User } from "../types/user.types"

/**
 * Hook to search for users with debouncing
 * Only queries when search string length > 1
 * Debounces requests by 500ms
 */
export const useSearchUsers = (searchQuery: string) => {
  // Debounce the search query (500ms delay)
  const debouncedQuery = useDebounce(searchQuery, 500)

  return useQuery<User[]>({
    queryKey: ["searchUsers", debouncedQuery],
    queryFn: () => searchUsersApi(debouncedQuery),
    enabled: debouncedQuery.length > 1,
    staleTime: 30 * 1000, // 30 seconds
    retry: 1
  })
}
