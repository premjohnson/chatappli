import { useMutation } from "@tanstack/react-query"
import { useNavigate } from "react-router-dom"
import { loginApi } from "../api/login.api"
import { registerDeviceApi } from "../../device/api/registerDevice.api"
import { setAccessToken } from "../../../services/storage/token.storage"
import { useAuthStore } from "../../../store/auth.store"
import { generateKeyPair } from "../../../utils/crypto"

export const useLogin = () => {

  const setAuth = useAuthStore((s) => s.setAuth)
  const setDeviceKeys = useAuthStore((s) => s.setDeviceKeys)

  const navigate = useNavigate()

  return useMutation({

    mutationFn: loginApi,

    onSuccess: async (data) => {

      const { user, accessToken } = data.data

      setAccessToken(accessToken)
      setAuth(user, accessToken)

      // Check if device keys already exist for this user in localStorage
      const storedKeysRaw = localStorage.getItem(`device-keys-${user.id}`)
      if (storedKeysRaw) {
        try {
          const storedKeys = JSON.parse(storedKeysRaw)
          setDeviceKeys(
            storedKeys.deviceId,
            storedKeys.publicKey,
            storedKeys.secretKey
          )
          navigate("/chat")
          return
        } catch (e) {
          console.error("Failed to load persisted device keys:", e)
        }
      }

      // 1. Generate identity keys locally
      const deviceId = `device-${Date.now()}`
      const identityKeys = generateKeyPair()
      const preKeys = generateKeyPair() // using simple pair for signedPreKey equivalent

      try {
        // 2. Register device publicly with the backend
        await registerDeviceApi({
          deviceId,
          publicKey: identityKeys.publicKey,
          identityKey: identityKeys.publicKey,
          signedPreKey: preKeys.publicKey
        })

        // 3. Keep private keys strictly in local zustand persist layer
        setDeviceKeys(
          deviceId,
          identityKeys.publicKey,
          identityKeys.secretKey
        )

        // 4. Also persist in user-specific localStorage to survive logout
        localStorage.setItem(`device-keys-${user.id}`, JSON.stringify({
          deviceId,
          publicKey: identityKeys.publicKey,
          secretKey: identityKeys.secretKey
        }))

      } catch (e) {
        console.error("Failed to register crypto device:", e)
      }

      navigate("/chat")
    }
  })
}