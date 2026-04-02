import { useQuery } from "@tanstack/react-query"
import { useAuthStore } from "../../../store/auth.store"
import type { User } from "../types/user.types"

/**
 * Mock data for available users
 * TODO: Replace with actual API call when backend supports getting users list
 */
const MOCK_USERS: User[] = [
  {
    _id: "user_001",
    username: "alice_johnson",
    email: "alice@example.com",
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=alice"
  },
  {
    _id: "user_002",
    username: "bob_smith",
    email: "bob@example.com",
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=bob"
  },
  {
    _id: "user_003",
    username: "carol_white",
    email: "carol@example.com",
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=carol"
  },
  {
    _id: "user_004",
    username: "david_brown",
    email: "david@example.com",
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=david"
  },
  {
    _id: "user_005",
    username: "eve_davis",
    email: "eve@example.com",
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=eve"
  }
]

/**
 * Hook to get available users for starting a new conversation
 * Filters out the current user from the list
 */
export const useAvailableUsers = () => {
  const currentUser = useAuthStore((s) => s.user)

  return useQuery<User[]>({
    queryKey: ["availableUsers"],
    queryFn: async () => {
      // Simulate API delay
      await new Promise((resolve) => setTimeout(resolve, 300))
      
      // Filter out current user
      return MOCK_USERS.filter((user) => user._id !== currentUser?.id)
    },
    enabled: !!currentUser?.id
  })
}
