import { create } from "zustand"
import { persist } from "zustand/middleware"
import type { User } from "../features/auth/types/auth.types"

interface AuthState {
  user: User | null
  accessToken: string | null
  deviceId: string | null
  identityPublicKey: string | null
  identityPrivateKey: string | null

  // Actions
  setAuth: (user: User, token: string) => void
  setDeviceKeys: (deviceId: string, pubKey: string, privKey: string) => void

  /**
   * Update access token when refreshed
   * Called by axios interceptor after successful token refresh
   * 
   * This action is separate from setAuth because:
   * 1. setAuth sets entire auth state (user + token)
   * 2. updateToken only updates the token (used during refresh)
   * 3. Keep concerns separated and transaction atomic
   */
  updateToken: (token: string) => void

  logout: () => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      accessToken: null,
      deviceId: null,
      identityPublicKey: null,
      identityPrivateKey: null,

      /**
       * Initial login: set user + token
       */
      setAuth: (user, token) => {
        console.log("[AuthStore] Setting auth:", user._id)
        set({
          user,
          accessToken: token,
        })
      },

      /**
       * Device key setup
       */
      setDeviceKeys: (deviceId, pubKey, privKey) => {
        console.log("[AuthStore] Setting device keys")
        set({
          deviceId,
          identityPublicKey: pubKey,
          identityPrivateKey: privKey,
        })
      },

      /**
       * Token refresh: update only the token
       * 
       * This is called by axios interceptor when token is refreshed.
       * User remains same, only token updates.
       */
      updateToken: (token: string) => {
        console.log("[AuthStore] Updating access token")
        set({
          accessToken: token,
        })
      },

      /**
       * Logout: clear all auth state
       * Socket disconnection should happen before this is called
       */
      logout: () => {
        console.log("[AuthStore] Logging out")
        set({
          user: null,
          accessToken: null,
          deviceId: null,
          identityPublicKey: null,
          identityPrivateKey: null,
        })
      },
    }),
    {
      name: "auth-storage",
    }
  )
)